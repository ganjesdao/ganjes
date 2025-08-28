import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";

dotenv.config();

async function viewProposal() {
    try {
        // Get proposal ID from environment or prompt user
        let proposalId = process.env.PROPOSAL_ID;
        
        if (!proposalId) {
            console.log("🔍 Ganjes DAO Proposal Viewer");
            console.log("============================\n");
            console.log("❌ No proposal ID provided.");
            console.log("💡 Usage: PROPOSAL_ID=1 npm run view-proposal");
            console.log("📝 Examples:");
            console.log("  PROPOSAL_ID=1 npm run view-proposal");
            console.log("  PROPOSAL_ID=2 npm run view-proposal");
            return;
        }

        const proposalIdNum = parseInt(proposalId);
        if (isNaN(proposalIdNum) || proposalIdNum <= 0) {
            console.error("❌ Invalid proposal ID:", proposalId);
            console.error("💡 Please provide a positive number");
            return;
        }

        console.log(`🔍 Fetching Details for Proposal #${proposalIdNum}`);
        console.log("=".repeat(50));
        
        const [signer] = await ethers.getSigners();
        const daoAddress = process.env.DAO_ADDRESS;
        
        if (!daoAddress) {
            throw new Error("❌ DAO_ADDRESS must be set in .env file");
        }
        
        console.log("📝 Using account:", signer.address);
        console.log("🏛️  DAO Contract:", daoAddress);
        
        const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
        const dao = new ethers.Contract(daoAddress, daoArtifact.abi, signer);
        
        // Check if proposal exists first
        const totalProposals = await dao.getTotalProposals();
        if (proposalIdNum > totalProposals) {
            console.error(`❌ Proposal #${proposalIdNum} does not exist`);
            console.error(`💡 Total proposals: ${totalProposals}`);
            return;
        }

        // Get basic proposal info using the view function
        console.log("\n📋 Fetching proposal information...");
        
        try {
            // Try to get proposal using the contract's view function
            const proposal = await dao.proposals(proposalIdNum);
            
            console.log("\n📋 BASIC INFORMATION");
            console.log("=".repeat(30));
            console.log(`🆔 Proposal ID: #${proposal.id || proposalIdNum}`);
            console.log(`📛 Project Name: ${proposal.projectName || 'N/A'}`);
            console.log(`👤 Proposer: ${proposal.proposer}`);
            console.log(`💰 Funding Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
            console.log(`💵 Proposal Deposit: ${ethers.formatEther(proposal.creationFee)} tokens`);
            
            if (proposal.projectUrl) {
                console.log(`🔗 Project URL: ${proposal.projectUrl}`);
            }
            
            console.log("\n⏰ TIMING INFORMATION");
            console.log("=".repeat(30));
            console.log(`📅 Voting Ends: ${new Date(Number(proposal.endTime) * 1000).toLocaleString()}`);
            
            const currentTime = Math.floor(Date.now() / 1000);
            const timeRemaining = Number(proposal.endTime) - currentTime;
            
            if (timeRemaining > 0) {
                const days = Math.floor(timeRemaining / 86400);
                const hours = Math.floor((timeRemaining % 86400) / 3600);
                const minutes = Math.floor((timeRemaining % 3600) / 60);
                console.log(`⏳ Time Remaining: ${days}d ${hours}h ${minutes}m`);
                console.log(`📊 Status: 🗳️  VOTING ACTIVE`);
            } else {
                console.log(`⏳ Voting Period: ENDED`);
                if (proposal.executed) {
                    console.log(`📊 Status: ${proposal.passed ? '✅ PASSED & FUNDED' : '❌ FAILED'}`);
                } else {
                    console.log(`📊 Status: ⏳ PENDING EXECUTION`);
                }
            }
            
            console.log("\n🗳️  VOTING STATISTICS");
            console.log("=".repeat(30));
            console.log(`👍 Votes FOR: ${ethers.formatEther(proposal.totalVotesFor)} vote weight (${proposal.votersFor} voters)`);
            console.log(`👎 Votes AGAINST: ${ethers.formatEther(proposal.totalVotesAgainst)} vote weight (${proposal.votersAgainst} voters)`);
            
            const totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
            if (totalVotes > 0n) {
                const forPercent = Number((proposal.totalVotesFor * 100n) / totalVotes);
                console.log(`📊 Vote Distribution: ${forPercent.toFixed(1)}% FOR | ${(100 - forPercent).toFixed(1)}% AGAINST`);
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
            
            const fundingMet = proposal.totalInvested >= proposal.fundingGoal;
            console.log(`✅ Funding Goal Met: ${fundingMet ? 'YES' : 'NO'}`);
            
            console.log("\n📊 PROPOSAL STATUS");
            console.log("=".repeat(25));
            console.log(`🏃 Executed: ${proposal.executed ? 'YES' : 'NO'}`);
            
            if (proposal.executed) {
                console.log(`🎯 Passed: ${proposal.passed ? 'YES' : 'NO'}`);
                console.log(`💰 Deposit Refunded: ${proposal.depositRefunded ? 'YES' : 'NO'}`);
            }

            if (proposal.description) {
                console.log("\n📝 DESCRIPTION");
                console.log("=".repeat(20));
                console.log(proposal.description);
            }
            
        } catch (error) {
            console.error("❌ Error fetching proposal details:", error.message);
            console.log("\n💡 This might be due to:");
            console.log("  - Proposal doesn't exist");
            console.log("  - Contract interface mismatch");
            console.log("  - Network connection issues");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

// Run the script
viewProposal()
    .then(() => {
        console.log("\n✅ Proposal view completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Script failed:", error.message);
        process.exit(1);
    });

export default viewProposal;