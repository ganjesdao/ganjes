import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

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

async function checkContractVersion(dao) {
    try {
        await dao.getProposalsIDByProposer.staticCall("0x0000000000000000000000000000000000000001");
        return "latest";
    } catch (error) {
        return "legacy";
    }
}

async function getProposalsByProposer(proposerAddress = null) {
    try {
        console.log("🔍 Get Proposals by Proposer");
        console.log("============================\n");
        
        const [deployer] = await ethers.getSigners();
        console.log("📝 Connected account:", deployer.address);
        
        const daoAddress = process.env.DAO_ADDRESS;
        const tokenAddress = process.env.TOKEN_ADDRESS;
        
        if (!daoAddress || !tokenAddress) {
            throw new Error("❌ DAO_ADDRESS and TOKEN_ADDRESS must be set in .env file");
        }
        
        console.log("🏛️  DAO Contract:", daoAddress);
        console.log("💰 Token Contract:", tokenAddress);
        
        const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
        const dao = new ethers.Contract(daoAddress, daoArtifact.abi, deployer);
        
        // Check contract version
        const contractVersion = await checkContractVersion(dao);
        console.log("📋 Contract Version:", contractVersion === "latest" ? "✅ Latest (Enhanced)" : "⚠️  Legacy");
        
        if (contractVersion === "legacy") {
            console.log("❌ This script requires the enhanced contract with getProposalsIDByProposer function");
            console.log("💡 Please deploy the updated contract first: npm run deploy:optimized");
            return;
        }
        
        // Get proposer address
        let targetProposer = proposerAddress;
        if (!targetProposer) {
            console.log("\n🎯 Choose proposer address:");
            console.log("1. Use your current address");
            console.log("2. Enter custom address");
            
            const choice = await askQuestion("Select option (1/2): ").catch(() => "1");
            
            if (choice === "1" || choice === "" || !choice) {
                targetProposer = deployer.address;
            } else if (choice === "2") {
                targetProposer = await askQuestion("Enter proposer address: ").catch(() => deployer.address);
                
                // Validate address
                if (!targetProposer || !ethers.isAddress(targetProposer)) {
                    console.log("⚠️  Invalid address, using your address instead");
                    targetProposer = deployer.address;
                }
            } else {
                console.log("⚠️  Invalid choice, using your address");
                targetProposer = deployer.address;
            }
        }
        
        console.log(`\n👤 Getting proposals for: ${targetProposer}`);
        
        // Get proposal IDs for the proposer
        const proposalIds = await dao.getProposalsIDByProposer(targetProposer);
        console.log(`📊 Found ${proposalIds.length} proposals\n`);
        
        if (proposalIds.length === 0) {
            console.log("📝 No proposals found for this address");
            console.log("💡 Create your first proposal with: npm run create-proposal");
            return { proposer: targetProposer, proposals: [] };
        }
        
        // Get additional stats
        const proposalCount = await dao.getProposalCountByUser(targetProposer);
        const totalProposals = await dao.getTotalProposals();
        const cooldownTime = await dao.getTimeUntilNextProposal(targetProposer);
        
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
        const proposalDetails = [];
        
        // Fetch and display details for each proposal
        for (let i = 0; i < proposalIds.length; i++) {
            const proposalId = proposalIds[i];
            console.log(`\n🔹 Proposal #${proposalId} (${i + 1}/${proposalIds.length})`);
            console.log("-".repeat(40));
            
            try {
                const proposal = await dao.getProposal(proposalId);
                const status = getProposalStatus(proposal, currentTime);
                
                const details = {
                    id: proposal.id.toString(),
                    proposer: proposal.proposer,
                    projectName: proposal.projectName,
                    description: proposal.description,
                    projectUrl: proposal.projectUrl,
                    fundingGoal: ethers.formatEther(proposal.fundingGoal),
                    deposit: ethers.formatEther(proposal.creationFee),
                    endTime: formatTime(proposal.endTime),
                    executed: proposal.executed,
                    passed: proposal.passed,
                    depositRefunded: proposal.depositRefunded,
                    totalVotesFor: proposal.totalVotesFor.toString(),
                    totalVotesAgainst: proposal.totalVotesAgainst.toString(),
                    totalInvested: ethers.formatEther(proposal.totalInvested),
                    votersFor: proposal.votersFor,
                    votersAgainst: proposal.votersAgainst,
                    status: status,
                    votingProgress: formatVotingProgress(proposal),
                    fundingProgress: formatFundingProgress(proposal)
                };
                
                proposalDetails.push(details);
                
                // Display formatted information
                console.log(`📝 Project: ${details.projectName}`);
                console.log(`🌐 URL: ${details.projectUrl}`);
                console.log(`💰 Funding Goal: ${details.fundingGoal} tokens`);
                console.log(`📊 Status: ${status}`);
                console.log(`⏰ Voting Ends: ${details.endTime}`);
                console.log(`💵 Deposit: ${details.deposit} tokens (${details.depositRefunded ? 'Refunded' : 'Locked'})`);
                
                console.log(`\n🗳️  Voting Results:`);
                console.log(`   ${details.votingProgress}`);
                
                console.log(`💸 Funding Progress:`);
                console.log(`   ${details.fundingProgress}`);
                
                if (details.description.length > 0) {
                    const shortDesc = details.description.length > 150 
                        ? details.description.substring(0, 150) + "..." 
                        : details.description;
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
                proposalDetails.push({
                    id: proposalId.toString(),
                    error: error.message
                });
            }
        }
        
        // Summary
        console.log("\n" + "=".repeat(80));
        console.log("📊 SUMMARY");
        console.log("=".repeat(80));
        
        const activeProposals = proposalDetails.filter(p => !p.executed && currentTime < Number(p.endTime)).length;
        const passedProposals = proposalDetails.filter(p => p.passed).length;
        const failedProposals = proposalDetails.filter(p => p.executed && !p.passed).length;
        
        console.log(`📈 Proposal Statistics:`);
        console.log(`   - Total: ${proposalDetails.length}`);
        console.log(`   - Active: ${activeProposals}`);
        console.log(`   - Passed: ${passedProposals}`);
        console.log(`   - Failed: ${failedProposals}`);
        
        const totalFunding = proposalDetails
            .filter(p => p.passed)
            .reduce((sum, p) => sum + parseFloat(p.fundingGoal || 0), 0);
        
        console.log(`💰 Funding Statistics:`);
        console.log(`   - Total Funded: ${totalFunding.toFixed(2)} tokens`);
        
        console.log(`\n💡 Quick Commands:`);
        console.log(`   - Create new proposal: npm run create-proposal`);
        console.log(`   - View all proposals: npm run get-proposals`);
        console.log(`   - Check DAO stats: npm run dao-stats`);
        
        return {
            proposer: targetProposer,
            proposals: proposalDetails,
            stats: {
                total: proposalDetails.length,
                active: activeProposals,
                passed: passedProposals,
                failed: failedProposals,
                totalFunding: totalFunding
            }
        };
        
    } catch (error) {
        console.error("\n❌ Error getting proposals:", error.message);
        
        if (error.message.includes("getProposalsIDByProposer")) {
            console.error("\n💡 This function requires the updated contract.");
            console.error("   Deploy with: npm run deploy:optimized");
        }
        
        throw error;
    } finally {
        rl.close();
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
let proposerAddress = null;

if (args.length > 0) {
    if (args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
        console.log("🔍 Get Proposals by Proposer - Help");
        console.log("===================================\n");
        
        console.log("📖 Description:");
        console.log("   Get all proposal IDs for a specific proposer and display detailed information\n");
        
        console.log("⚡ Usage:");
        console.log("   npm run get-proposals-by-proposer                    # Interactive mode");
        console.log("   npm run get-proposals-by-proposer <address>          # Specific address");
        console.log("   npm run get-proposals-by-proposer help               # Show this help\n");
        
        console.log("📋 Examples:");
        console.log("   npm run get-proposals-by-proposer 0x123...          # Get proposals for address");
        console.log("   npm run get-proposals-by-proposer                    # Choose interactively\n");
        
        console.log("🎯 Features:");
        console.log("   - Lists all proposal IDs for a proposer");
        console.log("   - Shows detailed information for each proposal");
        console.log("   - Displays voting and funding progress");
        console.log("   - Provides quick action commands");
        console.log("   - Shows proposer statistics and summaries");
        
        process.exit(0);
    } else if (ethers.isAddress(args[0])) {
        proposerAddress = args[0];
    } else {
        console.error("❌ Invalid address provided");
        process.exit(1);
    }
}

// Run the script
getProposalsByProposer(proposerAddress)
    .then((result) => {
        if (result) {
            console.log("\n✅ Successfully retrieved proposals for proposer!");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Failed to get proposals:", error.message);
        process.exit(1);
    });

export default getProposalsByProposer;