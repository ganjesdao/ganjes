import hre from "hardhat";
import { config } from "dotenv";
import fs from "fs";
import { updateEnvFile } from "./updateEnv.js";

const { ethers } = hre;
config();

async function main() {
  console.log("🚀 Starting GanjesDAOOptimized deployment to BSC Testnet...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying contracts with the account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "BNB");

  // Get token address from environment - REQUIRED
  const tokenAddress = process.env.TOKEN_ADDRESS;
  
  if (!tokenAddress) {
    console.error("❌ ERROR: TOKEN_ADDRESS environment variable is required!");
    console.error("💡 Please set TOKEN_ADDRESS to an existing ERC20 token address");
    console.error("💡 Example: TOKEN_ADDRESS=0x1234567890abcdef1234567890abcdef12345678");
    process.exit(1);
  }
  
  console.log("📄 Using governance token at:", tokenAddress);

  // Deploy GanjesDAOOptimized
  console.log("\n🏛️ Deploying GanjesDAOOptimized...");
  const GanjesDAO = await ethers.getContractFactory("GanjesDAOOptimized");
  
  console.log("📝 Constructor parameters:");
  console.log("   Governance Token:", tokenAddress);
  
  const dao = await GanjesDAO.deploy(tokenAddress);
  await dao.waitForDeployment();
  
  const daoAddress = await dao.getAddress();
  console.log("✅ GanjesDAOOptimized deployed to:", daoAddress);
  
  // Get DAO configuration
  const admin = await dao.admin();
  const minInvestment = await dao.minInvestmentAmount();
  const votingDuration = await dao.votingDuration();
  const minTokensForProposal = await dao.MIN_TOKENS_FOR_PROPOSAL();
  const creationFee = await dao.PROPOSAL_CREATION_FEE(); 
  const totalTokensRequired = await dao.TOTAL_TOKENS_REQUIRED();
  const maxProposalsPerUser = await dao.maxProposalsPerUser();
  const minQuorumPercent = await dao.MIN_QUORUM_PERCENT();
  
  console.log("\n⚙️ Optimized DAO Configuration:");
  console.log("   Admin:", admin);
  console.log("   Min Investment:", ethers.formatEther(minInvestment), "tokens");
  console.log("   Voting Duration:", votingDuration.toString(), "seconds");
  console.log("   Min Tokens for Proposal:", ethers.formatEther(minTokensForProposal), "tokens");
  console.log("   Proposal Creation Fee:", ethers.formatEther(creationFee), "tokens (non-refundable)");
  console.log("   TOTAL Tokens Required:", ethers.formatEther(totalTokensRequired), "tokens");
  console.log("   Max Proposals Per User:", maxProposalsPerUser.toString());
  console.log("   Min Quorum Percent:", minQuorumPercent.toString(), "%");
  
  console.log("\n🔗 BSC Testnet Explorer:");
  console.log(`   Governance Token: https://testnet.bscscan.com/address/${tokenAddress}`);
  console.log(`   DAO Contract: https://testnet.bscscan.com/address/${daoAddress}`);
  
  console.log("\n📝 Environment Variables:");
  console.log(`   TOKEN_ADDRESS=${tokenAddress} (external token)`);
  console.log(`   DAO_ADDRESS=${daoAddress}`);
  
  // Update .env file with DAO address
  updateEnvFile('DAO_ADDRESS', daoAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: "bsc-testnet",
    contracts: {
      governanceToken: {
        address: tokenAddress,
        name: "External ERC20 Token (provided)"
      },
      dao: {
        address: daoAddress,
        name: "GanjesDAOOptimized",
        admin: admin,
        config: {
          minInvestment: minInvestment.toString(),
          votingDuration: votingDuration.toString(),
          minTokensForProposal: minTokensForProposal.toString(),
          minQuorumPercent: minQuorumPercent.toString()
        }
      }
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    transactionHashes: {
      dao: dao.deploymentTransaction().hash
    }
  };
  
  fs.writeFileSync('deployment-dao.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to deployment-dao.json");
  
  console.log("\n✨ Deployment completed successfully!");
  console.log("🔔 Next steps:");
  console.log("   1. Verify contracts on BSCScan");
  console.log("   2. Update frontend with new addresses");
  console.log("   3. Test DAO functionality");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });