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

async function checkContractVersion(dao) {
    try {
        // Test if new functions are available
        await dao.getProposalsIDByProposer.staticCall("0x0000000000000000000000000000000000000001");
        await dao.checkProposalRequirements.staticCall("0x0000000000000000000000000000000000000001");
        return "latest";
    } catch (error) {
        return "legacy";
    }
}

async function validateInputs(description, projectName, projectUrl, fundingGoal) {
    const errors = [];
    
    if (!description || description.trim().length < 10) {
        errors.push("Description must be at least 10 characters long");
    }
    
    if (!projectName || projectName.trim().length < 2) {
        errors.push("Project name must be at least 2 characters long");
    }
    
    if (!projectUrl || !projectUrl.includes('.')) {
        errors.push("Project URL must be a valid URL");
    }
    
    const fundingGoalNum = parseFloat(fundingGoal);
    if (isNaN(fundingGoalNum) || fundingGoalNum <= 0) {
        errors.push("Funding goal must be a positive number");
    }
    
    if (fundingGoalNum < 10) {
        errors.push("Funding goal must be at least 10 tokens");
    }
    
    if (fundingGoalNum > 1000000) {
        errors.push("Funding goal cannot exceed 1,000,000 tokens");
    }
    
    return errors;
}

async function createProposal() {
    try {
        console.log("🚀 Ganjes DAO Proposal Creation Tool");
        console.log("=====================================\n");
        
        const [deployer] = await ethers.getSigners();
        console.log("📝 Using account:", deployer.address);
        
        const daoAddress = process.env.DAO_ADDRESS;
        const tokenAddress = process.env.TOKEN_ADDRESS;
        
        if (!daoAddress || !tokenAddress) {
            throw new Error("❌ DAO_ADDRESS and TOKEN_ADDRESS must be set in .env file");
        }
        
        console.log("🏛️  DAO Contract:", daoAddress);
        console.log("💰 Token Contract:", tokenAddress);
        
        const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
        const tokenArtifact = await artifacts.readArtifact("SimpleToken");
        
        const dao = new ethers.Contract(daoAddress, daoArtifact.abi, deployer);
        const token = new ethers.Contract(tokenAddress, tokenArtifact.abi, deployer);
        
        // Check contract version
        const contractVersion = await checkContractVersion(dao);
        console.log("📋 Contract Version:", contractVersion === "latest" ? "✅ Latest (Enhanced)" : "⚠️  Legacy");
        
        const userBalance = await token.balanceOf(deployer.address);
        const creationFee = await dao.PROPOSAL_CREATION_FEE();
        const minTokens = await dao.MIN_TOKENS_FOR_PROPOSAL();
        
        // Get user's existing proposals (with fallback for older contracts)
        let userProposals = [];
        let userProposalCount = 0;
        let cooldownTime = 0;
        
        if (contractVersion === "latest") {
            userProposals = await dao.getProposalsIDByProposer(deployer.address);
            userProposalCount = await dao.getProposalCountByUser(deployer.address);
            cooldownTime = await dao.getTimeUntilNextProposal(deployer.address);
        }
        
        console.log("\n💳 Account Status:");
        console.log("  - Token Balance:", ethers.formatEther(userBalance), "tokens");
        console.log("  - Creation Fee (non-refundable):", ethers.formatEther(creationFee), "tokens");
        console.log("  - Min Tokens Required:", ethers.formatEther(minTokens), "tokens");
        
        if (contractVersion === "latest") {
            console.log("  - Your Proposals:", userProposalCount.toString(), "/ 10 max");
            console.log("  - Existing Proposal IDs:", userProposals.length > 0 ? userProposals.map(id => id.toString()).join(", ") : "None");
            if (cooldownTime > 0) {
                console.log("  - Cooldown Remaining:", Math.ceil(Number(cooldownTime) / 60), "minutes");
            }
        }
        
        if (contractVersion === "latest") {
            const requirements = await dao.checkProposalRequirements(deployer.address);
            console.log("\n📋 Proposal Requirements:");
            console.log("  - Can Create Proposal:", requirements.canCreateProposal ? "✅" : "❌");
            console.log("  - Has Min Tokens:", requirements.hasMinTokens ? "✅" : "❌");
            console.log("  - Has Deposit Tokens:", requirements.hasDepositTokens ? "✅" : "❌");
            console.log("  - Has Allowance:", requirements.hasAllowance ? "✅" : "❌");
            console.log("  - Cooldown Passed:", requirements.cooldownPassed ? "✅" : "❌");
            console.log("  - Below Max Proposals:", requirements.belowMaxProposals ? "✅" : "❌");
            console.log("  - Status:", requirements.statusMessage);
            
            if (!requirements.canCreateProposal) {
                if (!requirements.hasAllowance) {
                    console.log("\n🔐 Approving DAO to spend tokens...");
                    const approveTx = await token.approve(daoAddress, creationFee);
                    await approveTx.wait();
                    console.log("✅ Approval transaction confirmed\n");
                } else {
                    throw new Error(`❌ Cannot create proposal: ${requirements.statusMessage}`);
                }
            }
        } else {
            // Basic checks for legacy contracts
            console.log("\n📋 Basic Proposal Checks (Legacy Contract):");
            const currentAllowance = await token.allowance(deployer.address, daoAddress);
            const hasAllowance = currentAllowance >= creationFee;
            const hasTokens = userBalance >= creationFee;
            
            console.log("  - Has Tokens:", hasTokens ? "✅" : "❌");
            console.log("  - Has Allowance:", hasAllowance ? "✅" : "❌");
            
            if (!hasTokens) {
                throw new Error(`❌ Insufficient tokens. Need ${ethers.formatEther(creationFee)} tokens.`);
            }
            
            if (!hasAllowance) {
                console.log("\n🔐 Approving DAO to spend tokens...");
                const approveTx = await token.approve(daoAddress, creationFee);
                await approveTx.wait();
                console.log("✅ Approval transaction confirmed\n");
            }
        }
        
        console.log("\n📝 Please provide proposal details:\n");
        
        const projectName = await askQuestion("🎯 Project Name: ");
        const projectUrl = await askQuestion("🌐 Project URL: ");
        const fundingGoalInput = await askQuestion("💰 Funding Goal (in tokens): ");
        const description = await askQuestion("📄 Project Description: ");
        
        console.log("\n🔍 Validating inputs...");
        const validationErrors = await validateInputs(description, projectName, projectUrl, fundingGoalInput);
        
        if (validationErrors.length > 0) {
            console.log("❌ Validation errors:");
            validationErrors.forEach(error => console.log(`  - ${error}`));
            throw new Error("Please fix the validation errors and try again");
        }
        
        const fundingGoal = ethers.parseEther(fundingGoalInput);
        
        console.log("\n📋 Proposal Summary:");
        console.log("  - Project Name:", projectName);
        console.log("  - Project URL:", projectUrl);
        console.log("  - Funding Goal:", ethers.formatEther(fundingGoal), "tokens");
        console.log("  - Creation Fee (non-refundable):", ethers.formatEther(creationFee), "tokens");
        console.log("  - Description:", description.substring(0, 100) + (description.length > 100 ? "..." : ""));
        
        const confirm = await askQuestion("\n❓ Do you want to create this proposal? (yes/no): ");
        
        if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
            console.log("❌ Proposal creation cancelled by user");
            return;
        }
        
        console.log("\n⏳ Creating proposal...");
        
        const createTx = await dao.createProposal(
            description,
            projectName,
            projectUrl,
            fundingGoal,
            {
                gasLimit: 500000
            }
        );
        
        console.log("⏳ Waiting for transaction confirmation...");
        const receipt = await createTx.wait();
        
        const proposalCreatedEvent = receipt.logs.find(
            log => {
                try {
                    const parsed = dao.interface.parseLog(log);
                    return parsed.name === "ProposalCreated";
                } catch {
                    return false;
                }
            }
        );
        
        if (proposalCreatedEvent) {
            const decodedEvent = dao.interface.parseLog(proposalCreatedEvent);
            const proposalId = decodedEvent.args.proposalId;
            
            console.log("\n🎉 Proposal Created Successfully!");
            console.log("=====================================");
            console.log("  - Proposal ID:", proposalId.toString());
            console.log("  - Transaction Hash:", receipt.hash);
            console.log("  - Block Number:", receipt.blockNumber);
            console.log("  - Gas Used:", receipt.gasUsed.toString());
            
            const proposal = await dao.getProposal(proposalId);
            const votingDuration = Number(proposal.endTime) - Math.floor(Date.now() / 1000);
            
            console.log("\n📊 Proposal Details:");
            console.log("  - ID:", proposal.id.toString());
            console.log("  - Proposer:", proposal.proposer);
            console.log("  - Project Name:", proposal.projectName);
            console.log("  - Funding Goal:", ethers.formatEther(proposal.fundingGoal), "tokens");
            console.log("  - Creation Fee Paid:", ethers.formatEther(proposal.creationFee), "tokens");
            console.log("  - Voting Ends:", new Date(Number(proposal.endTime) * 1000).toLocaleString());
            console.log("  - Voting Duration:", Math.floor(votingDuration / 60), "minutes remaining");
            
            // Show updated user proposal list (for latest version only)
            if (contractVersion === "latest") {
                const updatedProposals = await dao.getProposalsIDByProposer(deployer.address);
                console.log("\n📊 Your Proposals:");
                console.log("  - Total Proposals:", updatedProposals.length);
                console.log("  - Proposal IDs:", updatedProposals.map(id => id.toString()).join(", "));
            }
            
            console.log("\n📝 Next Steps:");
            console.log("  1. Share your proposal ID with potential investors");
            console.log("  2. Promote your project to gather votes and investments");
            console.log("  3. Monitor voting progress using the DAO interface");
            console.log("  4. After voting ends, an admin will execute the proposal");
            console.log("\n💡 Commands to check your proposal:");
            console.log(`  - View details: npm run view-proposal ${proposalId.toString()}`);
            console.log("  - Check all proposals: npm run get-proposals");
            
            return {
                proposalId: proposalId.toString(),
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
        } else {
            throw new Error("❌ ProposalCreated event not found in transaction receipt");
        }
        
    } catch (error) {
        console.error("\n❌ Error creating proposal:", error.message);
        
        if (error.code === 'CALL_EXCEPTION') {
            console.error("\n💡 Common issues:");
            console.error("  - Insufficient token balance for deposit");
            console.error("  - DAO contract not approved to spend tokens");
            console.error("  - Proposal cooldown period still active");
            console.error("  - Maximum proposals per user reached");
            console.error("  - Invalid funding goal (too high/low)");
            console.error("  - Contract is paused");
        }
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.error("💡 You don't have enough tokens for the transaction");
        }
        
        throw error;
    } finally {
        rl.close();
    }
}

