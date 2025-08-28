import hre from "hardhat";
import dotenv from "dotenv";

const { ethers, artifacts } = hre;
dotenv.config();

async function testInvestorDetails() {
  const [signer] = await ethers.getSigners();
  const daoAddress = process.env.DAO_ADDRESS;
  
  console.log('🔍 Testing getInvestorDetails function...');
  console.log('📝 DAO Address:', daoAddress);
  
  const daoArtifact = await artifacts.readArtifact('GanjesDAOOptimized');
  const dao = new ethers.Contract(daoAddress, daoArtifact.abi, signer);
  
  try {
    // Test both proposals
    for (let proposalId = 1; proposalId <= 2; proposalId++) {
      console.log(`\n📊 Testing Proposal #${proposalId}:`);
      try {
        const details = await dao.getInvestorDetails(proposalId);
        console.log('✅ getInvestorDetails function works');
        console.log('👥 Investors count:', details[0].length);
        
        if (details[0].length > 0) {
          console.log('👤 First investor:', details[0][0]);
          console.log('💰 Investment amount:', ethers.formatEther(details[1][0]), 'tokens');
          console.log('🗳️  Vote support:', details[2][0] ? 'FOR' : 'AGAINST');
          console.log('📅 Vote timestamp:', new Date(Number(details[3][0]) * 1000).toLocaleString());
          console.log('✅ Has voted:', details[4][0]);
        } else {
          console.log('📭 No investors in this proposal');
        }
        
        // Test getInvestorCount
        const count = await dao.getInvestorCount(proposalId);
        console.log('📊 Total investor count via getInvestorCount:', count.toString());
        
      } catch (error) {
        console.log(`❌ Error for proposal ${proposalId}:`, error.message.slice(0, 100));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testInvestorDetails()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });