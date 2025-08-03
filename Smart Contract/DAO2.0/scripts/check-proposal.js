const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("📊 Checking Proposal Status");
  console.log("===========================");

  const daoAddress = "0xB18a1DA499D481A46673d643ce847705371f3c7d";
  const proposalId = process.argv[2] || 1; // Get proposal ID from command line or default to 1

  const dao = await ethers.getContractAt("GanjesDAO", daoAddress);

  console.log("DAO Address:", daoAddress);
  console.log("Proposal ID:", proposalId);

  try {
    // Get proposal details
    const proposalDetails = await dao.getProposalBasicDetails(proposalId);
    const votingDetails = await dao.getProposalVotingDetails(proposalId);
    const isActive = await dao.isProposalActive(proposalId);
    const currentBlock = await dao.getCurrentBlock();
    const blocksUntilEnd = await dao.getBlocksUntilEnd(proposalId);
    const timeUntilEnd = await dao.estimateTimeUntilEnd(proposalId);
    // const canExecute = await dao.canExecuteProposal(proposalId);

    console.log("\n📋 Proposal Details:");
    console.log("ID:", proposalDetails.id.toString());
    console.log("Proposer:", proposalDetails.proposer);
    console.log("Description:", proposalDetails.description);
    console.log("Project Name:", proposalDetails.projectName);
    console.log("Project URL:", proposalDetails.projectUrl);
    console.log("Funding Goal:", ethers.formatEther(proposalDetails.fundingGoal), "tokens");
    console.log("End Block:", proposalDetails.endBlock.toString());
    console.log("Executed:", proposalDetails.executed);
    console.log("Passed:", proposalDetails.passed);

    console.log("\n🗳️  Voting Status:");
    console.log("Active:", isActive);
    console.log("Total Votes For:", votingDetails.totalVotesFor.toString());
    console.log("Total Votes Against:", votingDetails.totalVotesAgainst.toString());
    console.log("Voters For:", votingDetails.votersFor.toString());
    console.log("Voters Against:", votingDetails.votersAgainst.toString());
    console.log("Total Invested:", ethers.formatEther(votingDetails.totalInvested), "tokens");

    console.log("\n⏰ Timing:");
    console.log("Current Block:", currentBlock.toString());
    console.log("Blocks Until End:", blocksUntilEnd.toString());
    console.log("Est. Time Until End:", timeUntilEnd.toString(), "seconds");

    // console.log("\n🔄 Execution Status:");
    // console.log("Can Execute:", canExecute[0]);
    // console.log("Reason:", canExecute[1]);

    // Check proposal fee status
    const proposalFee = await dao.getProposalFee(proposalId);
    const isRefunded = await dao.isProposalFeeRefunded(proposalId);
    
    console.log("\n💰 Fee Status:");
    console.log("Proposal Fee:", ethers.formatEther(proposalFee), "tokens");
    console.log("Fee Refunded:", isRefunded);

    // Check overall DAO status
    const daoStatus = await dao.getContractStatus();
    console.log("\n🏛️  DAO Status:");
    console.log("Paused:", daoStatus.isPaused);
    console.log("Total Proposals:", daoStatus.totalProposals.toString());
    console.log("DAO Balance:", ethers.formatEther(daoStatus.daoBalance), "tokens");
    console.log("Active Investors:", daoStatus.activeInvestorsCount.toString());

  } catch (error) {
    console.error("❌ Error checking proposal:", error.message);
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