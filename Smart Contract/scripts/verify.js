import hre from "hardhat";
import { config } from "dotenv";
import fs from "fs";

const { run } = hre;
config();

async function main() {
  console.log("🔍 Starting contract verification on BSCScan...");
  console.log("=" .repeat(60));

  // Read deployment info
  let deploymentInfo;
  try {
    const data = fs.readFileSync('deployment-dao.json', 'utf8');
    deploymentInfo = JSON.parse(data);
    console.log("📄 Loaded deployment info from deployment-dao.json");
  } catch (error) {
    console.error("❌ Could not read deployment-dao.json:", error.message);
    process.exit(1);
  }

  const tokenAddress = deploymentInfo.contracts.token.address;
  const daoAddress = deploymentInfo.contracts.dao.address;
  
  console.log("\n📋 Contracts to verify:");
  console.log("   Token (SimpleToken):", tokenAddress);
  console.log("   DAO (GanjesDAOOptimized):", daoAddress);

  // Verify SimpleToken
  console.log("\n🔍 Verifying SimpleToken...");
  try {
    await run("verify:verify", {
      address: tokenAddress,
      constructorArguments: [],
      contract: "contracts/SimpleToken.sol:SimpleToken"
    });
    console.log("✅ SimpleToken verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ SimpleToken already verified!");
    } else {
      console.error("❌ SimpleToken verification failed:", error.message);
    }
  }

  // Verify GanjesDAOOptimized
  console.log("\n🔍 Verifying GanjesDAOOptimized...");
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
    } else {
      console.error("❌ GanjesDAOOptimized verification failed:", error.message);
    }
  }

  console.log("\n🔗 BSCScan Links:");
  console.log(`   Token: https://testnet.bscscan.com/address/${tokenAddress}#code`);
  console.log(`   DAO: https://testnet.bscscan.com/address/${daoAddress}#code`);
  
  console.log("\n✨ Verification process completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });