import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";

dotenv.config();

async function testProposalFunctions() {
    console.log("🧪 Testing Proposal Functions");
    console.log("=============================");
    
    try {
        const [deployer] = await ethers.getSigners();
        console.log("📝 Using account:", deployer.address);
        
        const daoAddress = process.env.DAO_ADDRESS;
        console.log("🏛️  DAO Address:", daoAddress);
        
        const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
        const dao = new ethers.Contract(daoAddress, daoArtifact.abi, deployer);
        
        console.log("\n🔍 Testing Functions:");
        
        // Test 1: getProposalsIDByProposer
        try {
            const proposals = await dao.getProposalsIDByProposer(deployer.address);
            console.log("✅ getProposalsIDByProposer:", proposals.length, "proposals found");
        } catch (error) {
            console.log("❌ getProposalsIDByProposer:", error.message);
        }
        
        // Test 2: checkProposalRequirements
        try {
            const requirements = await dao.checkProposalRequirements(deployer.address);
            console.log("✅ checkProposalRequirements: Status -", requirements.statusMessage);
        } catch (error) {
            console.log("❌ checkProposalRequirements:", error.message);
        }
        
        // Test 3: getProposalCountByUser
        try {
            const count = await dao.getProposalCountByUser(deployer.address);
            console.log("✅ getProposalCountByUser:", count.toString(), "proposals");
        } catch (error) {
            console.log("❌ getProposalCountByUser:", error.message);
        }
        
        // Test 4: getTimeUntilNextProposal
        try {
            const cooldown = await dao.getTimeUntilNextProposal(deployer.address);
            console.log("✅ getTimeUntilNextProposal:", cooldown.toString(), "seconds");
        } catch (error) {
            console.log("❌ getTimeUntilNextProposal:", error.message);
        }
        
        // Test 5: getTotalProposals
        try {
            const total = await dao.getTotalProposals();
            console.log("✅ getTotalProposals:", total.toString(), "total proposals");
        } catch (error) {
            console.log("❌ getTotalProposals:", error.message);
        }
        
        console.log("\n📊 Summary:");
        console.log("Current deployed contract needs to be updated to include new functions.");
        console.log("To fix: Deploy the updated contract with 'npm run deploy:optimized'");
        
    } catch (error) {
        console.error("\n❌ Error testing functions:", error.message);
        throw error;
    }
}

testProposalFunctions()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));