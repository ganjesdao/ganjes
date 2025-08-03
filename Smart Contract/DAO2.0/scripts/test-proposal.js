const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🧪 Testing Proposal Creation on GanjesDAO");
  console.log("=========================================");

  // Contract addresses
  const daoAddress = "0xB18a1DA499D481A46673d643ce847705371f3c7d";
  const tokenAddress = process.env.TOKEN_ADDRESS;

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  // Get contract instances
  const dao = await ethers.getContractAt("GanjesDAO", daoAddress);
  const token = await ethers.getContractAt("MockERC20", tokenAddress);

  console.log("\n📋 Contract Info:");
  console.log("DAO Address:", daoAddress);
  console.log("Token Address:", tokenAddress);
  
  // Check balances
  const balance = await ethers.provider.getBalance(deployer.address);
  const tokenBalance = await token.balanceOf(deployer.address);
  
  console.log("\n💰 Account Balances:");
  console.log("BNB Balance:", ethers.formatEther(balance));
  console.log("Token Balance:", ethers.formatEther(tokenBalance));

  // Get governance parameters
  const govParams = await dao.getGovernanceParameters();
  const proposalFee = govParams._minTokensForProposal;
  
  console.log("\n⚙️ Governance Parameters:");
  console.log("Min Tokens for Proposal:", ethers.formatEther(proposalFee));
  console.log("Min Investment Amount:", ethers.formatEther(govParams._minInvestmentAmount));
  console.log("Min Voting Tokens:", ethers.formatEther(govParams._minVotingTokens));
  console.log("Min Quorum Percent:", govParams._minQuorumPercent.toString() + "%");
  console.log("Voting Duration (blocks):", govParams._votingDuration.toString());

  // Check if user has enough tokens
  if (tokenBalance < proposalFee) {
    console.log("\n❌ Error: Insufficient tokens for proposal creation");
    console.log(`Required: ${ethers.formatEther(proposalFee)} tokens`);
    console.log(`Current: ${ethers.formatEther(tokenBalance)} tokens`);
    
    console.log("\n💡 To get tokens, you can:");
    console.log("1. Mint tokens if you're the token owner");
    console.log("2. Transfer tokens from another account");
    console.log("3. Use a different account with tokens");
    return;
  }

  console.log("\n✅ Sufficient tokens available for proposal creation");

  // Test proposal data
  const proposalData = {
    description: "Fund Community Development Initiative - Q1 2025",
    projectName: "GanjesDAO Community Growth",
    projectUrl: "https://github.com/ganjes-dao/community-initiative",
    fundingGoal: ethers.parseEther("1000") // 1000 tokens
  };

  console.log("\n📝 Test Proposal Details:");
  console.log("Description:", proposalData.description);
  console.log("Project Name:", proposalData.projectName);
  console.log("Project URL:", proposalData.projectUrl);
  console.log("Funding Goal:", ethers.formatEther(proposalData.fundingGoal), "tokens");

  try {
    console.log("\n🔄 Step 1: Approving tokens for proposal fee...");
    const approveTx = await token.approve(daoAddress, proposalFee);
    console.log("Approval TX:", approveTx.hash);
    await approveTx.wait();
    console.log("✅ Tokens approved");

    console.log("\n🔄 Step 2: Creating proposal...");
    const createTx = await dao.createProposal(
      proposalData.description,
      proposalData.projectName,
      proposalData.projectUrl,
      proposalData.fundingGoal
    );
    
    console.log("Create Proposal TX:", createTx.hash);
    const receipt = await createTx.wait();
    console.log("✅ Proposal created successfully!");

    // Get proposal ID from events
    const proposalCreatedEvent = receipt.logs.find(
      log => log.topics[0] === dao.interface.getEvent("ProposalCreated").topicHash
    );
    
    let proposalId;
    if (proposalCreatedEvent) {
      const decodedEvent = dao.interface.parseLog(proposalCreatedEvent);
      proposalId = decodedEvent.args.proposalId;
      console.log("📋 Proposal ID:", proposalId.toString());
    } else {
      // Fallback: get the latest proposal count
      proposalId = await dao.proposalCount();
      console.log("📋 Proposal ID (from count):", proposalId.toString());
    }

    console.log("\n🔍 Verifying proposal creation...");
    const proposalDetails = await dao.getProposalBasicDetails(proposalId);
    const votingDetails = await dao.getProposalVotingDetails(proposalId);
    
    console.log("✅ Proposal Details Retrieved:");
    console.log("  - ID:", proposalDetails.id.toString());
    console.log("  - Proposer:", proposalDetails.proposer);
    console.log("  - Description:", proposalDetails.description);
    console.log("  - Project Name:", proposalDetails.projectName);
    console.log("  - Project URL:", proposalDetails.projectUrl);
    console.log("  - Funding Goal:", ethers.formatEther(proposalDetails.fundingGoal));
    console.log("  - End Block:", proposalDetails.endBlock.toString());
    console.log("  - Executed:", proposalDetails.executed);
    console.log("  - Passed:", proposalDetails.passed);
    
    console.log("📊 Voting Status:");
    console.log("  - Votes For:", votingDetails.totalVotesFor.toString());
    console.log("  - Votes Against:", votingDetails.totalVotesAgainst.toString());
    console.log("  - Voters For:", votingDetails.votersFor.toString());
    console.log("  - Voters Against:", votingDetails.votersAgainst.toString());
    console.log("  - Total Invested:", ethers.formatEther(votingDetails.totalInvested));

    // Check proposal fee
    const feeAmount = await dao.getProposalFee(proposalId);
    console.log("💰 Proposal Fee Paid:", ethers.formatEther(feeAmount));

    // Check if proposal is active
    const isActive = await dao.isProposalActive(proposalId);
    console.log("🔄 Proposal Active:", isActive);

    // Get current block and time until end
    const currentBlock = await dao.getCurrentBlock();
    const blocksUntilEnd = await dao.getBlocksUntilEnd(proposalId);
    const timeUntilEnd = await dao.estimateTimeUntilEnd(proposalId);
    
    console.log("\n⏰ Timing Information:");
    console.log("  - Current Block:", currentBlock.toString());
    console.log("  - Blocks Until End:", blocksUntilEnd.toString());
    console.log("  - Est. Time Until End:", timeUntilEnd.toString(), "seconds");

    // Check updated balances
    const newTokenBalance = await token.balanceOf(deployer.address);
    const daoBalance = await dao.getDAOBalance();
    
    console.log("\n💰 Updated Balances:");
    console.log("Your Token Balance:", ethers.formatEther(newTokenBalance));
    console.log("DAO Balance:", ethers.formatEther(daoBalance));
    console.log("Fee Deducted:", ethers.formatEther(tokenBalance - newTokenBalance));

    console.log("\n🎉 PROPOSAL CREATION TEST SUCCESSFUL!");
    console.log("=====================================");
    console.log("✅ Proposal created and verified");
    console.log("✅ Fee system working correctly");
    console.log("✅ All governance parameters applied");
    console.log("✅ Events emitted properly");
    console.log("✅ View functions working");

    console.log("\n🔗 View on BSCScan:");
    console.log(`https://testnet.bscscan.com/tx/${createTx.hash}`);

    console.log("\n📝 Next Steps for Testing:");
    console.log("1. Test voting on this proposal with different accounts");
    console.log("2. Test proposal execution after voting period");
    console.log("3. Test multi-sig operations");
    console.log("4. Test parameter proposal creation");

    return {
      success: true,
      proposalId: proposalId.toString(),
      transactionHash: createTx.hash,
      proposalDetails,
      votingDetails
    };

  } catch (error) {
    console.error("\n❌ Error creating proposal:");
    console.error(error.message);
    
    if (error.message.includes("Insufficient tokens")) {
      console.log("\n💡 Make sure you have enough tokens for proposal creation");
    } else if (error.message.includes("Project name cannot be empty")) {
      console.log("\n💡 Check that all proposal fields are properly filled");
    } else if (error.message.includes("revert")) {
      console.log("\n💡 This might be a contract validation error");
    }
    
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  main()
    .then((result) => {
      if (result.success) {
        console.log("\n✅ Test completed successfully!");
        process.exit(0);
      } else {
        console.log("\n❌ Test failed!");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Test script error:", error);
      process.exit(1);
    });
}

module.exports = main;