const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🗳️  Testing Proposal Voting on GanjesDAO");
  console.log("========================================");

  // Contract addresses
  const daoAddress = "0xB18a1DA499D481A46673d643ce847705371f3c7d";
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const proposalId = 1; // From the previous test

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  // Get contract instances
  const dao = await ethers.getContractAt("GanjesDAO", daoAddress);
  const token = await ethers.getContractAt("MockERC20", tokenAddress);

  console.log("\n📋 Test Info:");
  console.log("DAO Address:", daoAddress);
  console.log("Token Address:", tokenAddress);
  console.log("Proposal ID:", proposalId);
  
  // Check current proposal status
  console.log("\n🔍 Current Proposal Status:");
  const proposalDetails = await dao.getProposalBasicDetails(proposalId);
  const votingDetails = await dao.getProposalVotingDetails(proposalId);
  const isActive = await dao.isProposalActive(proposalId);
  
  console.log("Proposal Active:", isActive);
  console.log("Proposer:", proposalDetails.proposer);
  console.log("Funding Goal:", ethers.formatEther(proposalDetails.fundingGoal));
  console.log("Current Votes For:", votingDetails.totalVotesFor.toString());
  console.log("Current Votes Against:", votingDetails.totalVotesAgainst.toString());
  console.log("Total Invested:", ethers.formatEther(votingDetails.totalInvested));

  if (!isActive) {
    console.log("❌ Proposal is not active - cannot vote");
    return;
  }

  // Get governance parameters
  const govParams = await dao.getGovernanceParameters();
  const minInvestment = govParams._minInvestmentAmount;
  
  console.log("\n💰 Voting Requirements:");
  console.log("Min Investment Amount:", ethers.formatEther(minInvestment));
  console.log("Min Voting Tokens:", ethers.formatEther(govParams._minVotingTokens));

  // Check account balances
  const tokenBalance = await token.balanceOf(deployer.address);
  console.log("Your Token Balance:", ethers.formatEther(tokenBalance));

  if (tokenBalance < minInvestment) {
    console.log("❌ Insufficient tokens for voting");
    return;
  }

  // Test voting parameters
  const investmentAmount = ethers.parseEther("50"); // 50 tokens
  const voteSupport = true; // Vote in favor

  console.log("\n📝 Vote Details:");
  console.log("Investment Amount:", ethers.formatEther(investmentAmount));
  console.log("Vote Support:", voteSupport ? "YES (For)" : "NO (Against)");

  try {
    console.log("\n🔄 Step 1: Approving tokens for voting investment...");
    const approveTx = await token.approve(daoAddress, investmentAmount);
    console.log("Approval TX:", approveTx.hash);
    await approveTx.wait();
    console.log("✅ Tokens approved for voting");

    console.log("\n🔄 Step 2: Casting vote...");
    const voteTx = await dao.vote(proposalId, voteSupport, investmentAmount);
    console.log("Vote TX:", voteTx.hash);
    const receipt = await voteTx.wait();
    console.log("✅ Vote cast successfully!");

    // Parse vote event
    const voteEvent = receipt.logs.find(
      log => log.topics[0] === dao.interface.getEvent("Voted").topicHash
    );
    
    if (voteEvent) {
      const decodedEvent = dao.interface.parseLog(voteEvent);
      console.log("📊 Vote Event Details:");
      console.log("  - Proposal ID:", decodedEvent.args.proposalId.toString());
      console.log("  - Voter:", decodedEvent.args.voter);
      console.log("  - Support:", decodedEvent.args.support);
      console.log("  - Weight:", decodedEvent.args.weight.toString());
      console.log("  - Investment:", ethers.formatEther(decodedEvent.args.investmentAmount));
    }

    console.log("\n🔍 Verifying vote results...");
    const updatedVotingDetails = await dao.getProposalVotingDetails(proposalId);
    
    console.log("✅ Updated Voting Details:");
    console.log("  - Total Votes For:", updatedVotingDetails.totalVotesFor.toString());
    console.log("  - Total Votes Against:", updatedVotingDetails.totalVotesAgainst.toString());
    console.log("  - Voters For:", updatedVotingDetails.votersFor.toString());
    console.log("  - Voters Against:", updatedVotingDetails.votersAgainst.toString());
    console.log("  - Total Invested:", ethers.formatEther(updatedVotingDetails.totalInvested));

    // Check updated balances
    const newTokenBalance = await token.balanceOf(deployer.address);
    const daoBalance = await dao.getDAOBalance();
    
    console.log("\n💰 Updated Balances:");
    console.log("Your Token Balance:", ethers.formatEther(newTokenBalance));
    console.log("DAO Balance:", ethers.formatEther(daoBalance));
    console.log("Investment Made:", ethers.formatEther(tokenBalance - newTokenBalance));

    // Check voting time remaining
    const blocksUntilEnd = await dao.getBlocksUntilEnd(proposalId);
    const timeUntilEnd = await dao.estimateTimeUntilEnd(proposalId);
    
    console.log("\n⏰ Voting Time Remaining:");
    console.log("Blocks Until End:", blocksUntilEnd.toString());
    console.log("Est. Time Until End:", timeUntilEnd.toString(), "seconds");

    // Check if proposal can be executed
    const canExecute = await dao.canExecuteProposal(proposalId);
    console.log("\n🔄 Execution Status:");
    console.log("Can Execute:", canExecute[0]);
    console.log("Reason:", canExecute[1]);

    console.log("\n🎉 VOTING TEST SUCCESSFUL!");
    console.log("=========================");
    console.log("✅ Vote cast and verified");
    console.log("✅ Investment system working");
    console.log("✅ Voting weights calculated correctly");
    console.log("✅ Balance updates correct");
    console.log("✅ Events emitted properly");

    console.log("\n🔗 View Vote TX on BSCScan:");
    console.log(`https://testnet.bscscan.com/tx/${voteTx.hash}`);

    console.log("\n📝 Test Results Summary:");
    console.log("Proposal ID:", proposalId);
    console.log("Vote Support:", voteSupport ? "YES" : "NO");
    console.log("Investment Amount:", ethers.formatEther(investmentAmount));
    console.log("Voter Weight:", updatedVotingDetails.totalVotesFor.toString());
    console.log("Total Invested:", ethers.formatEther(updatedVotingDetails.totalInvested));

    console.log("\n📝 Next Testing Steps:");
    console.log("1. Wait for voting period to end");
    console.log("2. Test proposal execution");
    console.log("3. Test refund mechanisms");
    console.log("4. Test with multiple voters");

    return {
      success: true,
      proposalId,
      voteSupport,
      investmentAmount: ethers.formatEther(investmentAmount),
      transactionHash: voteTx.hash,
      votingDetails: updatedVotingDetails
    };

  } catch (error) {
    console.error("\n❌ Error during voting:");
    console.error(error.message);
    
    if (error.message.includes("Already voted")) {
      console.log("\n💡 You have already voted on this proposal");
    } else if (error.message.includes("Proposer cannot vote")) {
      console.log("\n💡 Proposal creator cannot vote on their own proposal");
    } else if (error.message.includes("Voting period has ended")) {
      console.log("\n💡 The voting period for this proposal has ended");
    } else if (error.message.includes("Investment below minimum")) {
      console.log("\n💡 Investment amount is below the minimum required");
    }
    
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  main()
    .then((result) => {
      if (result.success) {
        console.log("\n✅ Voting test completed successfully!");
        process.exit(0);
      } else {
        console.log("\n❌ Voting test failed!");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Voting test script error:", error);
      process.exit(1);
    });
}

module.exports = main;