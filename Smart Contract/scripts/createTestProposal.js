import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";

dotenv.config();

async function createTestProposal() {
    try {
        console.log("🚀 Starting Test Proposal Creation...");
        
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
        
        const userBalance = await token.balanceOf(deployer.address);
        console.log("💳 User Token Balance:", ethers.formatEther(userBalance), "tokens");
        
        const currentAllowance = await token.allowance(deployer.address, daoAddress);
        console.log("✅ Current Allowance:", ethers.formatEther(currentAllowance), "tokens");
        
        const creationFee = await dao.PROPOSAL_CREATION_FEE();
        console.log("💵 Required Deposit:", ethers.formatEther(creationFee), "tokens");
        
        if (currentAllowance < creationFee) {
            console.log("🔐 Approving DAO to spend tokens...");
            const approveTx = await token.approve(daoAddress, creationFee);
            await approveTx.wait();
            console.log("✅ Approval transaction confirmed");
        }
        
        const requirements = await dao.checkProposalRequirements(deployer.address);
        console.log("📋 Proposal Requirements Check:");
        console.log("  - Can Create Proposal:", requirements.canCreateProposal);
        console.log("  - Has Min Tokens:", requirements.hasMinTokens);
        console.log("  - Has Deposit Tokens:", requirements.hasDepositTokens);
        console.log("  - Has Allowance:", requirements.hasAllowance);
        console.log("  - Cooldown Passed:", requirements.cooldownPassed);
        console.log("  - Below Max Proposals:", requirements.belowMaxProposals);
        console.log("  - Status:", requirements.statusMessage);
        
        if (!requirements.canCreateProposal) {
            throw new Error(`❌ Cannot create proposal: ${requirements.statusMessage}`);
        }
        
        const testProposal = {
            description: "Test proposal for blockchain-based decentralized marketplace platform that enables peer-to-peer trading with smart contract escrow services, multi-currency support, and reputation system.",
            projectName: "Ganjes DeFi Marketplace",
            projectUrl: "https://github.com/ganjes/defi-marketplace",
            fundingGoal: ethers.parseEther("500") // 500 tokens
        };
        
        console.log("📝 Creating test proposal...");
        console.log("  - Project Name:", testProposal.projectName);
        console.log("  - Funding Goal:", ethers.formatEther(testProposal.fundingGoal), "tokens");
        console.log("  - Description:", testProposal.description.substring(0, 100) + "...");
        
        const createTx = await dao.createProposal(
            testProposal.description,
            testProposal.projectName,
            testProposal.projectUrl,
            testProposal.fundingGoal
        );
        
        console.log("⏳ Waiting for transaction confirmation...");
        const receipt = await createTx.wait();
        
        const proposalCreatedEvent = receipt.logs.find(
            log => log.topics[0] === ethers.id("ProposalCreated(uint256,address,string,uint256,uint256,uint256,uint256)")
        );
        
        if (proposalCreatedEvent) {
            const decodedEvent = dao.interface.parseLog(proposalCreatedEvent);
            const proposalId = decodedEvent.args.proposalId;
            
            console.log("🎉 Test Proposal Created Successfully!");
            console.log("  - Proposal ID:", proposalId.toString());
            console.log("  - Transaction Hash:", receipt.hash);
            console.log("  - Block Number:", receipt.blockNumber);
            
            const proposal = await dao.getProposal(proposalId);
            console.log("\n📊 Proposal Details:");
            console.log("  - ID:", proposal.id.toString());
            console.log("  - Proposer:", proposal.proposer);
            console.log("  - Project Name:", proposal.projectName);
            console.log("  - Funding Goal:", ethers.formatEther(proposal.fundingGoal), "tokens");
            console.log("  - Deposit Amount:", ethers.formatEther(proposal.creationFee), "tokens");
            console.log("  - Voting End Time:", new Date(Number(proposal.endTime) * 1000).toLocaleString());
            console.log("  - Executed:", proposal.executed);
            console.log("  - Passed:", proposal.passed);
            
            return {
                proposalId: proposalId.toString(),
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };
        } else {
            throw new Error("❌ ProposalCreated event not found in transaction receipt");
        }
        
    } catch (error) {
        console.error("❌ Error creating test proposal:", error.message);
        
        if (error.code === 'CALL_EXCEPTION') {
            console.error("💡 This might be due to:");
            console.error("  - Insufficient token balance");
            console.error("  - Insufficient allowance");
            console.error("  - Proposal cooldown active");
            console.error("  - Maximum proposals reached");
            console.error("  - Contract is paused");
        }
        
        throw error;
    }
}

// Run the script if executed directly
createTestProposal()
    .then((result) => {
        console.log("\n✅ Test proposal creation completed successfully!");
        console.log("📊 Result:", result);
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Test proposal creation failed:", error.message);
        process.exit(1);
    });

export default createTestProposal;