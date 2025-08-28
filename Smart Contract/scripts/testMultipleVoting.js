const { ethers } = require("hardhat");

async function main() {
    console.log("Testing multiple voting functionality...\n");

    // Get contract addresses from environment or use deployed addresses
    const DAO_ADDRESS = process.env.DAO_ADDRESS || "YOUR_DAO_ADDRESS_HERE";
    const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "YOUR_TOKEN_ADDRESS_HERE";

    if (DAO_ADDRESS === "YOUR_DAO_ADDRESS_HERE" || TOKEN_ADDRESS === "YOUR_TOKEN_ADDRESS_HERE") {
        console.log("Please set DAO_ADDRESS and TOKEN_ADDRESS environment variables");
        console.log("Example: DAO_ADDRESS=0x123... TOKEN_ADDRESS=0x456... npx hardhat run scripts/testMultipleVoting.js --network bsc");
        return;
    }

    // Get signers
    const [admin, investor1] = await ethers.getSigners();
    
    console.log(`Admin: ${admin.address}`);
    console.log(`Investor1: ${investor1.address}\n`);

    // Get contract instances
    const ganjesDAO = await ethers.getContractAt("GanjesDAOOptimized", DAO_ADDRESS);
    const token = await ethers.getContractAt("IERC20", TOKEN_ADDRESS);

    try {
        // Check if there are any active proposals
        const proposalCount = await ganjesDAO.getTotalProposals();
        console.log(`Total proposals: ${proposalCount}`);
        
        if (proposalCount.toString() === "0") {
            console.log("No proposals found. Please create a proposal first.");
            return;
        }

        // Use the latest proposal
        const proposalId = proposalCount;
        console.log(`Testing with proposal ID: ${proposalId}\n`);

        // Get proposal details
        const proposal = await ganjesDAO.getProposal(proposalId);
        console.log(`Proposal ${proposalId} details:`);
        console.log(`- Proposer: ${proposal.proposer}`);
        console.log(`- Funding Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
        console.log(`- End Time: ${new Date(Number(proposal.endTime) * 1000)}`);
        console.log(`- Executed: ${proposal.executed}`);
        console.log(`- Total Invested: ${ethers.formatEther(proposal.totalInvested)} tokens\n`);

        if (proposal.executed) {
            console.log("Proposal already executed. Cannot test voting.");
            return;
        }

        if (Date.now() > Number(proposal.endTime) * 1000) {
            console.log("Proposal voting period has ended. Cannot test voting.");
            return;
        }

        // Check investor1 balance and allowance
        const balance1 = await token.balanceOf(investor1.address);
        const allowance1 = await token.allowance(investor1.address, DAO_ADDRESS);
        
        console.log(`Investor1 balance: ${ethers.formatEther(balance1)} tokens`);
        console.log(`Investor1 allowance: ${ethers.formatEther(allowance1)} tokens\n`);

        const minInvestment = await ganjesDAO.minInvestmentAmount();
        const firstVoteAmount = ethers.parseEther("50"); // 50 tokens
        const secondVoteAmount = ethers.parseEther("80"); // 80 tokens (increased)
        
        console.log(`Min investment: ${ethers.formatEther(minInvestment)} tokens`);
        console.log(`First vote amount: ${ethers.formatEther(firstVoteAmount)} tokens`);
        console.log(`Second vote amount: ${ethers.formatEther(secondVoteAmount)} tokens\n`);

        // Check if investor1 has sufficient balance
        if (balance1 < secondVoteAmount) {
            console.log("Insufficient balance for testing. Need at least 80 tokens.");
            return;
        }

        // Approve if needed
        if (allowance1 < secondVoteAmount) {
            console.log("Approving tokens...");
            const approveTx = await token.connect(investor1).approve(DAO_ADDRESS, ethers.parseEther("1000"));
            await approveTx.wait();
            console.log("✅ Tokens approved\n");
        }

        // Get initial investment
        const initialInvestment = await ganjesDAO.getUserInvestment(proposalId, investor1.address);
        console.log(`Initial investment: ${ethers.formatEther(initialInvestment.investment)} tokens`);
        console.log(`Has voted: ${initialInvestment.hasVoted}\n`);

        // Test 1: First vote
        console.log("=== Test 1: First Vote ===");
        try {
            const voteTx1 = await ganjesDAO.connect(investor1).vote(proposalId, true, firstVoteAmount);
            const receipt1 = await voteTx1.wait();
            
            console.log(`✅ First vote successful!`);
            console.log(`Transaction hash: ${voteTx1.hash}\n`);
            
            // Check investment after first vote
            const afterFirstVote = await ganjesDAO.getUserInvestment(proposalId, investor1.address);
            console.log(`Investment after first vote: ${ethers.formatEther(afterFirstVote.investment)} tokens`);
            console.log(`Has voted: ${afterFirstVote.hasVoted}\n`);
            
        } catch (error) {
            console.log(`❌ First vote failed: ${error.message}\n`);
            return;
        }

        // Test 2: Second vote with increased amount
        console.log("=== Test 2: Second Vote (Increased Amount) ===");
        try {
            const voteTx2 = await ganjesDAO.connect(investor1).vote(proposalId, true, secondVoteAmount);
            const receipt2 = await voteTx2.wait();
            
            console.log(`✅ Second vote with increased amount successful!`);
            console.log(`Transaction hash: ${voteTx2.hash}\n`);
            
            // Check investment after second vote
            const afterSecondVote = await ganjesDAO.getUserInvestment(proposalId, investor1.address);
            console.log(`Investment after second vote: ${ethers.formatEther(afterSecondVote.investment)} tokens`);
            console.log(`Has voted: ${afterSecondVote.hasVoted}\n`);
            
        } catch (error) {
            console.log(`❌ Second vote failed: ${error.message}\n`);
        }

        // Test 3: Third vote with same amount (should fail)
        console.log("=== Test 3: Third Vote (Same Amount - Should Fail) ===");
        try {
            const voteTx3 = await ganjesDAO.connect(investor1).vote(proposalId, true, secondVoteAmount);
            const receipt3 = await voteTx3.wait();
            
            console.log(`❌ Third vote should have failed but succeeded: ${voteTx3.hash}`);
            
        } catch (error) {
            console.log(`✅ Third vote correctly failed: ${error.message}\n`);
        }

        // Test 4: Fourth vote with decreased amount (should fail)
        const decreasedAmount = ethers.parseEther("70"); // 70 tokens (less than 80)
        console.log("=== Test 4: Fourth Vote (Decreased Amount - Should Fail) ===");
        try {
            const voteTx4 = await ganjesDAO.connect(investor1).vote(proposalId, false, decreasedAmount);
            const receipt4 = await voteTx4.wait();
            
            console.log(`❌ Fourth vote should have failed but succeeded: ${voteTx4.hash}`);
            
        } catch (error) {
            console.log(`✅ Fourth vote correctly failed: ${error.message}\n`);
        }

        // Get final proposal state
        console.log("=== Final Proposal State ===");
        const finalProposal = await ganjesDAO.getProposal(proposalId);
        console.log(`Total Invested: ${ethers.formatEther(finalProposal.totalInvested)} tokens`);
        console.log(`Voters For: ${finalProposal.votersFor}`);
        console.log(`Voters Against: ${finalProposal.votersAgainst}\n`);
        
        const finalInvestment = await ganjesDAO.getUserInvestment(proposalId, investor1.address);
        console.log(`Final user investment: ${ethers.formatEther(finalInvestment.investment)} tokens`);

        console.log("✅ Multiple voting test completed successfully!");

    } catch (error) {
        console.error("Error during testing:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });