import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";

dotenv.config();

async function fixedVote() {
    try {
        console.log("🗳️  Fixed Voting Script");
        console.log("========================\n");
        
        const [signer] = await ethers.getSigners();
        console.log("📝 Using account:", signer.address);
        
        const daoAddress = process.env.DAO_ADDRESS;
        const tokenAddress = process.env.TOKEN_ADDRESS;
        
        if (!daoAddress || !tokenAddress) {
            throw new Error("❌ DAO_ADDRESS and TOKEN_ADDRESS must be set in .env file");
        }
        
        console.log("🏛️  DAO Contract:", daoAddress);
        console.log("💰 Token Contract:", tokenAddress);
        
        const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
        const tokenArtifact = await artifacts.readArtifact("SimpleToken");
        
        const dao = new ethers.Contract(daoAddress, daoArtifact.abi, signer);
        const token = new ethers.Contract(tokenAddress, tokenArtifact.abi, signer);
        
        // Get basic info
        const userBalance = await token.balanceOf(signer.address);
        const minInvestment = await dao.minInvestmentAmount();
        
        console.log(`💳 Your Token Balance: ${ethers.formatEther(userBalance)} tokens`);
        console.log(`💵 Minimum Investment: ${ethers.formatEther(minInvestment)} tokens`);
        
        if (userBalance < minInvestment) {
            throw new Error(`❌ Insufficient tokens. Need at least ${ethers.formatEther(minInvestment)} tokens`);
        }
        
        // Check proposals
        const totalProposals = await dao.getTotalProposals();
        console.log(`📊 Total Proposals: ${totalProposals}`);
        
        if (totalProposals === 0n) {
            throw new Error("❌ No proposals exist to vote on");
        }
        
        // Get proposal 1 details using the correct struct order
        console.log("\n📋 Getting Proposal #1 details...");
        const proposal = await dao.proposals(1);
        
        console.log(`📛 Project: ${proposal.projectName}`);
        console.log(`👤 Proposer: ${proposal.proposer}`);
        console.log(`💰 Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
        console.log(`📈 Invested: ${ethers.formatEther(proposal.totalInvested)} tokens`);
        console.log(`⏰ End Time: ${new Date(Number(proposal.endTime) * 1000)}`);
        console.log(`🏁 Executed: ${proposal.executed}`);
        
        // Check voting eligibility
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (proposal.executed) {
            throw new Error("❌ Proposal already executed");
        }
        
        if (Number(proposal.endTime) <= currentTime) {
            throw new Error("❌ Voting period ended");
        }
        
        if (proposal.proposer.toLowerCase() === signer.address.toLowerCase()) {
            throw new Error("❌ Cannot vote on own proposal");
        }
        
        // Check if already voted
        try {
            const userInvestment = await dao.getUserInvestment(1, signer.address);
            if (userInvestment.hasVoted) {
                throw new Error(`❌ Already voted with ${ethers.formatEther(userInvestment.investment)} tokens`);
            }
        } catch (error) {
            if (error.message.includes("Already voted")) {
                throw error;
            }
            console.log("✅ User has not voted yet");
        }
        
        // Vote parameters
        const proposalId = 1;
        const support = true; // Vote FOR
        const investmentAmount = ethers.parseEther("10");
        
        console.log("\n📊 Vote Summary:");
        console.log(`   🆔 Proposal ID: #${proposalId}`);
        console.log(`   🗳️  Vote: ${support ? 'FOR' : 'AGAINST'}`);
        console.log(`   💰 Investment: ${ethers.formatEther(investmentAmount)} tokens`);
        
        // Check and approve tokens
        const currentAllowance = await token.allowance(signer.address, daoAddress);
        console.log(`📝 Current Allowance: ${ethers.formatEther(currentAllowance)} tokens`);
        
        if (currentAllowance < investmentAmount) {
            console.log("🔐 Approving tokens...");
            const approveTx = await token.approve(daoAddress, investmentAmount);
            const approveReceipt = await approveTx.wait();
            console.log("✅ Tokens approved:", approveReceipt.hash);
        }
        
        // Submit vote with comprehensive error handling
        console.log("\n🗳️  Submitting vote...");
        
        try {
            // First try a static call to catch revert reasons
            console.log("🔍 Performing static call check...");
            await dao.vote.staticCall(proposalId, support, investmentAmount);
            console.log("✅ Static call successful");
            
            // Estimate gas
            const gasEstimate = await dao.vote.estimateGas(proposalId, support, investmentAmount);
            console.log(`⛽ Gas estimate: ${gasEstimate}`);
            
            // Submit actual transaction
            const voteTx = await dao.vote(proposalId, support, investmentAmount, {
                gasLimit: gasEstimate + 100000n // Add buffer
            });
            
            console.log("📝 Transaction submitted:", voteTx.hash);
            console.log("⏳ Waiting for confirmation...");
            
            const receipt = await voteTx.wait();
            
            if (receipt.status === 0) {
                throw new Error("❌ Transaction failed (status: 0)");
            }
            
            console.log("✅ Vote confirmed!");
            console.log(`📅 Block: ${receipt.blockNumber}`);
            console.log(`💨 Gas used: ${receipt.gasUsed}`);
            
            // Parse vote event
            const voteEvents = receipt.logs.filter(log => {
                try {
                    const parsed = dao.interface.parseLog(log);
                    return parsed.name === "Voted";
                } catch {
                    return false;
                }
            });
            
            if (voteEvents.length > 0) {
                const voteEvent = dao.interface.parseLog(voteEvents[0]);
                console.log("\n🎉 Vote Event Details:");
                console.log(`   🆔 Proposal: #${voteEvent.args.proposalId}`);
                console.log(`   👤 Voter: ${voteEvent.args.voter}`);
                console.log(`   🗳️  Support: ${voteEvent.args.support ? 'FOR' : 'AGAINST'}`);
                console.log(`   💰 Investment: ${ethers.formatEther(voteEvent.args.investmentAmount)} tokens`);
                console.log(`   📊 Weight: ${ethers.formatEther(voteEvent.args.weight)} tokens`);
            }
            
            // Get updated proposal stats
            const updatedProposal = await dao.proposals(proposalId);
            console.log("\n📈 Updated Proposal Stats:");
            console.log(`   👍 Votes FOR: ${ethers.formatEther(updatedProposal.totalVotesFor)} (${updatedProposal.votersFor} voters)`);
            console.log(`   👎 Votes AGAINST: ${ethers.formatEther(updatedProposal.totalVotesAgainst)} (${updatedProposal.votersAgainst} voters)`);
            console.log(`   💸 Total Invested: ${ethers.formatEther(updatedProposal.totalInvested)} tokens`);
            
            console.log("\n🎉 VOTE SUCCESSFUL!");
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
            
        } catch (voteError) {
            console.error("\n💥 VOTE TRANSACTION FAILED:");
            console.error("Error code:", voteError.code);
            console.error("Error message:", voteError.message);
            
            // Handle specific error types
            if (voteError.code === 'CALL_EXCEPTION') {
                console.error("\n🔍 Transaction reverted. Possible reasons:");
                console.error("  - Insufficient token balance");
                console.error("  - Insufficient token allowance");
                console.error("  - Voting period has ended");
                console.error("  - Already voted on this proposal");
                console.error("  - Invalid proposal ID");
                console.error("  - Investment amount too low/high");
                
                // Check transaction receipt for more details
                if (voteError.receipt) {
                    console.error("📄 Transaction Receipt:");
                    console.error(`   Status: ${voteError.receipt.status}`);
                    console.error(`   Hash: ${voteError.receipt.hash}`);
                    console.error(`   Gas Used: ${voteError.receipt.gasUsed}`);
                    console.error(`   From: ${voteError.receipt.from}`);
                    console.error(`   To: ${voteError.receipt.to}`);
                    
                    // Try to get revert reason from receipt
                    if (voteError.receipt.logs && voteError.receipt.logs.length === 0) {
                        console.error("   No events emitted - transaction reverted");
                    }
                }
                
                // Try to decode error data if available
                if (voteError.data && typeof voteError.data === 'string') {
                    console.error(`   Error Data: ${voteError.data}`);
                    
                    // Common error signatures
                    const errorSignatures = {
                        "0x08c379a0": "Error(string)",
                        "0x4e487b71": "Panic(uint256)",
                        "0xe0cff6bf": "InsufficientBalance(uint256,uint256)",
                        "0x13be252b": "InsufficientAllowance(uint256,uint256)"
                    };
                    
                    const errorSig = voteError.data.slice(0, 10);
                    if (errorSignatures[errorSig]) {
                        console.error(`   Known Error Type: ${errorSignatures[errorSig]}`);
                    }
                }
            }
            
            // Network-specific errors
            if (voteError.code === 'NETWORK_ERROR') {
                console.error("\n🌐 Network Error - Check your internet connection and RPC endpoint");
            }
            
            if (voteError.code === 'INSUFFICIENT_FUNDS') {
                console.error("\n💰 Insufficient funds for gas fees");
            }
            
            throw voteError;
        }
        
    } catch (error) {
        console.error("\n❌ SCRIPT FAILED:");
        console.error("Error:", error.message);
        
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
        
        throw error;
    }
}

// Run the vote
fixedVote()
    .then((result) => {
        if (result?.success) {
            console.log(`\n🎉 Successfully voted! Transaction: ${result.transactionHash}`);
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Vote failed!");
        process.exit(1);
    });

export { fixedVote };