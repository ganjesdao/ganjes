import hre from "hardhat";

async function main() {
  console.log("🗳️  Simple Vote Script");
  console.log("=====================");
  
  // Get signers
  const [deployer, voter] = await hre.ethers.getSigners();
  console.log("🏛️  Deployer:", deployer.address);
  console.log("👤 Voter:", voter.address);
  
  // Deploy fresh contracts for testing
  console.log("\n📄 Deploying SimpleToken...");
  const SimpleToken = await hre.ethers.getContractFactory("SimpleToken");
  const token = await SimpleToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ Token deployed at:", tokenAddress);
  
  console.log("\n🏛️  Deploying DAO...");
  const GanjesDAO = await hre.ethers.getContractFactory("GanjesDAOOptimized");
  const dao = await GanjesDAO.deploy(tokenAddress);
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log("✅ DAO deployed at:", daoAddress);
  
  // Get initial token balance
  const balance = await token.balanceOf(deployer.address);
  console.log(`\n💰 Deployer balance: ${hre.ethers.formatEther(balance)} tokens`);
  
  // Transfer tokens to voter
  console.log("📤 Transferring tokens to voter...");
  await token.transfer(voter.address, hre.ethers.parseEther("1000"));
  const voterBalance = await token.balanceOf(voter.address);
  console.log(`💰 Voter balance: ${hre.ethers.formatEther(voterBalance)} tokens`);
  
  // Approve tokens for proposal creation (100 tokens required)
  console.log("\n🔐 Approving tokens for proposal creation...");
  await token.approve(daoAddress, hre.ethers.parseEther("100"));
  console.log("✅ Tokens approved");
  
  // Create a proposal
  console.log("\n📝 Creating proposal...");
  const proposalTx = await dao.createProposal(
    "A test project for voting",
    "Test Project", 
    "https://example.com/project",
    hre.ethers.parseEther("500")
  );
  await proposalTx.wait();
  console.log("✅ Proposal created!");
  
  // Get proposal details
  const proposal = await dao.proposals(1);
  console.log("\n📋 Proposal Details:");
  console.log(`   ID: #1`);
  console.log(`   Project: ${proposal.projectName}`);
  console.log(`   Goal: ${hre.ethers.formatEther(proposal.fundingGoal)} tokens`);
  console.log(`   Proposer: ${proposal.proposer}`);
  
  // Connect as voter and approve tokens for voting
  const voterToken = token.connect(voter);
  const voterDao = dao.connect(voter);
  
  console.log("\n🔐 Approving tokens for voting...");
  await voterToken.approve(daoAddress, hre.ethers.parseEther("10"));
  console.log("✅ Tokens approved");
  
  // Vote on proposal
  console.log("\n🗳️  Voting FOR proposal #1 with 10 tokens...");
  const voteTx = await voterDao.vote(1, true, hre.ethers.parseEther("10"));
  const receipt = await voteTx.wait();
  
  console.log("✅ Vote submitted successfully!");
  console.log(`📅 Transaction Hash: ${receipt.hash}`);
  
  // Get updated proposal stats
  const updatedProposal = await dao.proposals(1);
  console.log("\n📊 Updated Proposal Stats:");
  console.log(`   Votes FOR: ${hre.ethers.formatEther(updatedProposal.totalVotesFor)} tokens`);
  console.log(`   Votes AGAINST: ${hre.ethers.formatEther(updatedProposal.totalVotesAgainst)} tokens`);
  console.log(`   Total Invested: ${hre.ethers.formatEther(updatedProposal.totalInvested)} tokens`);
  console.log(`   Voters FOR: ${updatedProposal.votersFor}`);
  console.log(`   Voters AGAINST: ${updatedProposal.votersAgainst}`);
  
  console.log("\n🎉 Vote completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });