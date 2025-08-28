import hre from "hardhat";
import dotenv from "dotenv";

const { ethers, artifacts } = hre;
dotenv.config();

async function executeProposal() {
  const [signer] = await ethers.getSigners();
  const daoAddress = process.env.DAO_ADDRESS;
  
  console.log('🏛️  Testing proposal execution...');
  console.log('📝 DAO Address:', daoAddress);
  console.log('👤 Admin:', signer.address);
  
  const daoArtifact = await artifacts.readArtifact('GanjesDAOOptimized');
  const dao = new ethers.Contract(daoAddress, daoArtifact.abi, signer);
  
  try {
    // Check proposal status first
    const proposal = await dao.getProposal(1);
    console.log('\n📋 Proposal #1 Status:');
    console.log('✅ Executed:', proposal.executed);
    console.log('✅ Passed:', proposal.passed);
    console.log('❌ Rejected:', proposal.rejected);
    console.log('💰 Funding Goal:', ethers.formatEther(proposal.fundingGoal), 'tokens');
    console.log('📈 Total Invested:', ethers.formatEther(proposal.totalInvested), 'tokens');
    console.log('👍 Votes For:', ethers.formatEther(proposal.totalVotesFor));
    console.log('👎 Votes Against:', ethers.formatEther(proposal.totalVotesAgainst));
    
    if (!proposal.executed) {
      console.log('\n🔧 Executing proposal...');
      const tx = await dao.executeProposal(1, { gasLimit: 500000 });
      const receipt = await tx.wait();
      
      console.log('✅ Proposal executed!');
      console.log('📅 Transaction hash:', receipt.hash);
      
      // Check updated status
      const updatedProposal = await dao.getProposal(1);
      console.log('\n📊 Updated Status:');
      console.log('✅ Executed:', updatedProposal.executed);
      console.log('✅ Passed:', updatedProposal.passed);
      console.log('❌ Rejected:', updatedProposal.rejected);
      
      // Check events
      const events = receipt.logs.filter(log => {
        try {
          const parsed = dao.interface.parseLog(log);
          return parsed.name === 'ProposalExecuted' || parsed.name === 'ProposalRejected' || parsed.name === 'AutoRefundProcessed';
        } catch {
          return false;
        }
      });
      
      console.log('\n🎉 Events emitted:');
      events.forEach(event => {
        const parsed = dao.interface.parseLog(event);
        console.log(`📢 ${parsed.name}:`, parsed.args);
      });
      
    } else {
      console.log('⚠️  Proposal already executed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

executeProposal()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });