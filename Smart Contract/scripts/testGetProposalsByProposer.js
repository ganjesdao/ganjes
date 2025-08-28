import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";

dotenv.config();

async function testGetProposalsByProposer() {
    console.log("🧪 Testing Get Proposals by Proposer");
    console.log("====================================");
    
    try {
        const [deployer] = await ethers.getSigners();
        console.log("📝 Using account:", deployer.address);
        
        const daoAddress = process.env.DAO_ADDRESS;
        console.log("🏛️  DAO Address:", daoAddress);
        
        const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
        const dao = new ethers.Contract(daoAddress, daoArtifact.abi, deployer);
        
        // Test getProposalsIDByProposer function
        console.log("\n🔍 Testing getProposalsIDByProposer...");
        
        const proposalIds = await dao.getProposalsIDByProposer(deployer.address);
        console.log(`✅ Found ${proposalIds.length} proposals for ${deployer.address}`);
        
        if (proposalIds.length > 0) {
            console.log("📋 Proposal IDs:", proposalIds.map(id => id.toString()).join(", "));
            
            // Test getting details for each proposal
            console.log("\n📝 Getting proposal details:");
            
            for (let i = 0; i < proposalIds.length; i++) {
                const proposalId = proposalIds[i];
                console.log(`\n🔹 Proposal #${proposalId}:`);
                
                try {
                    const proposal = await dao.getProposal(proposalId);
                    console.log(`  - Project: ${proposal.projectName}`);
                    console.log(`  - Proposer: ${proposal.proposer}`);
                    console.log(`  - Funding Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
                    console.log(`  - Status: ${proposal.executed ? (proposal.passed ? 'Passed' : 'Failed') : 'Active'}`);
                    console.log(`  - End Time: ${new Date(Number(proposal.endTime) * 1000).toLocaleString()}`);
                } catch (error) {
                    console.log(`  ❌ Error getting details: ${error.message}`);
                }
            }
        } else {
            console.log("📝 No proposals found for this address");
            
            // Test with a different address that might have proposals
            console.log("\n🔍 Checking if there are any proposals in the DAO...");
            const totalProposals = await dao.getTotalProposals();
            console.log(`📊 Total proposals in DAO: ${totalProposals}`);
            
            if (totalProposals > 0) {
                console.log("💡 There are proposals in the DAO, but none from your address");
                console.log("   Create a proposal with: npm run create-proposal");
            }
        }
        
        // Test additional functions
        console.log("\n📊 Additional Stats:");
        const proposalCount = await dao.getProposalCountByUser(deployer.address);
        const cooldownTime = await dao.getTimeUntilNextProposal(deployer.address);
        
        console.log(`  - Your Proposal Count: ${proposalCount}`);
        console.log(`  - Cooldown Remaining: ${cooldownTime} seconds`);
        
        console.log("\n✅ All tests completed successfully!");
        
        return {
            proposerAddress: deployer.address,
            proposalIds: proposalIds.map(id => id.toString()),
            totalProposals: proposalCount.toString(),
            cooldownTime: cooldownTime.toString()
        };
        
    } catch (error) {
        console.error("\n❌ Error testing:", error.message);
        
        if (error.message.includes("getProposalsIDByProposer")) {
            console.error("💡 The deployed contract doesn't have the getProposalsIDByProposer function");
            console.error("   Deploy updated contract: npm run deploy:optimized");
        }
        
        throw error;
    }
}

testGetProposalsByProposer()
    .then((result) => {
        console.log("\n🎉 Test Results:");
        console.log(`   - Proposer: ${result.proposerAddress}`);
        console.log(`   - Proposals Found: ${result.proposalIds.length}`);
        console.log(`   - IDs: ${result.proposalIds.join(", ") || "None"}`);
        process.exit(0);
    })
    .catch(() => process.exit(1));