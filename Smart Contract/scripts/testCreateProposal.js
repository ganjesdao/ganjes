import pkg from 'hardhat';
const { ethers } = pkg;

async function testCreateProposalScript() {
    console.log("🧪 Testing Create Proposal Script");
    console.log("================================");
    
    try {
        // Test if we can get signers
        const signers = await ethers.getSigners();
        console.log("✅ Connected to network");
        console.log("📝 Available signers:", signers.length);
        
        if (signers.length > 0) {
            console.log("🔑 First signer:", signers[0].address);
        }
        
        // Test environment variables
        console.log("\n🔍 Environment Check:");
        console.log("  - DAO_ADDRESS:", process.env.DAO_ADDRESS ? "✅ Set" : "❌ Missing");
        console.log("  - TOKEN_ADDRESS:", process.env.TOKEN_ADDRESS ? "✅ Set" : "❌ Missing");
        
        if (!process.env.DAO_ADDRESS || !process.env.TOKEN_ADDRESS) {
            console.log("\n⚠️  Warning: Environment variables not set. Create-proposal may fail.");
            console.log("💡 Set these in your .env file or environment");
        }
        
        console.log("\n✅ Create proposal script test completed");
        
    } catch (error) {
        console.error("\n❌ Error testing create proposal script:", error.message);
        throw error;
    }
}

testCreateProposalScript()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));