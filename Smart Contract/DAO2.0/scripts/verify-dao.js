const { run } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Verifying GanjesDAO contract on BSCScan...");
  console.log("=============================================");

  // Contract details
  const daoAddress = "0x96200d82e180d09Ba12DCd25eefB14C5BE85def0";
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const adminAddresses = [
    process.env.ADMIN_1,
    process.env.ADMIN_2,
    process.env.ADMIN_3
  ];
  const requiredSignatures = parseInt(process.env.REQUIRED_SIGNATURES) || 2;

  console.log("📋 Contract Info:");
  console.log("DAO Address:", daoAddress);
  console.log("Token Address:", tokenAddress);
  console.log("Admin Addresses:", adminAddresses);
  console.log("Required Signatures:", requiredSignatures);

  try {
    console.log("\n📤 Submitting verification...");
    
    await run("verify:verify", {
      address: daoAddress,
      constructorArguments: [
        tokenAddress,
        adminAddresses,
        requiredSignatures
      ],
      network: "bscTestnet"
    });

    console.log("✅ Contract verified successfully!");
    console.log("🔗 View on BSCScan:");
    console.log(`https://testnet.bscscan.com/address/${daoAddress}#code`);

  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract already verified!");
      console.log("🔗 View on BSCScan:");
      console.log(`https://testnet.bscscan.com/address/${daoAddress}#code`);
    } else {
      console.error("❌ Verification failed:");
      console.error(error.message);
      
      console.log("\n🔧 Manual verification info:");
      console.log("Contract Address:", daoAddress);
      console.log("Compiler Version: 0.8.24");
      console.log("Optimization: Yes (200 runs)");
      console.log("Constructor Arguments (ABI-encoded):");
      
      // For manual verification, you can use these parameters
      const { ethers } = require("hardhat");
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encodedArgs = abiCoder.encode(
        ["address", "address[]", "uint256"],
        [tokenAddress, adminAddresses, requiredSignatures]
      );
      console.log(encodedArgs);
    }
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;