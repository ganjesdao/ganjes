import { ethers } from "hardhat";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

function formatDateTime(timestamp) {
    return new Date(Number(timestamp) * 1000).toLocaleString();
}

async function getActiveProposals(daoContract) {
    console.log("\\n🔍 Fetching active proposals...");
    
    const proposalCount = await daoContract.getTotalProposals();
    const activeProposals = [];
    
    for (let i = 1; i <= proposalCount; i++) {
        try {
            const proposal = await daoContract.getProposal(i);
            const currentTime = Math.floor(Date.now() / 1000);
            const endTime = Number(proposal[7]); // endTime
            const executed = proposal[8]; // executed
            
            if (!executed && endTime > currentTime) {
                const timeLeft = endTime - currentTime;
                activeProposals.push({
                    id: i,
                    projectName: proposal[3],
                    proposer: proposal[1],
                    endTime: endTime,
                    timeLeft: timeLeft,
                    executed: executed
                });
            }
        } catch (error) {
            console.log(`⚠️  Could not fetch proposal ${i}:`, error.message);
        }
    }
    
    return activeProposals;
}

async function displayActiveProposals(activeProposals) {
    if (activeProposals.length === 0) {
        console.log("\\n❌ No active proposals found!");
        return false;
    }
    
    console.log("\\n📊 ACTIVE PROPOSALS:");
    console.log("=".repeat(80));
    
    activeProposals.forEach(proposal => {
        console.log(`\\n📋 Proposal #${proposal.id}`);
        console.log(`   📛 Project: ${proposal.projectName}`);
        console.log(`   👤 Proposer: ${proposal.proposer.substring(0, 10)}...`);
        console.log(`   ⏰ Ends: ${formatDateTime(proposal.endTime)}`);
        console.log(`   ⏳ Time Left: ${formatTime(proposal.timeLeft)}`);
    });
    
    console.log("\\n" + "=".repeat(80));
    return true;
}