async function showHelp() {
    console.log("🚀 Ganjes DAO Proposal Creation Help");
    console.log("===================================\n");
    
    console.log("📋 Requirements to create a proposal:");
    console.log("  - Minimum 100 tokens in your wallet");
    console.log("  - 100 tokens deposit (refunded if proposal fails)");
    console.log("  - Approval for DAO to spend your tokens");
    console.log("  - Must wait 1 hour between proposals");
    console.log("  - Maximum 10 proposals per user\n");
    
    console.log("💰 Funding Goal Guidelines:");
    console.log("  - Minimum: 10 tokens");
    console.log("  - Maximum: 1,000,000 tokens");
    console.log("  - Choose realistic amounts based on project scope\n");
    
    console.log("📝 Tips for successful proposals:");
    console.log("  - Clear, detailed project description");
    console.log("  - Valid project URL with documentation");
    console.log("  - Reasonable funding goal");
    console.log("  - Engage with the community for support\n");
    
    console.log("⚡ Usage:");
    console.log("  npm run create-proposal      # Interactive mode");
    console.log("  npm run create-proposal help # Show this help");
}

// Run the script if executed directly
const args = process.argv.slice(2);

if (args.length > 0 && (args[0] === 'help' || args[0] === '--help' || args[0] === '-h')) {
    showHelp()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} else {
    createProposal()
        .then((result) => {
            if (result) {
                console.log("\n✅ Proposal creation completed successfully!");
            }
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n❌ Proposal creation failed:", error.message);
            process.exit(1);
        });
}

export default createProposal;