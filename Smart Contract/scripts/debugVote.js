import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";

dotenv.config();

async function debugVote() {
    try {
        console.log("🔍 Enhanced Voting Debug Script");
        console.log("================================\n");
        
        const [signer] = await ethers.getSigners();
        console.log("📝 Voting account:", signer.address);
        
        const daoAddress = process.env.DAO_ADDRESS;
        const tokenAddress = process.env.TOKEN_ADDRESS;
        
        if (!daoAddress || !tokenAddress) {
            throw new Error("❌ DAO_ADDRESS and TOKEN_ADDRESS must be set in .env file");
        }
        
        console.log("🏛️  DAO Contract:", daoAddress);
        console.log("💰 Token Contract:", tokenAddress);
        console.log("🌐 RPC URL:", process.env.RPC_URL);
        
        // Check network connection
        const network = await ethers.provider.getNetwork();
        console.log("🔗 Network:", network.name, "Chain ID:", network.chainId);
        
        const balance = await ethers.provider.getBalance(signer.address);
        console.log("💳 ETH Balance:", ethers.formatEther(balance), "ETH");
        
        // Load contracts
        console.log("\n📋 Loading contract artifacts...");
        const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
        const tokenArtifact = await artifacts.readArtifact("SimpleToken");
        
        const dao = new ethers.Contract(daoAddress, daoArtifact.abi, signer);
        const token = new ethers.Contract(tokenAddress, tokenArtifact.abi, signer);
        
        // Test contract connectivity
        console.log("\n🔍 Testing contract connectivity...");
        
        try {
            const daoAdmin = await dao.admin();
            console.log("✅ DAO Admin:", daoAdmin);
        } catch (error) {
            console.error("❌ DAO contract connection failed:", error.message);
            throw new Error("DAO contract is not accessible at the given address");
        }
        
        try {
            const tokenName = await token.name();
            const tokenSymbol = await token.symbol();
            console.log(`✅ Token: ${tokenName} (${tokenSymbol})`);
        } catch (error) {
            console.error("❌ Token contract connection failed:", error.message);
            throw new Error("Token contract is not accessible at the given address");
        }
        
        // Get user's token balance
        try {
            const userBalance = await token.balanceOf(signer.address);
            console.log(`💰 Your Token Balance: ${ethers.formatEther(userBalance)} tokens`);
            
            if (userBalance === 0n) {
                throw new Error("❌ You have no tokens to vote with");
            }
        } catch (error) {
            console.error("❌ Failed to get token balance:", error.message);
            throw error;
        }
        
        // Get DAO configuration
        try {
            const minInvestment = await dao.minInvestmentAmount();
            const votingDuration = await dao.votingDuration();
            console.log(`💵 Min Investment: ${ethers.formatEther(minInvestment)} tokens`);
            console.log(`⏰ Voting Duration: ${votingDuration} seconds`);
        } catch (error) {
            console.error("❌ Failed to get DAO config:", error.message);
        }
        
        // Get total proposals
        let totalProposals;
        try {
            totalProposals = await dao.getTotalProposals();
            console.log(`📊 Total Proposals: ${totalProposals}`);
        } catch (error) {
            console.error("❌ Failed to get total proposals:", error.message);
            throw error;
        }
        
        if (totalProposals === 0n) {
            console.log("📝 No proposals exist. Creating a test proposal first...");
            
            // Check if user has enough tokens to create proposal
            const userBalance = await token.balanceOf(signer.address);
            const minTokensForProposal = await dao.MIN_TOKENS_FOR_PROPOSAL();
            
            if (userBalance < minTokensForProposal) {
                throw new Error(`❌ Need ${ethers.formatEther(minTokensForProposal)} tokens to create proposal`);
            }
            
            // Approve tokens for proposal creation
            console.log("🔐 Approving tokens for proposal creation...");
            const approveTx = await token.approve(daoAddress, minTokensForProposal);
            await approveTx.wait();
            
            // Create test proposal
            console.log("📝 Creating test proposal...");
            const createTx = await dao.createProposal(
                "Test proposal for voting",
                "Test Project",
                "https://example.com/test-project",
                ethers.parseEther("100")
            );
            await createTx.wait();
            console.log("✅ Test proposal created!");
            
            totalProposals = 1n;
        }
        
        // Get proposal details for proposal #1
        console.log("\n📋 Proposal #1 Details:");
        let proposal;
        try {
            proposal = await dao.proposals(1);
            console.log(`   📛 Project: ${proposal.projectName}`);
            console.log(`   👤 Proposer: ${proposal.proposer}`);
            console.log(`   💰 Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
            console.log(`   📈 Invested: ${ethers.formatEther(proposal.totalInvested)} tokens`);
            console.log(`   ⏰ End Time: ${new Date(Number(proposal.endTime) * 1000)}`);
            console.log(`   🏁 Executed: ${proposal.executed}`);
        } catch (error) {
            console.error("❌ Failed to get proposal details:", error.message);
            throw error;
        }
        
        // Check voting eligibility
        console.log("\n🔍 Checking voting eligibility...");
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (proposal.executed) {
            throw new Error("❌ Proposal has already been executed");
        }
        
        if (Number(proposal.endTime) <= currentTime) {
            throw new Error("❌ Voting period has ended");
        }
        
        if (proposal.proposer.toLowerCase() === signer.address.toLowerCase()) {
            throw new Error("❌ Cannot vote on your own proposal");
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
            // If error is about user not found, continue (user hasn't voted)
            console.log("✅ User has not voted yet");
        }
        
        // Prepare vote parameters
        const proposalId = 1;
        const support = true; // Vote FOR
        const investmentAmount = ethers.parseEther("10");
        
        console.log("\n📊 Vote Parameters:");
        console.log(`   🆔 Proposal ID: #${proposalId}`);
        console.log(`   🗳️  Vote: ${support ? 'FOR' : 'AGAINST'}`);
        console.log(`   💰 Investment: ${ethers.formatEther(investmentAmount)} tokens`);
        
        // Check allowance and approve if needed
        console.log("\n🔐 Checking token allowance...");
        const currentAllowance = await token.allowance(signer.address, daoAddress);
        console.log(`📝 Current Allowance: ${ethers.formatEther(currentAllowance)} tokens`);
        
        if (currentAllowance < investmentAmount) {
            console.log("🔐 Approving additional tokens...");
            const approveTx = await token.approve(daoAddress, investmentAmount);
            console.log("⏳ Waiting for approval transaction...");
            const approveReceipt = await approveTx.wait();
            console.log("✅ Token approval confirmed:", approveReceipt.hash);
        }
        
        // Attempt to vote with detailed error catching
        console.log("\n🗳️  Submitting vote...");
        
        try {
            // First, estimate gas
            console.log("⛽ Estimating gas...");
            const gasEstimate = await dao.vote.estimateGas(proposalId, support, investmentAmount);
            console.log(`📊 Gas Estimate: ${gasEstimate}`);
            
            // Submit the vote transaction
            const voteTx = await dao.vote(proposalId, support, investmentAmount, {
                gasLimit: gasEstimate + 50000n // Add buffer
            });
            
            console.log("📝 Vote transaction submitted:", voteTx.hash);
            console.log("⏳ Waiting for confirmation...");
            
            const receipt = await voteTx.wait();
            
            if (receipt.status === 0) {
                throw new Error("❌ Transaction failed - status: 0");
            }
            
            console.log("✅ Vote transaction confirmed!");
            console.log(`📅 Block Number: ${receipt.blockNumber}`);
            console.log(`💨 Gas Used: ${receipt.gasUsed}`);
            
            // Parse events
            const voteEvent = receipt.logs.find(log => {
                try {
                    const parsed = dao.interface.parseLog(log);
                    return parsed.name === "Voted";
                } catch {
                    return false;
                }
            });
            
            if (voteEvent) {
                const decodedEvent = dao.interface.parseLog(voteEvent);
                console.log("\n🎉 Vote Event Details:");
                console.log(`   🆔 Proposal ID: #${decodedEvent.args.proposalId}`);
                console.log(`   👤 Voter: ${decodedEvent.args.voter}`);
                console.log(`   🗳️  Support: ${decodedEvent.args.support ? 'FOR' : 'AGAINST'}`);
                console.log(`   💰 Investment: ${ethers.formatEther(decodedEvent.args.investmentAmount)} tokens`);
                console.log(`   📊 Vote Weight: ${ethers.formatEther(decodedEvent.args.weight)} tokens`);
            }
            
            // Get updated proposal stats
            const updatedProposal = await dao.proposals(proposalId);
            console.log("\n📈 Updated Proposal Statistics:");
            console.log(`   👍 Votes FOR: ${ethers.formatEther(updatedProposal.totalVotesFor)} (${updatedProposal.votersFor} voters)`);
            console.log(`   👎 Votes AGAINST: ${ethers.formatEther(updatedProposal.totalVotesAgainst)} (${updatedProposal.votersAgainst} voters)`);
            console.log(`   💸 Total Invested: ${ethers.formatEther(updatedProposal.totalInvested)} tokens`);
            
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
            
        } catch (voteError) {
            console.error("\n💥 VOTE TRANSACTION FAILED:");
            console.error("Error Code:", voteError.code);
            console.error("Error Message:", voteError.message);
            
            // Try to get revert reason
            if (voteError.receipt) {
                console.error("Transaction Receipt Status:", voteError.receipt.status);
                console.error("Gas Used:", voteError.receipt.gasUsed);
                
                // Try to decode revert reason
                try {
                    if (voteError.data) {
                        console.error("Revert Data:", voteError.data);
                    }
                } catch (e) {
                    console.error("Could not decode revert reason");
                }
            }
            
            // Try static call to get more detailed error
            try {
                console.log("\n🔍 Attempting static call for detailed error...");
                await dao.vote.staticCall(proposalId, support, investmentAmount);
            } catch (staticError) {
                console.error("Static Call Error:", staticError.message);
                if (staticError.data) {
                    console.error("Static Call Data:", staticError.data);
                }
            }
            
            throw voteError;
        }
        
    } catch (error) {
        console.error("\n❌ SCRIPT FAILED:");
        console.error("Error:", error.message);
        console.error("Stack:", error.stack);
        
        if (error.code === 'CALL_EXCEPTION') {
            console.error("\n💡 Common causes for CALL_EXCEPTION:");
            console.error("  - Contract not deployed at the specified address");
            console.error("  - Wrong network (check RPC_URL and contract addresses)");
            console.error("  - Insufficient gas or gas limit too low");
            console.error("  - Contract function reverted due to failed requirements");
            console.error("  - Invalid function parameters");
        }
        
        throw error;
    }
}

// Run the debug vote
debugVote()
    .then((result) => {
        if (result && result.success) {
            console.log("\n🎉 VOTE COMPLETED SUCCESSFULLY!");
            console.log(`Transaction: ${result.transactionHash}`);
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 VOTE FAILED!");
        process.exit(1);
    });

export { debugVote };