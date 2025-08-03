const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GanjesDAO", function () {
  let ganjesDAO;
  let mockToken;
  let owner, addr1, addr2, addr3;
  let initialOwners;
  const requiredApprovals = 2;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    initialOwners = [owner.address, addr1.address, addr2.address];

    // Deploy mock token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    // Deploy DAO
    const GanjesDAO = await ethers.getContractFactory("GanjesDAO");
    ganjesDAO = await GanjesDAO.deploy(await mockToken.getAddress(), initialOwners, requiredApprovals);
    await ganjesDAO.waitForDeployment();

    // Setup initial balances
    await mockToken.transfer(addr1.address, ethers.parseEther("1000"));
    await mockToken.transfer(addr2.address, ethers.parseEther("1000"));
    await mockToken.transfer(addr3.address, ethers.parseEther("1000"));
    await mockToken.transfer(await ganjesDAO.getAddress(), ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the right governance token", async function () {
      expect(await ganjesDAO.governanceToken()).to.equal(await mockToken.getAddress());
    });

    it("Should set the right owners", async function () {
      expect(await ganjesDAO.isOwner(owner.address)).to.equal(true);
      expect(await ganjesDAO.isOwner(addr1.address)).to.equal(true);
      expect(await ganjesDAO.isOwner(addr2.address)).to.equal(true);
      expect(await ganjesDAO.isOwner(addr3.address)).to.equal(false);
    });

    it("Should set the right required approvals", async function () {
      expect(await ganjesDAO.getRequiredApprovals()).to.equal(requiredApprovals);
    });

    it("Should not be paused initially", async function () {
      const status = await ganjesDAO.getContractStatus();
      expect(status.isPaused).to.equal(false);
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow token holders to create proposals", async function () {
      // Approve tokens for proposal fee
      await mockToken.connect(addr1).approve(await ganjesDAO.getAddress(), ethers.parseEther("100"));
      
      await expect(
        ganjesDAO.connect(addr1).createProposal(
          "Test proposal",
          "Test Project",
          "https://test.com",
          ethers.parseEther("1000")
        )
      ).to.emit(ganjesDAO, "ProposalCreated");

      const proposal = await ganjesDAO.getProposalBasicDetails(1);
      expect(proposal.proposer).to.equal(addr1.address);
      expect(proposal.description).to.equal("Test proposal");
      expect(proposal.fundingGoal).to.equal(ethers.parseEther("1000"));
    });

    it("Should collect proposal fee", async function () {
      const initialBalance = await mockToken.balanceOf(addr1.address);
      const proposalFee = await ganjesDAO.getCurrentProposalFeeAmount();
      
      await mockToken.connect(addr1).approve(await ganjesDAO.getAddress(), proposalFee);
      await ganjesDAO.connect(addr1).createProposal(
        "Test proposal",
        "Test Project", 
        "https://test.com",
        ethers.parseEther("1000")
      );

      const finalBalance = await mockToken.balanceOf(addr1.address);
      expect(initialBalance - finalBalance).to.equal(proposalFee);
    });

    it("Should revert if insufficient tokens", async function () {
      await expect(
        ganjesDAO.connect(addr3).createProposal(
          "Test proposal",
          "Test Project",
          "https://test.com", 
          ethers.parseEther("1000")
        )
      ).to.be.revertedWith("Insufficient tokens to propose");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      // Create a proposal first
      await mockToken.connect(addr1).approve(await ganjesDAO.getAddress(), ethers.parseEther("100"));
      await ganjesDAO.connect(addr1).createProposal(
        "Test proposal",
        "Test Project",
        "https://test.com",
        ethers.parseEther("1000")
      );
    });

    it("Should allow voting on proposals", async function () {
      await mockToken.connect(addr2).approve(await ganjesDAO.getAddress(), ethers.parseEther("50"));
      
      await expect(
        ganjesDAO.connect(addr2).vote(1, true, ethers.parseEther("50"))
      ).to.emit(ganjesDAO, "Voted");

      const votingDetails = await ganjesDAO.getProposalVotingDetails(1);
      expect(votingDetails.votersFor).to.equal(1);
      expect(votingDetails.totalInvested).to.equal(ethers.parseEther("50"));
    });

    it("Should prevent proposer from voting", async function () {
      await mockToken.connect(addr1).approve(await ganjesDAO.getAddress(), ethers.parseEther("50"));
      
      await expect(
        ganjesDAO.connect(addr1).vote(1, true, ethers.parseEther("50"))
      ).to.be.revertedWith("Proposer cannot vote on own proposal");
    });

    it("Should prevent double voting", async function () {
      await mockToken.connect(addr2).approve(await ganjesDAO.getAddress(), ethers.parseEther("100"));
      
      await ganjesDAO.connect(addr2).vote(1, true, ethers.parseEther("50"));
      
      await expect(
        ganjesDAO.connect(addr2).vote(1, false, ethers.parseEther("50"))
      ).to.be.revertedWith("Already voted");
    });
  });

  describe("Multi-Sig Operations", function () {
    it("Should allow owners to create multi-sig proposals", async function () {
      await expect(
        ganjesDAO.connect(owner).createMultiSigProposal("pause", 0, ethers.constants.AddressZero)
      ).to.emit(ganjesDAO, "MultiSigProposalCreated");
    });

    it("Should execute multi-sig proposal with enough approvals", async function () {
      // Create pause proposal
      await ganjesDAO.connect(owner).createMultiSigProposal("pause", 0, ethers.constants.AddressZero);
      
      // Second approval should trigger execution
      await expect(
        ganjesDAO.connect(addr1).approveMultiSigProposal(1)
      ).to.emit(ganjesDAO, "Paused");

      const status = await ganjesDAO.getContractStatus();
      expect(status.isPaused).to.equal(true);
    });
  });

  describe("View Functions", function () {
    it("Should return correct DAO balance", async function () {
      const balance = await ganjesDAO.getDAOBalance();
      expect(balance).to.equal(ethers.parseEther("10000"));
    });

    it("Should return current block number", async function () {
      const currentBlock = await ganjesDAO.getCurrentBlock();
      const latestBlock = await ethers.provider.getBlockNumber();
      expect(currentBlock).to.equal(latestBlock);
    });

    it("Should return governance parameters", async function () {
      const params = await ganjesDAO.getGovernanceParameters();
      expect(params._minTokensForProposal).to.equal(ethers.parseEther("100"));
      expect(params._minVotingTokens).to.equal(ethers.parseEther("10"));
      expect(params._minQuorumPercent).to.equal(50);
    });
  });
});