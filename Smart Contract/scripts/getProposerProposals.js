import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";

dotenv.config();

// Helper functions
function getProposalStatus(proposal, currentTime) {
    if (!proposal.executed) {
        if (currentTime < proposal.endTime) {
            return "🗳️  VOTING ACTIVE";
        } else {
            return "⏳ PENDING EXECUTION";
        }
    } else {
        return proposal.passed ? "✅ PASSED & FUNDED" : "❌ FAILED";
    }
}

function formatTime(timestamp) {
    return new Date(Number(timestamp) * 1000).toLocaleString();
}

function formatVotingProgress(proposal) {
    const totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
    if (totalVotes === 0n) return "No votes yet";
    
    const forPercent = Number((proposal.totalVotesFor * 100n) / totalVotes);
    const againstPercent = 100 - forPercent;
    
    return `${forPercent}% FOR (${proposal.votersFor} voters) | ${againstPercent}% AGAINST (${proposal.votersAgainst} voters)`;
}

function formatFundingProgress(proposal) {
    const fundingPercent = Number((proposal.totalInvested * 100n) / proposal.fundingGoal);
    return `${ethers.formatEther(proposal.totalInvested)} / ${ethers.formatEther(proposal.fundingGoal)} tokens (${Math.min(fundingPercent, 100)}%)`;
}

async function main() {
    // Get proposer address from command line args or environment
    const args = process.argv.slice(2);
    let proposerAddress = args[0] || process.env.PROPOSER_ADDRESS;
    
    console.log("🔍 Get Proposals by Proposer");
    console.log("============================\n");
    
    try {
        const [deployer] = await ethers.getSigners();
        console.log("📝 Connected account:", deployer.address);
        
        const daoAddress = process.env.DAO_ADDRESS;
        console.log("🏛️  DAO Contract:", daoAddress);
        
        const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
        const dao = new ethers.Contract(daoAddress, daoArtifact.abi, deployer);
        
        // Check if function exists
        try {
            await dao.getProposalsIDByProposer.staticCall("0x0000000000000000000000000000000000000001");
            console.log("📋 Contract Version: ✅ Latest (Enhanced)");
        } catch (error) {
            console.log("📋 Contract Version: ⚠️  Legacy");
            console.log("❌ This script requires the enhanced contract with getProposalsIDByProposer function");
            console.log("💡 Please deploy the updated contract first: npm run deploy:optimized");
            return;
        }
        
        // Use current address if no proposer address provided
        if (!proposerAddress) {
            proposerAddress = deployer.address;
            console.log("📝 Using your address as proposer");
        } else if (!ethers.isAddress(proposerAddress)) {
            console.log("❌ Invalid address provided, using your address instead");
            proposerAddress = deployer.address;
        }
        
        console.log(`\n👤 Getting proposals for: ${proposerAddress}`);
        
        // Get proposal IDs for the proposer
        const proposalIds = await dao.getProposalsIDByProposer(proposerAddress);
        console.log(`📊 Found ${proposalIds.length} proposals\n`);
        
        if (proposalIds.length === 0) {
            console.log("📝 No proposals found for this address");
            
            // Check total proposals in DAO
            const totalProposals = await dao.getTotalProposals();
            console.log(`📊 Total proposals in DAO: ${totalProposals}`);
            
            if (totalProposals > 0) {
                console.log("💡 There are proposals in the DAO, but none from this address");
            }
            console.log("💡 Create a proposal with: npm run create-proposal");
            return;
        }
        
        // Get additional stats
        const proposalCount = await dao.getProposalCountByUser(proposerAddress);
        const totalProposals = await dao.getTotalProposals();
        const cooldownTime = await dao.getTimeUntilNextProposal(proposerAddress);
        
        console.log("📈 Proposer Statistics:");
        console.log(`  - Total Proposals: ${proposalCount} / 10 max`);
        console.log(`  - Proposals in DAO: ${proposalIds.length} / ${totalProposals} total`);
        if (cooldownTime > 0) {
            console.log(`  - Next Proposal: ${Math.ceil(Number(cooldownTime) / 60)} minutes`);
        } else {
            console.log("  - Next Proposal: ✅ Ready now");
        }
        
        console.log("\n" + "=".repeat(80));
        console.log("📋 PROPOSAL DETAILS");
        console.log("=".repeat(80));
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Fetch and display details for each proposal
        for (let i = 0; i < proposalIds.length; i++) {
            const proposalId = proposalIds[i];
            console.log(`\n🔹 Proposal #${proposalId} (${i + 1}/${proposalIds.length})`);
            console.log("-".repeat(40));
            
            try {
                const proposal = await dao.getProposal(proposalId);
                const status = getProposalStatus(proposal, currentTime);
                
                // Display formatted information
                console.log(`📝 Project: ${proposal.projectName}`);
                console.log(`🌐 URL: ${proposal.projectUrl}`);
                console.log(`💰 Funding Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
                console.log(`📊 Status: ${status}`);
                console.log(`⏰ Voting Ends: ${formatTime(proposal.endTime)}`);
                console.log(`💵 Deposit: ${ethers.formatEther(proposal.creationFee)} tokens (${proposal.depositRefunded ? 'Refunded' : 'Locked'})`);
                
                console.log(`\n🗳️  Voting Results:`);
                console.log(`   ${formatVotingProgress(proposal)}`);
                
                console.log(`💸 Funding Progress:`);
                console.log(`   ${formatFundingProgress(proposal)}`);
                
                if (proposal.description.length > 0) {
                    const shortDesc = proposal.description.length > 150 
                        ? proposal.description.substring(0, 150) + "..." 
                        : proposal.description;
                    console.log(`📄 Description: ${shortDesc}`);
                }
                
                // Show actions available
                if (!proposal.executed && currentTime < proposal.endTime) {
                    console.log(`\n💡 Actions Available:`);
                    console.log(`   - Vote: npm run vote-proposal ${proposalId}`);
                    console.log(`   - View details: npm run view-proposal ${proposalId}`);
                } else if (!proposal.executed && currentTime >= proposal.endTime) {
                    console.log(`\n⚠️  Proposal ready for execution by admin`);
                }
                
            } catch (error) {
                console.log(`❌ Error fetching proposal ${proposalId}: ${error.message}`);
            }
        }
        
        console.log("\n" + "=".repeat(80));
        console.log("💡 QUICK COMMANDS");
        console.log("=".repeat(80));
        console.log(`- Create new proposal: npm run create-proposal`);
        console.log(`- View all proposals: npm run get-proposals`);
        console.log(`- Check DAO stats: npm run dao-stats`);
        
        console.log("\n✅ Successfully retrieved proposals!");
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        
        if (error.message.includes("getProposalsIDByProposer")) {
            console.error("💡 Deploy updated contract: npm run deploy:optimized");
        }
        
        process.exit(1);
    }
}

main().catch(console.error);