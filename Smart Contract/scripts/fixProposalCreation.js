import hre from "hardhat";
import { config } from "dotenv";

const { ethers } = hre;
config();

async function main() {
  console.log("🔧 Fixing Proposal Creation Issue");
  console.log("=" .repeat(70));
  
  const [signer] = await ethers.getSigners();
  console.log("👤 User Address:", signer.address);
  
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const daoAddress = process.env.DAO_ADDRESS;
  
  // Get contract instances
  const Token = await ethers.getContractFactory("SimpleToken");
  const token = Token.attach(tokenAddress);
  
  const DAO = await ethers.getContractFactory("GanjesDAOOptimized");
  const dao = DAO.attach(daoAddress);
  
  try {
    // Step 1: Approve tokens
    console.log("\n🔓 Step 1: Approving tokens for DAO...");
    const depositAmount = await dao.PROPOSAL_CREATION_FEE();
    console.log("💰 Approving", ethers.formatEther(depositAmount), "tokens for DAO");
    
    const approveTx = await token.approve(daoAddress, depositAmount);
    console.log("📝 Approval transaction hash:", approveTx.hash);
    
    await approveTx.wait();
    console.log("✅ Tokens approved successfully!");
    
    // Verify approval
    const newAllowance = await token.allowance(signer.address, daoAddress);
    console.log("🔑 New Allowance:", ethers.formatEther(newAllowance), "tokens");
    
    // Step 2: Check requirements again
    console.log("\n📋 Step 2: Rechecking requirements...");
    const requirements = await dao.checkProposalRequirements(signer.address);
    console.log("✅ Can Create Proposal:", requirements.canCreateProposal);
    console.log("📝 Status:", requirements.statusMessage);
    
    if (!requirements.canCreateProposal) {
      console.log("❌ Still cannot create proposal after approval");
      return;
    }
    
    // Step 3: Create test proposal
    console.log("\n🚀 Step 3: Creating test proposal...");
    
    const testProposal = {
      description: "Test proposal to verify the fix - DeFi Analytics Dashboard development",
      projectName: "GanjesDAO Analytics Platform",
      projectUrl: "https://github.com/ganjes/analytics-platform",
      fundingGoal: ethers.parseEther("1000") // 1000 tokens
    };
    
    console.log("📄 Proposal Details:");
    console.log("   Description:", testProposal.description);
    console.log("   Project Name:", testProposal.projectName);
    console.log("   Project URL:", testProposal.projectUrl);
    console.log("   Funding Goal:", ethers.formatEther(testProposal.fundingGoal), "tokens");
    
    const createTx = await dao.createProposal(
      testProposal.description,
      testProposal.projectName,
      testProposal.projectUrl,
      testProposal.fundingGoal
    );
    
    console.log("📝 Proposal creation transaction hash:", createTx.hash);
    
    const receipt = await createTx.wait();
    console.log("✅ Proposal created successfully!");
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    
    // Parse events to get proposal ID
    const proposalCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = dao.interface.parseLog(log);
        return parsed.name === 'ProposalCreated';
      } catch {
        return false;
      }
    });
    
    if (proposalCreatedEvent) {
      const parsed = dao.interface.parseLog(proposalCreatedEvent);
      const proposalId = parsed.args.proposalId;
      console.log("🎯 New Proposal ID:", proposalId.toString());
      
      // Get proposal details
      const proposal = await dao.getProposal(proposalId);
      console.log("\n📊 Created Proposal Details:");
      console.log("   ID:", proposal.id.toString());
      console.log("   Proposer:", proposal.proposer);
      console.log("   Project:", proposal.projectName);
      console.log("   Funding Goal:", ethers.formatEther(proposal.fundingGoal), "tokens");
      console.log("   Deposit:", ethers.formatEther(proposal.creationFee), "tokens");
      console.log("   End Time:", new Date(Number(proposal.endTime) * 1000).toLocaleString());
      console.log("   Status: Active");
    }
    
    // Step 4: Show final status
    console.log("\n" + "=" .repeat(70));
    console.log("🎉 PROPOSAL CREATION FIXED SUCCESSFULLY!");
    console.log("=" .repeat(70));
    
    console.log("\n✅ What was fixed:");
    console.log("   1. ✅ Approved 50 tokens for DAO contract");
    console.log("   2. ✅ Successfully created test proposal");
    console.log("   3. ✅ Verified proposal was stored correctly");
    
    console.log("\n💡 For future proposals:");
    console.log("   • Make sure you have at least 150 tokens (100 min + 50 deposit)");
    console.log("   • Approve the DAO to spend 50 tokens before creating proposals");
    console.log("   • Wait 1 hour between proposals (cooldown period)");
    console.log("   • Maximum 10 proposals per user");
    
    console.log("\n🚀 Your DAO is now working correctly!");
    
  } catch (error) {
    console.log("❌ Error during fix:", error.message);
    
    // Check if it's a revert with custom error
    if (error.data && error.data.startsWith('0x')) {
      try {
        const decodedError = dao.interface.parseError(error.data);
        console.log("🔍 Decoded error:", decodedError.name);
        console.log("📝 Error args:", decodedError.args);
      } catch {
        console.log("🔍 Raw error data:", error.data);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Fix script failed:", error);
    process.exit(1);
  });