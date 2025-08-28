import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";

dotenv.config();

// Helper function to format proposal status
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

// Helper function to format time
function formatTime(timestamp) {
    return new Date(Number(timestamp) * 1000).toLocaleString();
}

// Helper function to format voting progress
function formatVotingProgress(proposal) {
    const totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
    if (totalVotes === 0n) return "No votes yet";
    
    const forPercent = Number((proposal.totalVotesFor * 100n) / totalVotes);
    const againstPercent = 100 - forPercent;
    
    return `${forPercent}% FOR (${proposal.votersFor} voters) | ${againstPercent}% AGAINST (${proposal.votersAgainst} voters)`;
}

// Helper function to format funding progress
function formatFundingProgress(proposal) {
    const fundingPercent = Number((proposal.totalInvested * 100n) / proposal.fundingGoal);
    return `${ethers.formatEther(proposal.totalInvested)} / ${ethers.formatEther(proposal.fundingGoal)} tokens (${Math.min(fundingPercent, 100)}%)`;
}

async function getAllProposals(options = {}) {
    try {
        console.log("🏛️  Fetching All Proposals from Ganjes DAO");
        console.log("==========================================\n");
        
        const [signer] = await ethers.getSigners();
        console.log("📝 Using account:", signer.address);
        
        const daoAddress = process.env.DAO_ADDRESS;
        if (!daoAddress) {
            throw new Error("❌ DAO_ADDRESS must be set in .env file");
        }
        
        console.log("🏛️  DAO Contract:", daoAddress);
        
        const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
        const dao = new ethers.Contract(daoAddress, daoArtifact.abi, signer);
        
        // Get total number of proposals
        const totalProposals = await dao.getTotalProposals();
        console.log("📊 Total Proposals:", totalProposals.toString());
        
        if (totalProposals === 0n) {
            console.log("📝 No proposals found in the DAO.");
            return [];
        }
        
        // Get all proposal IDs
        const allProposalIds = await dao.getAllProposalIds();
        console.log("🔍 Found", allProposalIds.length, "proposal(s)\n");
        
        const currentTime = Math.floor(Date.now() / 1000);
        const proposals = [];
        
        console.log("📋 Fetching detailed information for each proposal...\n");
        
        // Fetch details for each proposal
        for (let i = 0; i < allProposalIds.length; i++) {
            const proposalId = allProposalIds[i];
            
            try {
                console.log(`📄 Processing Proposal #${proposalId}...`);
                
                // Get comprehensive proposal info
                const proposalInfo = await dao.getProposal(proposalId);
                
                const proposal = {
                    id: proposalInfo.id.toString(),
                    proposer: proposalInfo.proposer,
                    projectName: proposalInfo.projectName,
                    description: proposalInfo.description,
                    projectUrl: proposalInfo.projectUrl,
                    fundingGoal: proposalInfo.fundingGoal,
                    creationFee: proposalInfo.creationFee,
                    endTime: proposalInfo.endTime,
                    executed: proposalInfo.executed,
                    passed: proposalInfo.passed,
                    depositRefunded: proposalInfo.depositRefunded,
                    totalVotesFor: proposalInfo.totalVotesFor,
                    totalVotesAgainst: proposalInfo.totalVotesAgainst,
                    totalInvested: proposalInfo.totalInvested,
                    votersFor: proposalInfo.votersFor,
                    votersAgainst: proposalInfo.votersAgainst,
                    status: getProposalStatus(proposalInfo, currentTime),
                    timeRemaining: proposalInfo.endTime > currentTime ? 
                        Number(proposalInfo.endTime) - currentTime : 0
                };
                
                proposals.push(proposal);
                
            } catch (error) {
                console.error(`❌ Error fetching proposal #${proposalId}:`, error.message);
            }
        }
        
        // Apply filters if specified
        let filteredProposals = proposals;
        
        if (options.status) {
            filteredProposals = proposals.filter(p => 
                p.status.toLowerCase().includes(options.status.toLowerCase())
            );
        }
        
        if (options.proposer) {
            filteredProposals = proposals.filter(p => 
                p.proposer.toLowerCase() === options.proposer.toLowerCase()
            );
        }
        
        if (options.minFunding) {
            const minFundingWei = ethers.parseEther(options.minFunding.toString());
            filteredProposals = proposals.filter(p => p.fundingGoal >= minFundingWei);
        }
        
        // Sort proposals
        if (options.sortBy === 'funding') {
            filteredProposals.sort((a, b) => Number(b.fundingGoal - a.fundingGoal));
        } else if (options.sortBy === 'votes') {
            filteredProposals.sort((a, b) => Number((b.totalVotesFor + b.totalVotesAgainst) - (a.totalVotesFor + a.totalVotesAgainst)));
        } else if (options.sortBy === 'recent') {
            filteredProposals.sort((a, b) => Number(b.endTime - a.endTime));
        } else {
            // Default: sort by ID (newest first)
            filteredProposals.sort((a, b) => Number(b.id) - Number(a.id));
        }
        
        // Display results
        console.log("=".repeat(80));
        console.log(`📊 PROPOSAL SUMMARY (${filteredProposals.length} shown)`);
        console.log("=".repeat(80));
        
        if (filteredProposals.length === 0) {
            console.log("📝 No proposals match the specified criteria.");
            return [];
        }
        
        filteredProposals.forEach((proposal, index) => {
            console.log(`\n🏷️  PROPOSAL #${proposal.id}`);
            console.log("=" * 50);
            console.log(`📋 Project Name: ${proposal.projectName}`);
            console.log(`👤 Proposer: ${proposal.proposer}`);
            console.log(`💰 Funding Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
            console.log(`💵 Deposit: ${ethers.formatEther(proposal.creationFee)} tokens`);
            console.log(`📅 Voting Ends: ${formatTime(proposal.endTime)}`);
            console.log(`📊 Status: ${proposal.status}`);
            
            if (proposal.timeRemaining > 0) {
                const hours = Math.floor(proposal.timeRemaining / 3600);
                const minutes = Math.floor((proposal.timeRemaining % 3600) / 60);
                console.log(`⏰ Time Remaining: ${hours}h ${minutes}m`);
            }
            
            console.log(`🗳️  Voting: ${formatVotingProgress(proposal)}`);
            console.log(`💸 Funding: ${formatFundingProgress(proposal)}`);
            console.log(`🔗 Project URL: ${proposal.projectUrl}`);
            
            if (options.showDescription) {
                console.log(`📝 Description: ${proposal.description.substring(0, 200)}${proposal.description.length > 200 ? '...' : ''}`);
            }
            
            console.log(`✅ Executed: ${proposal.executed ? 'Yes' : 'No'}`);
            if (proposal.executed) {
                console.log(`🎯 Passed: ${proposal.passed ? 'Yes' : 'No'}`);
                console.log(`💰 Deposit Refunded: ${proposal.depositRefunded ? 'Yes' : 'No'}`);
            }
        });
        
        // Summary statistics
        console.log("\n" + "=".repeat(80));
        console.log("📈 STATISTICS");
        console.log("=".repeat(80));
        
        const totalFundingRequested = filteredProposals.reduce((sum, p) => sum + p.fundingGoal, 0n);
        const totalFundingReceived = filteredProposals.filter(p => p.passed).reduce((sum, p) => sum + p.fundingGoal, 0n);
        const totalInvested = filteredProposals.reduce((sum, p) => sum + p.totalInvested, 0n);
        
        const activeProposals = filteredProposals.filter(p => p.status.includes("VOTING ACTIVE")).length;
        const passedProposals = filteredProposals.filter(p => p.passed).length;
        const failedProposals = filteredProposals.filter(p => p.executed && !p.passed).length;
        const pendingProposals = filteredProposals.filter(p => p.status.includes("PENDING")).length;
        
        console.log(`📊 Total Proposals: ${filteredProposals.length}`);
        console.log(`🗳️  Active Voting: ${activeProposals}`);
        console.log(`⏳ Pending Execution: ${pendingProposals}`);
        console.log(`✅ Passed: ${passedProposals}`);
        console.log(`❌ Failed: ${failedProposals}`);
        console.log(`💰 Total Funding Requested: ${ethers.formatEther(totalFundingRequested)} tokens`);
        console.log(`💸 Total Funding Distributed: ${ethers.formatEther(totalFundingReceived)} tokens`);
        console.log(`📈 Total Community Investment: ${ethers.formatEther(totalInvested)} tokens`);
        
        if (filteredProposals.length > 0) {
            const avgFunding = totalFundingRequested / BigInt(filteredProposals.length);
            console.log(`📊 Average Funding Request: ${ethers.formatEther(avgFunding)} tokens`);
            
            const successRate = passedProposals / Math.max(passedProposals + failedProposals, 1) * 100;
            console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
        }
        
        console.log("\n✅ Proposal fetch completed successfully!");
        
        return filteredProposals;
        
    } catch (error) {
        console.error("❌ Error fetching proposals:", error.message);
        
        if (error.code === 'CALL_EXCEPTION') {
            console.error("💡 This might be due to:");
            console.error("  - Incorrect DAO contract address");
            console.error("  - Network connection issues");
            console.error("  - Contract not deployed on this network");
        }
        
        throw error;
    }
}

// CLI argument parsing
async function main() {
    const args = process.argv.slice(2);
    const options = {};
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--status' && i + 1 < args.length) {
            options.status = args[i + 1];
            i++;
        } else if (arg === '--proposer' && i + 1 < args.length) {
            options.proposer = args[i + 1];
            i++;
        } else if (arg === '--min-funding' && i + 1 < args.length) {
            options.minFunding = parseFloat(args[i + 1]);
            i++;
        } else if (arg === '--sort' && i + 1 < args.length) {
            options.sortBy = args[i + 1];
            i++;
        } else if (arg === '--show-description') {
            options.showDescription = true;
        } else if (arg === '--help') {
            showHelp();
            return;
        }
    }
    
    await getAllProposals(options);
}

function showHelp() {
    console.log("🏛️  Ganjes DAO Proposal Fetcher");
    console.log("================================\n");
    
    console.log("📋 Usage:");
    console.log("  npm run get-proposals [options]\n");
    
    console.log("🔧 Options:");
    console.log("  --status <status>        Filter by status (active, pending, passed, failed)");
    console.log("  --proposer <address>     Filter by proposer address");
    console.log("  --min-funding <amount>   Filter by minimum funding amount (in tokens)");
    console.log("  --sort <field>           Sort by: funding, votes, recent, id (default)");
    console.log("  --show-description       Include full proposal descriptions");
    console.log("  --help                   Show this help message\n");
    
    console.log("📝 Examples:");
    console.log("  npm run get-proposals");
    console.log("  npm run get-proposals -- --status active");
    console.log("  npm run get-proposals -- --proposer 0x123...abc");
    console.log("  npm run get-proposals -- --min-funding 100 --sort funding");
    console.log("  npm run get-proposals -- --show-description --sort recent");
}

// Export for use in other scripts
export { getAllProposals };

// Run the script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error.message);
        process.exit(1);
    });