const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🏛️  Deploying GanjesDAO to BSC Testnet...");
  console.log("=========================================");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB");
  
  // Get configuration from environment
  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress || tokenAddress === "") {
    throw new Error("❌ TOKEN_ADDRESS not found in .env file");
  }

  const adminAddresses = [
    process.env.ADMIN_1,
    process.env.ADMIN_2,
    process.env.ADMIN_3
  ].filter(addr => addr && addr !== "");

  if (adminAddresses.length < 3) {
    throw new Error("❌ Need at least 3 admin addresses in .env file");
  }

  const requiredSignatures = parseInt(process.env.REQUIRED_SIGNATURES) || 2;
  
  console.log("\n📋 Configuration:");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("Token Address:", tokenAddress);
  console.log("Admin Addresses:", adminAddresses);
  console.log("Required Signatures:", requiredSignatures);

  // Deploy GanjesDAO
  console.log("\n🏛️  Deploying GanjesDAO contract...");
  const GanjesDAO = await ethers.getContractFactory("GanjesDAO");
  
  console.log("📤 Sending deployment transaction...");
  const ganjesDAO = await GanjesDAO.deploy(
    tokenAddress,
    adminAddresses,
    requiredSignatures,
    {
      gasLimit: parseInt(process.env.GAS_LIMIT) || 8000000,
      gasPrice: parseInt(process.env.GAS_PRICE) || 10000000000
    }
  );

  console.log("⏳ Waiting for deployment confirmation...");
  await ganjesDAO.waitForDeployment();
  const daoAddress = await ganjesDAO.getAddress();
  
  console.log("✅ GanjesDAO deployed to:", daoAddress);

  // Wait for additional confirmations
  console.log("⏳ Waiting for additional confirmations...");
  await ganjesDAO.deploymentTransaction().wait(2);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  try {
    const daoStatus = await ganjesDAO.getContractStatus();
    const govParams = await ganjesDAO.getGovernanceParameters();
    
    console.log("✅ Contract Status:");
    console.log("   - Paused:", daoStatus.isPaused);
    console.log("   - Total Proposals:", daoStatus.totalProposals.toString());
    console.log("   - DAO Balance:", ethers.formatEther(daoStatus.daoBalance));
    
    console.log("✅ Governance Parameters:");
    console.log("   - Min Investment Amount:", ethers.formatEther(govParams._minInvestmentAmount));
    console.log("   - Min Tokens for Proposal:", ethers.formatEther(govParams._minTokensForProposal));
    console.log("   - Min Voting Tokens:", ethers.formatEther(govParams._minVotingTokens));
    console.log("   - Min Quorum Percent:", govParams._minQuorumPercent.toString() + "%");

    // Verify owners
    console.log("✅ Multi-sig Owners:");
    for (let i = 0; i < adminAddresses.length; i++) {
      const isOwner = await ganjesDAO.isOwner(adminAddresses[i]);
      console.log(`   - ${adminAddresses[i]}: ${isOwner ? "✅" : "❌"}`);
    }
    
    const requiredApprovals = await ganjesDAO.getRequiredApprovals();
    console.log("   - Required Approvals:", requiredApprovals.toString());

  } catch (error) {
    console.log("❌ Error verifying deployment:", error.message);
  }

  // Final deployment summary
  console.log("\n🎉 DAO DEPLOYMENT SUCCESSFUL!");
  console.log("=============================");
  console.log("🌐 Network:", hre.network.name);
  console.log("🪙 Token Address:", tokenAddress);
  console.log("🏛️  DAO Address:", daoAddress);
  console.log("👥 Multi-sig Owners:", adminAddresses.length);
  console.log("✅ Required Signatures:", requiredSignatures);
  
  console.log("\n🔗 BSC Testnet Explorer:");
  console.log(`https://testnet.bscscan.com/address/${daoAddress}`);

  console.log("\n📝 Save this info:");
  console.log(`DAO_ADDRESS=${daoAddress}`);

  return {
    tokenAddress,
    daoAddress,
    network: hre.network.name,
    deployer: deployer.address,
    adminAddresses,
    requiredSignatures
  };
}

if (require.main === module) {
  main()
    .then(() => {
      console.log("\n✅ Deployment completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;