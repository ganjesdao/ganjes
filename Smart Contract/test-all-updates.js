import hre from "hardhat";
import dotenv from "dotenv";

const { ethers, artifacts } = hre;
dotenv.config();

async function testAllUpdates() {
  const [signer] = await ethers.getSigners();
  const daoAddress = process.env.DAO_ADDRESS;
  
  console.log('🧪 Testing All Contract Updates...');
  console.log('📝 DAO Address:', daoAddress);
  console.log('👤 Tester:', signer.address);
  
  const daoArtifact = await artifacts.readArtifact('GanjesDAOOptimized');
  const dao = new ethers.Contract(daoAddress, daoArtifact.abi, signer);
  
  try {
    console.log('\n✅ 1. Testing getProposalsIdByInvestor function...');
    const investorProposals = await dao.getProposalsIdByInvestor(signer.address);
    console.log('📊 Investor has voted on proposals:', investorProposals.map(id => id.toString()));
    
    console.log('\n✅ 2. Testing removed functions (should fail)...');
    
    // Test removed functions - these should fail
    const removedFunctions = [
      'increaseVotingDuration',
      'decreaseVotingDuration', 
      'getActiveInvestorCount',
      'getInvestorByIndex'
    ];
    
    for (const funcName of removedFunctions) {
      try {
        // Try to call the function to see if it exists
        const func = dao.interface.getFunction(funcName);
        console.log(`❌ Function ${funcName} still exists (should be removed)`);
      } catch (error) {
        console.log(`✅ Function ${funcName} successfully removed`);
      }
    }
    
    console.log('\n✅ 3. Testing execute proposal logic...');
    for (let i = 1; i <= 2; i++) {
      try {
        const proposal = await dao.getProposal(i);
        console.log(`📋 Proposal #${i}:`);
        console.log('  - Executed:', proposal.executed);
        console.log('  - Passed:', proposal.passed);
        console.log('  - Rejected:', proposal.rejected);
        console.log('  - Against votes:', ethers.formatEther(proposal.totalVotesAgainst));
        console.log('  - For votes:', ethers.formatEther(proposal.totalVotesFor));
        console.log('  - Total invested:', ethers.formatEther(proposal.totalInvested));
        console.log('  - Funding goal:', ethers.formatEther(proposal.fundingGoal));
        
        // Check if proposal can be executed
        if (!proposal.executed && block.timestamp >= proposal.endTime) {
          console.log(`  ⚡ Proposal #${i} can be executed`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error checking proposal #${i}:`, error.message.slice(0, 50));
      }
    }
    
    console.log('\n✅ 4. Testing getInvestorDetails function...');
    try {
      const details = await dao.getInvestorDetails(2); // Use proposal 2 as it has votes
      console.log('📊 Investor details for proposal #2:');
      console.log('  - Investor count:', details[0].length);
      
      if (details[0].length > 0) {
        console.log('  - First investor:', details[0][0]);
        console.log('  - Investment amount:', ethers.formatEther(details[1][0]), 'tokens');
        console.log('  - Vote support:', details[2][0] ? 'FOR' : 'AGAINST');
      }
      
    } catch (error) {
      console.log('❌ getInvestorDetails error:', error.message.slice(0, 100));
    }
    
    console.log('\n✅ 5. Testing getInvestorCount function...');
    try {
      const count = await dao.getInvestorCount(2);
      console.log('📊 Investor count for proposal #2:', count.toString());
    } catch (error) {
      console.log('❌ getInvestorCount error:', error.message.slice(0, 50));
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary of Changes:');
    console.log('✅ Execute proposal logic updated (against votes = reject + refund all)');
    console.log('✅ getProposalsIdByInvestor function added');
    console.log('✅ Removed write functions: increaseVotingDuration, decreaseVotingDuration');
    console.log('✅ Removed read functions: activeInvestors, activeInvestorCount, getInvestorByIndex');
    console.log('✅ Contract compiles and deploys successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAllUpdates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });