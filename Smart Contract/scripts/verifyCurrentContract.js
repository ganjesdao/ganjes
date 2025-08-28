import hre from "hardhat";
import { config } from "dotenv";

const { run } = hre;
config();

async function main() {
  console.log("🔍 Starting contract verification on BSCScan...");
  console.log("=" .repeat(60));

  // Get addresses from environment
  const daoAddress = process.env.DAO_ADDRESS;
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const bscscanApiKey = process.env.BSCSCAN_API_KEY;

  if (!daoAddress) {
    console.error("❌ DAO_ADDRESS not found in .env file");
    process.exit(1);
  }

  if (!tokenAddress) {
    console.error("❌ TOKEN_ADDRESS not found in .env file");
    process.exit(1);
  }

  if (!bscscanApiKey) {
    console.error("❌ BSCSCAN_API_KEY not found in .env file");
    process.exit(1);
  }

  console.log("\n📋 Contract addresses from .env:");
  console.log("   DAO Contract:", daoAddress);
  console.log("   Token Contract:", tokenAddress);
  console.log("   Network:", hre.network.name);

  // Verify GanjesDAOOptimized contract
  console.log("\n🔍 Verifying GanjesDAOOptimized contract...");
  try {
    await run("verify:verify", {
      address: daoAddress,
      constructorArguments: [tokenAddress],
      contract: "contracts/GanjesDAOOptimized.sol:GanjesDAOOptimized"
    });
    console.log("✅ GanjesDAOOptimized verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ GanjesDAOOptimized already verified!");
    } else if (error.message.includes("does not have bytecode")) {
      console.error("❌ Contract not found at address:", daoAddress);
      console.log("   Make sure the contract is deployed to the current network");
    } else {
      console.error("❌ GanjesDAOOptimized verification failed:", error.message);
    }
  }

  // Check if we should verify token contract
  console.log("\n🔍 Checking token contract...");
  try {
    const tokenCode = await hre.ethers.provider.getCode(tokenAddress);
    if (tokenCode === "0x") {
      console.log("⚠️  Token contract not found at provided address");
    } else {
      console.log("✅ Token contract exists at:", tokenAddress);
      
      // Try to verify token contract (assuming it's SimpleToken)
      console.log("\n🔍 Attempting to verify token contract...");
      try {
        await run("verify:verify", {
          address: tokenAddress,
          constructorArguments: [],
          contract: "contracts/SimpleToken.sol:SimpleToken"
        });
        console.log("✅ Token contract verified successfully!");
      } catch (tokenError) {
        if (tokenError.message.includes("Already Verified")) {
          console.log("✅ Token contract already verified!");
        } else {
          console.log("⚠️  Token contract verification skipped (may be external)");
          console.log("   Reason:", tokenError.message.split('\n')[0]);
        }
      }
    }
  } catch (error) {
    console.log("⚠️  Could not check token contract:", error.message);
  }

  // Generate BSCScan links
  console.log("\n🔗 BSCScan Links:");
  if (hre.network.name === 'bsc-testnet') {
    console.log(`   DAO Contract: https://testnet.bscscan.com/address/${daoAddress}#code`);
    console.log(`   Token Contract: https://testnet.bscscan.com/address/${tokenAddress}#code`);
  } else if (hre.network.name === 'bsc-mainnet') {
    console.log(`   DAO Contract: https://bscscan.com/address/${daoAddress}#code`);
    console.log(`   Token Contract: https://bscscan.com/address/${tokenAddress}#code`);
  } else {
    console.log("   Links available for BSC networks only");
  }
  
  console.log("\n✨ Contract verification process completed!");
  console.log("🎯 You can now interact with the verified contracts on BSCScan");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });