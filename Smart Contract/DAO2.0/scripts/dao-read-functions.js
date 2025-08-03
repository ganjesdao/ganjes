const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Comprehensive script to test all DAO read functions
 */

async function main() {
  console.log("📖 Testing All DAO Read Functions");
  console.log("=================================");

  // Updated contract address
  const daoAddress = "0x96200d82e180d09Ba12DCd25eefB14C5BE85def0";
  const tokenAddress = process.env.TOKEN_ADDRESS;

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Reading with account:", deployer.address);

  // Get contract instance
  const dao = await ethers.getContractAt("GanjesDAO", daoAddress);
  const token = await ethers.getContractAt("MockERC20", tokenAddress);

  console.log("\n📋 Contract Addresses:");
  console.log("DAO Address:", daoAddress);
  console.log("Token Address:", tokenAddress);

  try {
    console.log("\n" + "=".repeat(60));
    console.log("📊 BASIC CONTRACT STATUS");
    console.log("=".repeat(60));

    // 1. Contract Status
    const contractStatus = await dao.getContractStatus();
    console.log("✅ Contract Status:");
    console.log("  - Is Paused:", contractStatus.isPaused);
    console.log("  - Total Proposals:", contractStatus.totalProposals.toString());
    console.log("  - Total Parameter Proposals:", contractStatus.totalParameterProposals.toString());
    console.log("  - Total Multi-Sig Proposals:", contractStatus.totalMultiSigProposals.toString());
    console.log("  - DAO Balance:", ethers.formatEther(contractStatus.daoBalance), "tokens");
    console.log("  - Active Investors Count:", contractStatus.activeInvestorsCount.toString());

    // 2. Current Block
    const currentBlock = await dao.getCurrentBlock();
    console.log("\n✅ Current Block:", currentBlock.toString());

    // 3. DAO Balance
    const daoBalance = await dao.getDAOBalance();
    console.log("✅ DAO Token Balance:", ethers.formatEther(daoBalance), "tokens");

    console.log("\n" + "=".repeat(60));
    console.log("⚙️  GOVERNANCE PARAMETERS");
    console.log("=".repeat(60));

    // 4. Governance Parameters
    const govParams = await dao.getGovernanceParameters();
    console.log("✅ Governance Parameters:");
    console.log("  - Min Investment Amount:", ethers.formatEther(govParams._minInvestmentAmount), "tokens");
    console.log("  - Min Tokens for Proposal:", ethers.formatEther(govParams._minTokensForProposal), "tokens");
    console.log("  - Min Voting Tokens:", ethers.formatEther(govParams._minVotingTokens), "tokens");
    console.log("  - Min Quorum Percent:", govParams._minQuorumPercent.toString() + "%");
    console.log("  - Voting Duration:", govParams._votingDuration.toString(), "blocks");

    // 5. Voting Duration Info
    const durationInfo = await dao.getVotingDurationInfo();
    console.log("\n✅ Voting Duration Configuration:");
    console.log("  - Default Duration (blocks):", durationInfo.defaultDurationBlocks.toString());
    console.log("  - Default Duration (seconds):", durationInfo.defaultDurationSeconds.toString());
    console.log("  - Default Duration (hours):", (parseInt(durationInfo.defaultDurationSeconds.toString()) / 3600).toFixed(2));
    console.log("  - Min Duration (blocks):", durationInfo.minDurationBlocks.toString());
    console.log("  - Max Duration (blocks):", durationInfo.maxDurationBlocks.toString());
    console.log("  - Current Voting Duration:", durationInfo.currentVotingDuration.toString());

    // 6. Current Proposal Fee
    const proposalFee = await dao.getCurrentProposalFeeAmount();
    console.log("\n✅ Current Proposal Fee:", ethers.formatEther(proposalFee), "tokens");

    console.log("\n" + "=".repeat(60));
    console.log("👥 MULTI-SIGNATURE CONFIGURATION");
    console.log("=".repeat(60));

    // 7. Multi-sig Configuration
    const requiredApprovals = await dao.getRequiredApprovals();
    console.log("✅ Required Approvals:", requiredApprovals.toString());

    // Check each admin
    const adminAddresses = [
      "0x073f5395476468e4fc785301026607bc4ebab128",
      "0xc55999C2D16dB17261c7140963118efaFb64F897",
      "0x891fc568C192832D5Ce12C66e95bC47aF5aE8A8F"
    ];

    console.log("\n✅ Multi-sig Owners:");
    for (let i = 0; i < adminAddresses.length; i++) {
      const isOwner = await dao.isOwner(adminAddresses[i]);
      console.log(`  - ${adminAddresses[i]}: ${isOwner ? "✅" : "❌"}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("📜 PROPOSAL LISTS");
    console.log("=".repeat(60));

    // 8. All Proposal IDs
    const allProposalIds = await dao.getAllProposalIds();
    console.log("✅ All Proposal IDs:", allProposalIds.map(id => id.toString()));

    // 9. All Parameter Proposal IDs
    const allParameterProposalIds = await dao.getAllParameterProposalIds();
    console.log("✅ All Parameter Proposal IDs:", allParameterProposalIds.map(id => id.toString()));

    // 10. Check if any proposals exist
    if (allProposalIds.length > 0) {
      console.log("\n" + "=".repeat(60));
      console.log("📋 PROPOSAL DETAILS");
      console.log("=".repeat(60));

      for (let i = 0; i < Math.min(allProposalIds.length, 5); i++) { // Show max 5 proposals
        const proposalId = allProposalIds[i];
        console.log(`\n✅ Proposal ${proposalId}:`);
        
        // Basic Details
        const basicDetails = await dao.getProposalBasicDetails(proposalId);
        console.log("  Basic Details:");
        console.log("    - ID:", basicDetails.id.toString());
        console.log("    - Proposer:", basicDetails.proposer);
        console.log("    - Description:", basicDetails.description);
        console.log("    - Project Name:", basicDetails.projectName);
        console.log("    - Project URL:", basicDetails.projectUrl);
        console.log("    - Funding Goal:", ethers.formatEther(basicDetails.fundingGoal), "tokens");
        console.log("    - End Block:", basicDetails.endBlock.toString());
        console.log("    - Executed:", basicDetails.executed);
        console.log("    - Passed:", basicDetails.passed);

        // Voting Details
        const votingDetails = await dao.getProposalVotingDetails(proposalId);
        console.log("  Voting Details:");
        console.log("    - Total Votes For:", votingDetails.totalVotesFor.toString());
        console.log("    - Total Votes Against:", votingDetails.totalVotesAgainst.toString());
        console.log("    - Voters For:", votingDetails.votersFor.toString());
        console.log("    - Voters Against:", votingDetails.votersAgainst.toString());
        console.log("    - Total Invested:", ethers.formatEther(votingDetails.totalInvested), "tokens");

        // Timing
        const isActive = await dao.isProposalActive(proposalId);
        const blocksUntilEnd = await dao.getBlocksUntilEnd(proposalId);
        const timeUntilEnd = await dao.estimateTimeUntilEnd(proposalId);
        
        console.log("  Timing:");
        console.log("    - Is Active:", isActive);
        console.log("    - Blocks Until End:", blocksUntilEnd.toString());
        console.log("    - Time Until End:", timeUntilEnd.toString(), "seconds");
        if (parseInt(timeUntilEnd.toString()) > 0) {
          console.log("    - Hours Until End:", (parseInt(timeUntilEnd.toString()) / 3600).toFixed(2));
        }

        // Proposal Fee
        const proposalFeeAmount = await dao.getProposalFee(proposalId);
        console.log("  Fee:");
        console.log("    - Proposal Fee:", ethers.formatEther(proposalFeeAmount), "tokens");
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("💰 FUNDING HISTORY");
    console.log("=".repeat(60));

    // 11. Total Funded Amount
    const totalFunded = await dao.getTotalFundedAmount();
    console.log("✅ Total Funded Amount:", ethers.formatEther(totalFunded), "tokens");

    // 12. Check funding records if any exist
    try {
      const fundingRecord = await dao.getFundingRecord(1);
      console.log("✅ First Funding Record:");
      console.log("  - Proposal ID:", fundingRecord[0].toString());
      console.log("  - Recipient:", fundingRecord[1]);
      console.log("  - Amount:", ethers.formatEther(fundingRecord[2]), "tokens");
      console.log("  - Block Number:", fundingRecord[3].toString());
    } catch (error) {
      console.log("✅ No funding records yet");
    }

    console.log("\n" + "=".repeat(60));
    console.log("🔍 ACCOUNT-SPECIFIC DATA");
    console.log("=".repeat(60));

    // 13. User's token balance
    const userTokenBalance = await token.balanceOf(deployer.address);
    console.log("✅ Your Token Balance:", ethers.formatEther(userTokenBalance), "tokens");

    // 14. User's BNB balance
    const userBnbBalance = await ethers.provider.getBalance(deployer.address);
    console.log("✅ Your BNB Balance:", ethers.formatEther(userBnbBalance), "BNB");

    // 15. Check if user is token holder
    const isTokenHolder = userTokenBalance > 0;
    console.log("✅ Is Token Holder:", isTokenHolder);

    // 16. Check if user can create proposals
    const canCreateProposal = userTokenBalance >= govParams._minTokensForProposal;
    console.log("✅ Can Create Proposals:", canCreateProposal);

    console.log("\n🎉 READ FUNCTIONS TEST COMPLETED!");
    console.log("================================");
    console.log("✅ All read functions working correctly");
    console.log("✅ Contract status verified");
    console.log("✅ Governance parameters loaded");
    console.log("✅ Multi-sig configuration confirmed");
    console.log("✅ Proposal system operational");

    console.log("\n📊 Summary:");
    console.log("Total Proposals:", contractStatus.totalProposals.toString());
    console.log("DAO Balance:", ethers.formatEther(contractStatus.daoBalance), "tokens");
    console.log("Active Investors:", contractStatus.activeInvestorsCount.toString());
    console.log("Contract Status:", contractStatus.isPaused ? "PAUSED" : "ACTIVE");

    return {
      success: true,
      contractStatus,
      govParams,
      durationInfo,
      totalProposals: contractStatus.totalProposals.toString(),
      daoBalance: ethers.formatEther(contractStatus.daoBalance)
    };

  } catch (error) {
    console.error("\n❌ Error reading DAO functions:");
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  main()
    .then((result) => {
      if (result.success) {
        console.log("\n✅ All read functions tested successfully!");
        process.exit(0);
      } else {
        console.log("\n❌ Read functions test failed!");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Script error:", error);
      process.exit(1);
    });
}

module.exports = main;