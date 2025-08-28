import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";

dotenv.config();

async function getProposalDetails(proposalId) {
    try {
        console.log(`🔍 Fetching Details for Proposal #${proposalId}`);
        console.log("=".repeat(50));
        
        const [signer] = await ethers.getSigners();
        const daoAddress = process.env.DAO_ADDRESS;
        
        if (!daoAddress) {
            throw new Error("❌ DAO_ADDRESS must be set in .env file");
        }
        
        const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
        const dao = new ethers.Contract(daoAddress, daoArtifact.abi, signer);
        
        // Get proposal details
        const proposal = await dao.getProposal(proposalId);
        const currentTime = Math.floor(Date.now() / 1000);
        
        console.log("\n📋 BASIC INFORMATION");
        console.log("=".repeat(30));
        console.log(`🆔 Proposal ID: #${proposal.id}`);
        console.log(`📛 Project Name: ${proposal.projectName}`);
        console.log(`👤 Proposer: ${proposal.proposer}`);
        console.log(`🔗 Project URL: ${proposal.projectUrl}`);
        console.log(`💰 Funding Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
        console.log(`💵 Proposal Deposit: ${ethers.formatEther(proposal.creationFee)} tokens`);
        
        console.log("\n📝 DESCRIPTION");
        console.log("=".repeat(20));
        console.log(proposal.description);
        
        console.log("\n⏰ TIMING INFORMATION");
        console.log("=".repeat(30));
        console.log(`📅 Voting Ends: ${new Date(Number(proposal.endTime) * 1000).toLocaleString()}`);
        
        const timeRemaining = Number(proposal.endTime) - currentTime;
        if (timeRemaining > 0) {
            const days = Math.floor(timeRemaining / 86400);
            const hours = Math.floor((timeRemaining % 86400) / 3600);
            const minutes = Math.floor((timeRemaining % 3600) / 60);
            console.log(`⏳ Time Remaining: ${days}d ${hours}h ${minutes}m`);
        } else {
            console.log(`⏳ Voting Period: ENDED`);
        }
        
        console.log("\n🗳️  VOTING STATISTICS");
        console.log("=".repeat(30));
        console.log(`👍 Votes FOR: ${ethers.formatEther(proposal.totalVotesFor)} vote weight (${proposal.votersFor} voters)`);
        console.log(`👎 Votes AGAINST: ${ethers.formatEther(proposal.totalVotesAgainst)} vote weight (${proposal.votersAgainst} voters)`);
        
        const totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
        if (totalVotes > 0n) {
            const forPercent = Number((proposal.totalVotesFor * 100n) / totalVotes);
            const againstPercent = 100 - forPercent;
            console.log(`📊 Vote Distribution: ${forPercent.toFixed(1)}% FOR | ${againstPercent.toFixed(1)}% AGAINST`);
        } else {
            console.log(`📊 Vote Distribution: No votes yet`);
        }
        
        console.log("\n💸 FUNDING INFORMATION");
        console.log("=".repeat(30));
        console.log(`💰 Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
        console.log(`📈 Invested: ${ethers.formatEther(proposal.totalInvested)} tokens`);
        
        const fundingPercent = proposal.fundingGoal > 0n ? 
            Number((proposal.totalInvested * 100n) / proposal.fundingGoal) : 0;
        console.log(`📊 Funding Progress: ${Math.min(fundingPercent, 100).toFixed(1)}%`);
        
        // Calculate funding status
        const fundingMet = proposal.totalInvested >= proposal.fundingGoal;
        console.log(`✅ Funding Goal Met: ${fundingMet ? 'YES' : 'NO'}`);
        
        console.log("\n📊 PROPOSAL STATUS");
        console.log("=".repeat(25));
        console.log(`🏃 Executed: ${proposal.executed ? 'YES' : 'NO'}`);
        
        if (proposal.executed) {
            console.log(`🎯 Passed: ${proposal.passed ? 'YES' : 'NO'}`);
            console.log(`💰 Deposit Refunded: ${proposal.depositRefunded ? 'YES' : 'NO'}`);
            
            if (proposal.passed) {
                console.log(`✅ STATUS: PROPOSAL PASSED & FUNDED`);
                console.log(`💸 Funds Distributed: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
            } else {
                console.log(`❌ STATUS: PROPOSAL FAILED`);
                console.log(`💰 Refunds Available: ${ethers.formatEther(proposal.totalInvested)} tokens`);
            }
        } else {
            if (timeRemaining > 0) {
                console.log(`🗳️  STATUS: VOTING ACTIVE`);
            } else {
                console.log(`⏳ STATUS: PENDING EXECUTION`);
            }
        }
        
        // Get user's investment in this proposal (if any)
        try {
            const userInvestment = await dao.getUserInvestment(proposalId, signer.address);
            
            if (userInvestment.investment > 0n) {
                console.log("\n👤 YOUR PARTICIPATION");
                console.log("=".repeat(25));
                console.log(`💰 Your Investment: ${ethers.formatEther(userInvestment.investment)} tokens`);
                console.log(`🗳️  Voted: ${userInvestment.hasVoted ? 'YES' : 'NO'}`);
                
                if (userInvestment.hasVoted) {
                    console.log(`📅 Vote Time: ${new Date(Number(userInvestment.voteTime) * 1000).toLocaleString()}`);
                }
                
                // Show refund eligibility
                if (proposal.executed && !proposal.passed && userInvestment.investment > 0n) {
                    console.log(`💸 Refund Available: ${ethers.formatEther(userInvestment.investment)} tokens`);
                    console.log(`💡 Use claimRefund() to get your tokens back`);
                }
            }
        } catch (error) {
            // User hasn't invested, which is fine
        }
        
        console.log("\n🔧 TECHNICAL DETAILS");
        console.log("=".repeat(25));
        console.log(`🆔 Proposal ID: ${proposal.id}`);
        console.log(`⏰ End Timestamp: ${proposal.endTime}`);
        console.log(`🏛️  DAO Contract: ${daoAddress}`);
        
        return {
            id: proposal.id.toString(),
            projectName: proposal.projectName,
            proposer: proposal.proposer,
            description: proposal.description,
            projectUrl: proposal.projectUrl,
            fundingGoal: proposal.fundingGoal,
            totalInvested: proposal.totalInvested,
            totalVotesFor: proposal.totalVotesFor,
            totalVotesAgainst: proposal.totalVotesAgainst,
            votersFor: proposal.votersFor,
            votersAgainst: proposal.votersAgainst,
            endTime: proposal.endTime,
            executed: proposal.executed,
            passed: proposal.passed,
            depositRefunded: proposal.depositRefunded,
            timeRemaining: Math.max(0, timeRemaining),
            fundingMet,
            fundingPercent
        };
        
    } catch (error) {
        console.error("❌ Error fetching proposal details:", error.message);
        
        if (error.code === 'CALL_EXCEPTION') {
            console.error("💡 This might be due to:");
            console.error("  - Invalid proposal ID");
            console.error("  - Proposal doesn't exist");
            console.error("  - Network connection issues");
        }
        
        throw error;
    }
}

// CLI interface
async function main() {
    // Check for environment variable first (for Hardhat)
    let proposalId = process.env.PROPOSAL_ID;
    
    // If not provided via env, check command line args
    if (!proposalId) {
        const args = process.argv.slice(2);
        
        if (args.length === 0 || args[0] === '--help') {
            console.log("🔍 Ganjes DAO Proposal Details Viewer");
            console.log("====================================\n");
            console.log("📋 Usage:");
            console.log("  PROPOSAL_ID=1 npm run get-proposal-details");
            console.log("  node scripts/getProposalDetails.js <proposal_id>\n");
            console.log("📝 Examples:");
            console.log("  PROPOSAL_ID=1 npm run get-proposal-details");
            console.log("  PROPOSAL_ID=5 npm run get-proposal-details");
            console.log("  node scripts/getProposalDetails.js 1");
            return;
        }
        
        proposalId = args[0];
    }
    
    const proposalIdNum = parseInt(proposalId);
    
    if (isNaN(proposalIdNum) || proposalIdNum <= 0) {
        console.error("❌ Invalid proposal ID. Please provide a positive number.");
        console.error("💡 Usage: PROPOSAL_ID=1 npm run get-proposal-details");
        process.exit(1);
    }
    
    await getProposalDetails(proposalIdNum);
}

// Export for use in other scripts
export { getProposalDetails };

// Run the script
main()
    .then(() => {
        console.log("\n✅ Proposal details fetch completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Script failed:", error.message);
        process.exit(1);
    });