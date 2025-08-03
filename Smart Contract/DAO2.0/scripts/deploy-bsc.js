const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying GanjesDAO to BSC Testnet...");
  console.log("========================================");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB");
  
  // Minimum balance check (0.1 BNB)
  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  WARNING: Low BNB balance. Make sure you have enough BNB for gas fees.");
    console.log("   Get testnet BNB from: https://testnet.binance.org/faucet-smart");
  }

  // Get admin addresses from environment
  const adminAddresses = [
    process.env.ADMIN_1,
    process.env.ADMIN_2,
    process.env.ADMIN_3
  ].filter(addr => addr && addr !== ""); // Filter out empty addresses

  if (adminAddresses.length < 3) {
    throw new Error("❌ Need at least 3 admin addresses in .env file");
  }

  const requiredSignatures = parseInt(process.env.REQUIRED_SIGNATURES) || 2;
  
  console.log("\n📋 Deployment Configuration:");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("RPC URL:", process.env.RPC_URL);
  console.log("Admin Addresses:", adminAddresses);
  console.log("Required Signatures:", requiredSignatures);

  let tokenAddress;
  
  // Check if we should use existing token or deploy new one
  if (process.env.TOKEN_ADDRESS && process.env.TOKEN_ADDRESS !== "") {
    tokenAddress = process.env.TOKEN_ADDRESS;
    console.log("\n📄 Using existing token at:", tokenAddress);
    
    // Verify token exists
    try {
      const tokenCode = await ethers.provider.getCode(tokenAddress);
      if (tokenCode === "0x") {
        throw new Error("No contract found at token address");
      }
      console.log("✅ Token contract verified");
    } catch (error) {
      console.log("❌ Error verifying token contract:", error.message);
      throw error;
    }
  } else {
    // Deploy new token
    console.log("\n🪙 Deploying new MockERC20 token...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy(
      "Ganjes Token", 
      "GNJ", 
      ethers.parseEther("1000000") // 1M tokens
    );
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();
    console.log("✅ MockERC20 deployed to:", tokenAddress);
  }

  // Deploy GanjesDAO
  console.log("\n🏛️  Deploying GanjesDAO...");
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
    console.log("   - Active Investors:", daoStatus.activeInvestorsCount.toString());
    
    console.log("✅ Governance Parameters:");
    console.log("   - Min Investment Amount:", ethers.formatEther(govParams._minInvestmentAmount));
    console.log("   - Min Tokens for Proposal:", ethers.formatEther(govParams._minTokensForProposal));
    console.log("   - Min Voting Tokens:", ethers.formatEther(govParams._minVotingTokens));
    console.log("   - Min Quorum Percent:", govParams._minQuorumPercent.toString() + "%");
    console.log("   - Voting Duration (blocks):", govParams._votingDuration.toString());

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
  console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("========================");
  console.log("🌐 Network:", hre.network.name);
  console.log("🪙 Token Address:", tokenAddress);
  console.log("🏛️  DAO Address:", daoAddress);
  console.log("👥 Multi-sig Owners:", adminAddresses.length);
  console.log("✅ Required Signatures:", requiredSignatures);
  console.log("⛽ Gas Used: Check transaction details");
  
  console.log("\n🔗 Useful Links:");
  console.log("📊 BSC Testnet Explorer:", `https://testnet.bscscan.com/address/${daoAddress}`);
  console.log("🪙 Token Explorer:", `https://testnet.bscscan.com/address/${tokenAddress}`);
  console.log("💰 Testnet Faucet:", "https://testnet.binance.org/faucet-smart");

  console.log("\n📝 Next Steps:");
  console.log("1. Verify contracts on BSCScan");
  console.log("2. Update frontend with new contract addresses");
  console.log("3. Test proposal creation and voting");
  console.log("4. Set up monitoring and alerts");

  return {
    tokenAddress,
    daoAddress,
    network: hre.network.name,
    deployer: deployer.address,
    adminAddresses,
    requiredSignatures
  };
}

// Handle errors gracefully
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n✅ Deployment completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;