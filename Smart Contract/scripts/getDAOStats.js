import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";

dotenv.config();

async function getDAOStats() {
    try {
        console.log("📊 Ganjes DAO Statistics Dashboard");
        console.log("==================================\n");
        const [signer] = await ethers.getSigners();
        const daoAddress = process.env.DAO_ADDRESS;
        const tokenAddress = process.env.TOKEN_ADDRESS;

        if (!daoAddress || !tokenAddress) {
            throw new Error("❌ DAO_ADDRESS and TOKEN_ADDRESS must be set in .env file");
        }

        console.log("🏛️  DAO Contract:", daoAddress);
        console.log("💰 Token Contract:", tokenAddress);
        console.log("👤 Query Account:", signer.address);

        const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
        const tokenArtifact = await artifacts.readArtifact("SimpleToken");

        const daoABi = await daoArtifact.abi

        console.log(`\n🔗 Contracts ABI: ${daoABi}`);

        const dao = new ethers.Contract(daoAddress, daoArtifact.abi, signer);
        const token = new ethers.Contract(tokenAddress, tokenArtifact.abi, signer);


        console.log("\n🚀 DAO Contract:", dao);

        // ============= TOKEN STATISTICS =============
        console.log("\n💰 TOKEN STATISTICS");
        console.log("==================");

        const tokenName = await token.name();
        const tokenSymbol = await token.symbol();
        const tokenDecimals = await token.decimals();
        const totalSupply = await token.totalSupply();

        console.log(`📛 Token Name: ${tokenName}`);
        console.log(`🏷️  Symbol: ${tokenSymbol}`);
        console.log(`🔢 Decimals: ${tokenDecimals}`);
        console.log(`📊 Total Supply: ${ethers.formatEther(totalSupply)} tokens`);

        // ============= DAO CONFIGURATION =============
        console.log("\n🏛️  DAO CONFIGURATION");
        console.log("====================");

        const daoStats = await dao.getDAOStats();

        const admin = await dao.admin();
        const minInvestment = await dao.minInvestmentAmount();
        const votingDuration = await dao.votingDuration();
        const minTokensForProposal = await dao.MIN_TOKENS_FOR_PROPOSAL();
        const creationFeeAmount = await dao.PROPOSAL_CREATION_FEE();
        const maxProposalsPerUser = await dao.maxProposalsPerUser();
        const minQuorumPercent = await dao.MIN_QUORUM_PERCENT();
        const proposalCreationCooldown = await dao.PROPOSAL_COOLDOWN();

        console.log(`📋 DAO Stats: ${daoStats}`);

        console.log(`👑 Admin: ${admin}`);
        console.log(`💵 Min Investment: ${ethers.formatEther(minInvestment)} ${tokenSymbol}`);
        console.log(`⏰ Voting Duration: ${votingDuration} seconds (${Math.floor(Number(votingDuration) / 60)} minutes)`);
        console.log(`🎯 Min Tokens for Proposal: ${ethers.formatEther(minTokensForProposal)} ${tokenSymbol}`);
        console.log(`🏦 Proposal Deposit: ${ethers.formatEther(creationFeeAmount)} ${tokenSymbol}`);
        console.log(`📝 Max Proposals per User: ${maxProposalsPerUser}`);
        console.log(`📊 Min Quorum: ${minQuorumPercent}%`);
        console.log(`⏳ Proposal Cooldown: ${proposalCreationCooldown} seconds (${Math.floor(Number(proposalCreationCooldown) / 3600)} hours)`);

        // ============= PROPOSAL STATISTICS =============
        console.log("\n📋 PROPOSAL STATISTICS");
        console.log("=====================");

        const totalProposals = await dao.getTotalProposals();
        console.log(`📊 Total Proposals Created: ${totalProposals}`);

        if (totalProposals === 0n) {
            console.log("📝 No proposals have been created yet.");
            return;
        }

        // Analyze all proposals
        let activeProposals = 0;
        let executedProposals = 0;
        let expiredProposals = 0;
        let totalFundingRequested = 0n;
        let totalFundsRaised = 0n;
        let totalVoters = 0;
        let totalVotesFor = 0n;
        let totalVotesAgainst = 0n;

        const currentTime = Math.floor(Date.now() / 1000);
        const proposalDetails = [];

        console.log("\n📋 DETAILED PROPOSAL ANALYSIS");
        console.log("=============================");

        for (let i = 1; i <= totalProposals; i++) {
            try {
                const proposal = await dao.proposals(i);

                const isActive = !proposal.executed && Number(proposal.endTime) > currentTime;
                const isExpired = !proposal.executed && Number(proposal.endTime) <= currentTime;
                const isExecuted = proposal.executed;

                if (isActive) activeProposals++;
                if (isExecuted) executedProposals++;
                if (isExpired) expiredProposals++;

                totalFundingRequested += proposal.fundingGoal;
                totalFundsRaised += proposal.totalInvested;
                totalVoters += Number(proposal.votersFor) + Number(proposal.votersAgainst);
                totalVotesFor += proposal.totalVotesFor;
                totalVotesAgainst += proposal.totalVotesAgainst;

                const timeRemaining = Number(proposal.endTime) - currentTime;
                const status = isExecuted ? "🏁 Executed" :
                    isActive ? "🟢 Active" : "🔴 Expired";

                console.log(`\n📋 Proposal #${i}: "${proposal.projectName}"`);
                console.log(`   📝 Description: ${proposal.description}`);
                console.log(`   👤 Proposer: ${proposal.proposer}`);
                console.log(`   💰 Funding Goal: ${ethers.formatEther(proposal.fundingGoal)} ${tokenSymbol}`);
                console.log(`   📈 Total Invested: ${ethers.formatEther(proposal.totalInvested)} ${tokenSymbol}`);
                console.log(`   📊 Progress: ${((Number(proposal.totalInvested) * 100) / Number(proposal.fundingGoal)).toFixed(1)}%`);
                console.log(`   👍 Votes FOR: ${ethers.formatEther(proposal.totalVotesFor)} ${tokenSymbol} (${proposal.votersFor} voters)`);
                console.log(`   👎 Votes AGAINST: ${ethers.formatEther(proposal.totalVotesAgainst)} ${tokenSymbol} (${proposal.votersAgainst} voters)`);
                console.log(`   ⏰ End Time: ${new Date(Number(proposal.endTime) * 1000)}`);
                console.log(`   📋 Status: ${status}`);

                if (isActive && timeRemaining > 0) {
                    const hours = Math.floor(timeRemaining / 3600);
                    const minutes = Math.floor((timeRemaining % 3600) / 60);
                    console.log(`   ⏳ Time Remaining: ${hours}h ${minutes}m`);
                }

                // Calculate voting participation
                const totalVotingPower = proposal.totalVotesFor + proposal.totalVotesAgainst;
                if (totalVotingPower > 0) {
                    const forPercentage = (Number(proposal.totalVotesFor) * 100) / Number(totalVotingPower);
                    const againstPercentage = (Number(proposal.totalVotesAgainst) * 100) / Number(totalVotingPower);
                    console.log(`   📊 Vote Distribution: ${forPercentage.toFixed(1)}% FOR, ${againstPercentage.toFixed(1)}% AGAINST`);
                }

                proposalDetails.push({
                    id: i,
                    projectName: proposal.projectName,
                    proposer: proposal.proposer,
                    fundingGoal: proposal.fundingGoal,
                    totalInvested: proposal.totalInvested,
                    totalVotesFor: proposal.totalVotesFor,
                    totalVotesAgainst: proposal.totalVotesAgainst,
                    votersFor: Number(proposal.votersFor),
                    votersAgainst: Number(proposal.votersAgainst),
                    endTime: Number(proposal.endTime),
                    executed: proposal.executed,
                    status: isExecuted ? "Executed" : isActive ? "Active" : "Expired"
                });

            } catch (error) {
                console.log(`   ❌ Error fetching proposal #${i}: ${error.message}`);
            }
        }

        // ============= OVERALL DAO METRICS =============
        console.log("\n📊 OVERALL DAO METRICS");
        console.log("=====================");

        console.log(`📋 Proposal Breakdown:`);
        console.log(`   🟢 Active: ${activeProposals}`);
        console.log(`   🏁 Executed: ${executedProposals}`);
        console.log(`   🔴 Expired: ${expiredProposals}`);

        console.log(`\n💰 Financial Overview:`);
        console.log(`   💸 Total Funding Requested: ${ethers.formatEther(totalFundingRequested)} ${tokenSymbol}`);
        console.log(`   💰 Total Funds Raised: ${ethers.formatEther(totalFundsRaised)} ${tokenSymbol}`);

        if (totalFundingRequested > 0) {
            const fundingEfficiency = (Number(totalFundsRaised) * 100) / Number(totalFundingRequested);
            console.log(`   📊 Funding Efficiency: ${fundingEfficiency.toFixed(1)}%`);
        }

        console.log(`\n🗳️  Voting Statistics:`);
        console.log(`   👥 Total Unique Voters: ${totalVoters}`);
        console.log(`   👍 Total Votes FOR: ${ethers.formatEther(totalVotesFor)} ${tokenSymbol}`);
        console.log(`   👎 Total Votes AGAINST: ${ethers.formatEther(totalVotesAgainst)} ${tokenSymbol}`);

        if (totalVotesFor + totalVotesAgainst > 0) {
            const totalVotingPower = totalVotesFor + totalVotesAgainst;
            const forPercentage = (Number(totalVotesFor) * 100) / Number(totalVotingPower);
            const againstPercentage = (Number(totalVotesAgainst) * 100) / Number(totalVotingPower);
            console.log(`   📊 Overall Sentiment: ${forPercentage.toFixed(1)}% FOR, ${againstPercentage.toFixed(1)}% AGAINST`);
        }

        // ============= ACCOUNT SPECIFIC STATS =============
        console.log("\n👤 YOUR ACCOUNT STATISTICS");
        console.log("=========================");

        const userBalance = await token.balanceOf(signer.address);
        const userAllowance = await token.allowance(signer.address, daoAddress);

        console.log(`💰 Token Balance: ${ethers.formatEther(userBalance)} ${tokenSymbol}`);
        console.log(`🔐 DAO Allowance: ${ethers.formatEther(userAllowance)} ${tokenSymbol}`);

        // Check user's proposal creation eligibility
        const hasMinTokens = userBalance >= minTokensForProposal;
        const hasDepositTokens = userBalance >= creationFeeAmount;
        const totalNeeded = minTokensForProposal + creationFeeAmount;
        const hasAllowance = userAllowance >= totalNeeded;

        console.log(`\n📋 Proposal Creation Eligibility:`);
        console.log(`   🎯 Min Tokens Required: ${hasMinTokens ? '✅' : '❌'} ${ethers.formatEther(minTokensForProposal)} ${tokenSymbol}`);
        console.log(`   🏦 Deposit Required: ${hasDepositTokens ? '✅' : '❌'} ${ethers.formatEther(creationFeeAmount)} ${tokenSymbol}`);
        console.log(`   🔐 Allowance Needed: ${hasAllowance ? '✅' : '❌'} ${ethers.formatEther(totalNeeded)} ${tokenSymbol}`);
        console.log(`   📊 Overall Eligibility: ${hasMinTokens && hasDepositTokens && hasAllowance ? '✅ Eligible' : '❌ Not Eligible'}`);

        // Check user's voting history
        let userVotingHistory = [];
        for (const proposal of proposalDetails) {
            try {
                const userInvestment = await dao.getUserInvestment(proposal.id, signer.address);
                if (userInvestment.hasVoted) {
                    userVotingHistory.push({
                        proposalId: proposal.id,
                        projectName: proposal.projectName,
                        investment: userInvestment.investment
                    });
                }
            } catch (error) {
                // User hasn't voted on this proposal
            }
        }

        console.log(`\n🗳️  Your Voting History:`);
        if (userVotingHistory.length === 0) {
            console.log(`   📝 No votes cast yet`);
        } else {
            console.log(`   📊 Total Proposals Voted On: ${userVotingHistory.length}`);
            for (const vote of userVotingHistory) {
                console.log(`   • Proposal #${vote.proposalId} "${vote.projectName}": ${ethers.formatEther(vote.investment)} ${tokenSymbol}`);
            }

            const totalInvested = userVotingHistory.reduce((sum, vote) => sum + Number(vote.investment), 0);
            console.log(`   💰 Total Invested: ${ethers.formatEther(totalInvested)} ${tokenSymbol}`);
        }

        // ============= DAO HEALTH METRICS =============
        console.log("\n🏥 DAO HEALTH METRICS");
        console.log("====================");

        const participationRate = totalProposals > 0 ? (totalVoters / Number(totalProposals)) : 0;
        const averageInvestment = totalVoters > 0 ? Number(totalFundsRaised) / totalVoters : 0;

        console.log(`📊 Average Voters per Proposal: ${participationRate.toFixed(1)}`);
        console.log(`💰 Average Investment per Vote: ${ethers.formatEther(averageInvestment)} ${tokenSymbol}`);

        // Success rate
        const successRate = totalProposals > 0 ? (executedProposals / Number(totalProposals)) * 100 : 0;
        console.log(`🎯 Proposal Success Rate: ${successRate.toFixed(1)}%`);

        // Activity level
        if (activeProposals > 0) {
            console.log(`🟢 Activity Level: Active (${activeProposals} ongoing proposals)`);
        } else if (totalProposals > 0) {
            console.log(`🟡 Activity Level: Dormant (no active proposals)`);
        } else {
            console.log(`🔴 Activity Level: Inactive (no proposals created)`);
        }

        console.log("\n✅ DAO Statistics Retrieved Successfully!");

        return {
            totalProposals: Number(totalProposals),
            activeProposals,
            executedProposals,
            expiredProposals,
            totalFundingRequested: ethers.formatEther(totalFundingRequested),
            totalFundsRaised: ethers.formatEther(totalFundsRaised),
            totalVoters,
            userBalance: ethers.formatEther(userBalance),
            userVotingHistory,
            proposalDetails
        };

    } catch (error) {
        console.error("\n❌ Error fetching DAO statistics:", error.message);
        throw error;
    }
}

// Run the stats
getDAOStats()
    .then((stats) => {
        console.log(`\n📈 Statistics export completed!`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Failed to get DAO statistics!");
        process.exit(1);
    });

export { getDAOStats };