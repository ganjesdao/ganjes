const { ethers } = require("hardhat");

async function main() {
  const [deployer, ...accounts] = await ethers.getSigners();

  // Deploy Token
  const Token = await ethers.getContractFactory("MockERC20");
  const token = await Token.deploy();
  await token.deployed();
  console.log(`MockERC20 deployed at: ${token.address}`);

  // Deploy DAO
  const DAO = await ethers.getContractFactory("GanjesDAO");
  const dao = await DAO.deploy(token.address);
  await dao.deployed();
  console.log(`GanjesDAO deployed at: ${dao.address}`);

  // Setup test profiles
  const startups = accounts.slice(0, 20);
  const investors = accounts.slice(20, 28);

  // Fund all users with tokens
  for (const acc of [...startups, ...investors]) {
    await token.mint(acc.address, ethers.utils.parseEther("1000")); // 1,000 tokens
  }

  // Startups deposit and create proposals
  let proposalIndex = 1;
  for (let i = 0; i < startups.length; i++) {
    const startup = startups[i];
    const daoWithStartup = dao.connect(startup);
    const tokenWithStartup = token.connect(startup);

    await tokenWithStartup.approve(dao.address, ethers.utils.parseEther("500"));
    await daoWithStartup.depositFunds(ethers.utils.parseEther("100"));

    const proposalCount = Math.floor(Math.random() * 2) + 1;

    for (let j = 0; j < proposalCount; j++) {
      await daoWithStartup.createProposal(
        `Startup #${i + 1} Proposal #${j + 1}`,
        ethers.utils.parseEther(`${100 + (j + 1) * 10}`)
      );
      proposalIndex++;
    }
  }

  const allProposalIds = await dao.getAllProposalIds();

  // Investors deposit and vote
  for (let i = 0; i < investors.length; i++) {
    const investor = investors[i];
    const daoWithInvestor = dao.connect(investor);
    const tokenWithInvestor = token.connect(investor);

    await tokenWithInvestor.approve(dao.address, ethers.utils.parseEther("500"));
    await daoWithInvestor.depositFunds(ethers.utils.parseEther("200"));

    // Vote on 5 random proposals
    const voted = new Set();
    for (let v = 0; v < 5; v++) {
      let randIndex;
      do {
        randIndex = Math.floor(Math.random() * allProposalIds.length);
      } while (voted.has(randIndex));
      voted.add(randIndex);

      const proposalId = allProposalIds[randIndex];
      const support = Math.random() < 0.7; // 70% chance to support
      try {
        await daoWithInvestor.vote(proposalId, support);
      } catch (err) {
        console.log(`Investor ${i + 1} failed to vote: ${err.message}`);
      }
    }
  }

  console.log("Startup and investor simulation complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