async function extendProposalTime(daoContract, proposalId, extensionTime) {
    console.log(`\\n🔄 Extending proposal #${proposalId} by ${formatTime(extensionTime)}...`);
    
    try {
        const tx = await daoContract.extendProposalVotingTime(proposalId, extensionTime);
        console.log("⏳ Transaction submitted. Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("\\n✅ Proposal voting time extended successfully!");
        console.log(`🔗 Transaction hash: ${receipt.hash}`);
        
        // Get updated proposal info
        const proposal = await daoContract.getProposal(proposalId);
        const newEndTime = Number(proposal[7]);
        console.log(`🕐 New end time: ${formatDateTime(newEndTime)}`);
        
        return true;
    } catch (error) {
        console.log("\\n❌ Failed to extend proposal voting time:");
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function reduceProposalTime(daoContract, proposalId, reductionTime) {
    console.log(`\\n🔄 Reducing proposal #${proposalId} by ${formatTime(reductionTime)}...`);
    
    try {
        const tx = await daoContract.reduceProposalVotingTime(proposalId, reductionTime);
        console.log("⏳ Transaction submitted. Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("\\n✅ Proposal voting time reduced successfully!");
        console.log(`🔗 Transaction hash: ${receipt.hash}`);
        
        // Get updated proposal info
        const proposal = await daoContract.getProposal(proposalId);
        const newEndTime = Number(proposal[7]);
        console.log(`🕐 New end time: ${formatDateTime(newEndTime)}`);
        
        return true;
    } catch (error) {
        console.log("\\n❌ Failed to reduce proposal voting time:");
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function main() {
    try {
        console.log("⏰ Ganjes DAO - Proposal Voting Time Management");
        console.log("=" .repeat(60));
        
        // Connect to the DAO contract
        const [signer] = await ethers.getSigners();
        console.log(`\\n🔑 Admin account: ${signer.address}`);
        
        const daoAddress = process.env.DAO_ADDRESS;
        if (!daoAddress) {
            throw new Error("DAO_ADDRESS not found in .env file");
        }
        
        const daoContract = await ethers.getContractAt("GanjesDAOOptimized", daoAddress, signer);
        console.log(`🏛️  DAO contract: ${daoAddress}`);
        
        // Check if user is admin
        const isAdmin = await daoContract.admins(signer.address);
        if (!isAdmin) {
            console.log("\\n❌ Error: You are not an admin of this DAO!");
            console.log("Only admins can modify proposal voting times.");
            return;
        }
        
        console.log("✅ Admin access confirmed");
        
        // Get active proposals
        const activeProposals = await getActiveProposals(daoContract);
        const hasActiveProposals = await displayActiveProposals(activeProposals);
        
        if (!hasActiveProposals) {
            console.log("\\n💡 Create some proposals first to manage their voting times.");
            return;
        }
        
        // Ask user what they want to do
        console.log("\\n📋 Select an action:");
        console.log("1. Extend proposal voting time");
        console.log("2. Reduce proposal voting time");
        console.log("3. Exit");
        
        const action = await question("\\n🆔 Enter choice (1-3): ");
        
        if (action === "3") {
            console.log("\\n👋 Goodbye!");
            return;
        }
        
        if (action !== "1" && action !== "2") {
            console.log("\\n❌ Invalid choice. Please select 1, 2, or 3.");
            return;
        }
        
        // Get proposal ID
        const proposalIdStr = await question("\\n🆔 Enter Proposal ID: ");
        const proposalId = parseInt(proposalIdStr);
        
        if (isNaN(proposalId) || proposalId <= 0) {
            console.log("\\n❌ Invalid proposal ID. Please enter a positive number.");
            return;
        }
        
        // Check if proposal exists and is active
        const selectedProposal = activeProposals.find(p => p.id === proposalId);
        if (!selectedProposal) {
            console.log("\\n❌ Proposal not found or not active.");
            return;
        }
        
        console.log(`\\n📋 Selected Proposal #${proposalId}: ${selectedProposal.projectName}`);
        console.log(`⏳ Current time left: ${formatTime(selectedProposal.timeLeft)}`);
        
        // Get time change amount
        let timePrompt, timeChangeSeconds;
        
        if (action === "1") {
            console.log("\\n⏰ How much time to add?");
            console.log("Examples: 3600 (1 hour), 7200 (2 hours), 86400 (1 day)");
            const timeStr = await question("🕐 Enter seconds to add: ");
            timeChangeSeconds = parseInt(timeStr);
            
            if (isNaN(timeChangeSeconds) || timeChangeSeconds <= 0) {
                console.log("\\n❌ Invalid time. Please enter a positive number of seconds.");
                return;
            }
            
            console.log(`\\n📊 Extension Summary:`);
            console.log(`   🆔 Proposal: #${proposalId} - ${selectedProposal.projectName}`);
            console.log(`   ➕ Adding: ${formatTime(timeChangeSeconds)}`);
            console.log(`   🕐 Current end: ${formatDateTime(selectedProposal.endTime)}`);
            console.log(`   🕐 New end: ${formatDateTime(selectedProposal.endTime + timeChangeSeconds)}`);
            
            const confirm = await question("\\n❓ Confirm extension? (yes/no): ");
            if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
                console.log("\\n❌ Extension cancelled.");
                return;
            }
            
            await extendProposalTime(daoContract, proposalId, timeChangeSeconds);
            
        } else if (action === "2") {
            console.log("\\n⏰ How much time to reduce?");
            console.log(`⚠️  Current time left: ${formatTime(selectedProposal.timeLeft)}`);
            console.log("Examples: 1800 (30 minutes), 3600 (1 hour)");
            const timeStr = await question("🕐 Enter seconds to reduce: ");
            timeChangeSeconds = parseInt(timeStr);
            
            if (isNaN(timeChangeSeconds) || timeChangeSeconds <= 0) {
                console.log("\\n❌ Invalid time. Please enter a positive number of seconds.");
                return;
            }
            
            // Check if reduction is safe
            const newTimeLeft = selectedProposal.timeLeft - timeChangeSeconds;
            if (newTimeLeft < 60) { // At least 1 minute left
                console.log("\\n❌ Cannot reduce time that much. Would leave less than 1 minute for voting.");
                return;
            }
            
            console.log(`\\n📊 Reduction Summary:`);
            console.log(`   🆔 Proposal: #${proposalId} - ${selectedProposal.projectName}`);
            console.log(`   ➖ Reducing: ${formatTime(timeChangeSeconds)}`);
            console.log(`   🕐 Current end: ${formatDateTime(selectedProposal.endTime)}`);
            console.log(`   🕐 New end: ${formatDateTime(selectedProposal.endTime - timeChangeSeconds)}`);
            console.log(`   ⏳ Time left after: ${formatTime(newTimeLeft)}`);
            
            const confirm = await question("\\n❓ Confirm reduction? (yes/no): ");
            if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
                console.log("\\n❌ Reduction cancelled.");
                return;
            }
            
            await reduceProposalTime(daoContract, proposalId, timeChangeSeconds);
        }
        
    } catch (error) {
        console.error("\\n❌ Error:", error.message);
    } finally {
        rl.close();
    }
}

// Handle environment-based execution
if (process.env.PROPOSAL_ID && process.env.ACTION && process.env.TIME_CHANGE) {
    // Non-interactive mode
    async function envMain() {
        try {
            const proposalId = parseInt(process.env.PROPOSAL_ID);
            const action = process.env.ACTION; // "extend" or "reduce"
            const timeChange = parseInt(process.env.TIME_CHANGE);
            
            const [signer] = await ethers.getSigners();
            const daoContract = await ethers.getContractAt("GanjesDAOOptimized", process.env.DAO_ADDRESS, signer);
            
            console.log(`⏰ Managing proposal #${proposalId} voting time...`);
            
            if (action === "extend") {
                await extendProposalTime(daoContract, proposalId, timeChange);
            } else if (action === "reduce") {
                await reduceProposalTime(daoContract, proposalId, timeChange);
            } else {
                console.log("❌ Invalid ACTION. Use 'extend' or 'reduce'");
            }
        } catch (error) {
            console.error("❌ Error:", error.message);
        }
    }
    
    envMain();
} else {
    // Interactive mode
    main();
}