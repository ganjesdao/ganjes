import hre from "hardhat";
import { config } from "dotenv";

const { ethers } = hre;
config();

async function main() {
  console.log("🔍 DAO Proposal Creation Diagnostics");
  console.log("=" .repeat(70));
  
  const [signer] = await ethers.getSigners();
  console.log("👤 User Address:", signer.address);
  
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const daoAddress = process.env.DAO_ADDRESS;
  
  if (!tokenAddress || !daoAddress) {
    console.log("❌ Missing TOKEN_ADDRESS or DAO_ADDRESS in .env");
    return;
  }
  
  console.log("📄 Token Address:", tokenAddress);
  console.log("🏛️ DAO Address:", daoAddress);
  
  // Get contract instances
  const Token = await ethers.getContractFactory("SimpleToken");
  const token = Token.attach(tokenAddress);
  
  const DAO = await ethers.getContractFactory("GanjesDAOOptimized");
  const dao = DAO.attach(daoAddress);
  
  try {
    // Check token balance
    const tokenBalance = await token.balanceOf(signer.address);
    console.log("\n💰 Token Balance:", ethers.formatEther(tokenBalance), "tokens");
    
    // Check token allowance
    const allowance = await token.allowance(signer.address, daoAddress);
    console.log("🔓 Current Allowance:", ethers.formatEther(allowance), "tokens");
    
    // Check DAO requirements
    const requirements = await dao.checkProposalRequirements(signer.address);
    console.log("\n📋 Proposal Requirements Check:");
    console.log("✅ Can Create Proposal:", requirements.canCreateProposal);
    console.log("📊 Has Min Tokens (100):", requirements.hasMinTokens);
    console.log("💵 Has Deposit Tokens (100):", requirements.hasDepositTokens);
    console.log("🔐 Has Allowance (100):", requirements.hasAllowance);
    console.log("⏰ Cooldown Passed:", requirements.cooldownPassed);
    console.log("📈 Below Max Proposals:", requirements.belowMaxProposals);
    console.log("💼 User Balance:", ethers.formatEther(requirements.userBalance), "tokens");
    console.log("🔑 Current Allowance:", ethers.formatEther(requirements.currentAllowance), "tokens");
    console.log("📝 Status Message:", requirements.statusMessage);
    
    // Check if contract is paused
    const isPaused = await dao.paused();
    console.log("\n⏸️ Contract Paused:", isPaused);
    
    // Check proposal requirements
    const minTokens = await dao.MIN_TOKENS_FOR_PROPOSAL();
    const depositAmount = await dao.PROPOSAL_CREATION_FEE();
    const totalRequired = await dao.TOTAL_TOKENS_REQUIRED();
    
    console.log("\n📊 DAO Configuration:");
    console.log("🎯 Min Tokens for Proposal:", ethers.formatEther(minTokens), "tokens");
    console.log("💰 Proposal Deposit Amount:", ethers.formatEther(depositAmount), "tokens");
    console.log("🔢 Total Tokens Required:", ethers.formatEther(totalRequired), "tokens");
    
    // Diagnosis and recommendations
    console.log("\n🩺 DIAGNOSIS:");
    if (!requirements.canCreateProposal) {
      console.log("❌ CANNOT CREATE PROPOSAL");
      if (!requirements.hasMinTokens) {
        console.log("   🚨 ISSUE: Insufficient token balance");
        console.log("   💡 SOLUTION: You need at least", ethers.formatEther(minTokens), "tokens");
      }
      if (!requirements.hasAllowance) {
        console.log("   🚨 ISSUE: Insufficient allowance");
        console.log("   💡 SOLUTION: Approve DAO to spend", ethers.formatEther(depositAmount), "tokens");
      }
      if (!requirements.cooldownPassed) {
        console.log("   🚨 ISSUE: Proposal cooldown active");
        console.log("   💡 SOLUTION: Wait", requirements.timeUntilNextProposal.toString(), "seconds");
      }
      if (!requirements.belowMaxProposals) {
        console.log("   🚨 ISSUE: Maximum proposals reached");
        console.log("   💡 SOLUTION: Wait for some proposals to be executed");
      }
      if (isPaused) {
        console.log("   🚨 ISSUE: Contract is paused");
        console.log("   💡 SOLUTION: Wait for admin to unpause");
      }
    } else {
      console.log("✅ READY TO CREATE PROPOSAL");
    }
    
  } catch (error) {
    console.log("❌ Error during diagnostics:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Diagnostics failed:", error);
    process.exit(1);
  });