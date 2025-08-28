import pkg from 'hardhat';
const { ethers } = pkg;
import dotenv from "dotenv";

dotenv.config();

async function bscVote() {
    try {
        console.log("🔍 BSC Testnet Voting Script");
        console.log("============================\n");
        
        // Create provider for BSC testnet
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        console.log("🌐 RPC URL:", process.env.RPC_URL);
        
        // Create wallet from private key
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("❌ PRIVATE_KEY must be set in .env file");
        }
        
        const wallet = new ethers.Wallet(privateKey, provider);
        console.log("📝 Voting account:", wallet.address);
        
        // Check network
        const network = await provider.getNetwork();
        console.log("🔗 Network Chain ID:", network.chainId);
        
        if (network.chainId !== 97n) {
            console.log("⚠️  Warning: Expected BSC Testnet (97), got:", network.chainId);
        }
        
        // Check account balance
        const balance = await provider.getBalance(wallet.address);
        console.log("💳 BNB Balance:", ethers.formatEther(balance), "BNB");
        
        if (balance < ethers.parseEther("0.01")) {
            throw new Error("❌ Insufficient BNB for gas fees");
        }
        
        const daoAddress = process.env.DAO_ADDRESS;
        const tokenAddress = process.env.TOKEN_ADDRESS;
        
        if (!daoAddress || !tokenAddress) {
            throw new Error("❌ DAO_ADDRESS and TOKEN_ADDRESS must be set in .env file");
        }
        
        console.log("🏛️  DAO Contract:", daoAddress);
        console.log("💰 Token Contract:", tokenAddress);
        
        // Contract ABIs (simplified for the functions we need)
        const daoABI = [
            "function admin() view returns (address)",
            "function proposals(uint256) view returns (string, string, string, address, uint256, uint256, uint256, uint256, uint256, uint256, uint256, bool)",
            "function getTotalProposals() view returns (uint256)",
            "function minInvestmentAmount() view returns (uint256)",
            "function vote(uint256 proposalId, bool support, uint256 investmentAmount)",
            "function getUserInvestment(uint256 proposalId, address user) view returns (uint256 investment, bool hasVoted)",
            "event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 investmentAmount, uint256 weight)"
        ];
        
        const tokenABI = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function balanceOf(address) view returns (uint256)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)"
        ];
        
        // Create contract instances
        const dao = new ethers.Contract(daoAddress, daoABI, wallet);
        const token = new ethers.Contract(tokenAddress, tokenABI, wallet);
        
        // Test contract connectivity
        console.log("\n🔍 Testing contract connectivity...");
        
        try {
            const daoAdmin = await dao.admin();
            console.log("✅ DAO Admin:", daoAdmin);
        } catch (error) {
            console.error("❌ DAO contract error:", error.message);
            
            // Try to check if there's any code at the address
            const code = await provider.getCode(daoAddress);
            if (code === "0x") {
                throw new Error("❌ No contract deployed at DAO address - the address has no code");
            } else {
                console.log("📝 Contract code exists, but call failed. Possible ABI mismatch or network issue.");
                throw new Error("DAO contract call failed: " + error.message);
            }
        }
        
        try {
            const tokenName = await token.name();
            const tokenSymbol = await token.symbol();
            console.log(`✅ Token: ${tokenName} (${tokenSymbol})`);
        } catch (error) {
            console.error("❌ Token contract error:", error.message);
            
            const code = await provider.getCode(tokenAddress);
            if (code === "0x") {
                throw new Error("❌ No contract deployed at Token address - the address has no code");
            } else {
                throw new Error("Token contract call failed: " + error.message);
            }
        }
        
        // Get user's token balance
        const userBalance = await token.balanceOf(wallet.address);
        console.log(`💰 Your Token Balance: ${ethers.formatEther(userBalance)} tokens`);
        
        if (userBalance === 0n) {
            throw new Error("❌ You have no tokens to vote with");
        }
        
        // Get DAO configuration
        const minInvestment = await dao.minInvestmentAmount();
        console.log(`💵 Min Investment: ${ethers.formatEther(minInvestment)} tokens`);
        
        // Get total proposals
        const totalProposals = await dao.getTotalProposals();
        console.log(`📊 Total Proposals: ${totalProposals}`);
        
        if (totalProposals === 0n) {
            throw new Error("❌ No proposals exist to vote on");
        }
        
        // Get proposal #1 details
        console.log("\n📋 Proposal #1 Details:");
        const proposal = await dao.proposals(1);
        
        // proposal returns: (description, projectName, projectUrl, proposer, fundingGoal, endTime, totalVotesFor, totalVotesAgainst, totalInvested, votersFor, votersAgainst, executed)
        const [description, projectName, projectUrl, proposer, fundingGoal, endTime, totalVotesFor, totalVotesAgainst, totalInvested, votersFor, votersAgainst, executed] = proposal;
        
        console.log(`   📛 Project: ${projectName}`);
        console.log(`   📝 Description: ${description}`);
        console.log(`   👤 Proposer: ${proposer}`);
        console.log(`   💰 Goal: ${ethers.formatEther(fundingGoal)} tokens`);
        console.log(`   📈 Invested: ${ethers.formatEther(totalInvested)} tokens`);
        console.log(`   ⏰ End Time: ${new Date(Number(endTime) * 1000)}`);
        console.log(`   🏁 Executed: ${executed}`);
        console.log(`   👍 Votes FOR: ${ethers.formatEther(totalVotesFor)} (${votersFor} voters)`);
        console.log(`   👎 Votes AGAINST: ${ethers.formatEther(totalVotesAgainst)} (${votersAgainst} voters)`);
        
        // Check voting eligibility
        console.log("\n🔍 Checking voting eligibility...");
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (executed) {
            throw new Error("❌ Proposal has already been executed");
        }
        
        if (Number(endTime) <= currentTime) {
            throw new Error("❌ Voting period has ended");
        }
        
        if (proposer.toLowerCase() === wallet.address.toLowerCase()) {
            throw new Error("❌ Cannot vote on your own proposal");
        }
        
        // Check if already voted
        try {
            const userInvestment = await dao.getUserInvestment(1, wallet.address);
            if (userInvestment.hasVoted) {
                throw new Error(`❌ Already voted with ${ethers.formatEther(userInvestment.investment)} tokens`);
            }
        } catch (error) {
            if (error.message.includes("Already voted")) {
                throw error;
            }
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
        
        // Check and approve tokens if needed
        const currentAllowance = await token.allowance(wallet.address, daoAddress);
        console.log(`📝 Current Allowance: ${ethers.formatEther(currentAllowance)} tokens`);
        
        if (currentAllowance < investmentAmount) {
            console.log("🔐 Approving tokens...");
            const approveTx = await token.approve(daoAddress, investmentAmount, {
                gasLimit: 100000
            });
            console.log("⏳ Waiting for approval...");
            const approveReceipt = await approveTx.wait();
            console.log("✅ Tokens approved:", approveReceipt.hash);
        }
        
        // Submit vote with detailed error handling
        console.log("\n🗳️  Submitting vote...");
        
        try {
            // Estimate gas first
            const gasEstimate = await dao.vote.estimateGas(proposalId, support, investmentAmount);
            console.log(`⛽ Gas Estimate: ${gasEstimate}`);
            
            // Submit transaction
            const voteTx = await dao.vote(proposalId, support, investmentAmount, {
                gasLimit: gasEstimate + 50000n,
                gasPrice: ethers.parseUnits("10", "gwei")
            });
            
            console.log("📝 Transaction submitted:", voteTx.hash);
            console.log("⏳ Waiting for confirmation...");
            
            const receipt = await voteTx.wait();
            
            if (receipt.status === 0) {
                throw new Error("❌ Transaction failed with status: 0");
            }
            
            console.log("✅ Vote confirmed!");
            console.log(`📅 Block: ${receipt.blockNumber}`);
            console.log(`💨 Gas Used: ${receipt.gasUsed}`);
            
            // Parse vote event
            const voteEvent = receipt.logs.find(log => {
                try {
                    return log.topics[0] === dao.interface.getEvent("Voted").topicHash;
                } catch {
                    return false;
                }
            });
            
            if (voteEvent) {
                const decodedEvent = dao.interface.parseLog(voteEvent);
                console.log("\n🎉 Vote Event:");
                console.log(`   🆔 Proposal: #${decodedEvent.args.proposalId}`);
                console.log(`   👤 Voter: ${decodedEvent.args.voter}`);
                console.log(`   🗳️  Support: ${decodedEvent.args.support ? 'FOR' : 'AGAINST'}`);
                console.log(`   💰 Investment: ${ethers.formatEther(decodedEvent.args.investmentAmount)} tokens`);
                console.log(`   📊 Weight: ${ethers.formatEther(decodedEvent.args.weight)} tokens`);
            }
            
            console.log("\n🎉 VOTE SUCCESSFUL!");
            return { success: true, hash: receipt.hash };
            
        } catch (voteError) {
            console.error("\n💥 VOTE FAILED:");
            console.error("Code:", voteError.code);
            console.error("Message:", voteError.message);
            
            if (voteError.receipt) {
                console.error("Status:", voteError.receipt.status);
                console.error("Gas Used:", voteError.receipt.gasUsed?.toString());
            }
            
            // Try to get more detailed error with static call
            try {
                console.log("\n🔍 Attempting static call for detailed error...");
                await dao.vote.staticCall(proposalId, support, investmentAmount);
                console.log("⚠️  Static call succeeded - this suggests a gas or nonce issue");
            } catch (staticError) {
                console.error("Static call failed:", staticError.message);
                
                // Common error patterns
                if (staticError.message.includes("InsufficientBalance")) {
                    console.error("💡 Error: Insufficient token balance for investment");
                } else if (staticError.message.includes("InsufficientAllowance")) {
                    console.error("💡 Error: Insufficient token allowance");
                } else if (staticError.message.includes("ProposalNotActive")) {
                    console.error("💡 Error: Proposal is not active (ended or executed)");
                } else if (staticError.message.includes("AlreadyVoted")) {
                    console.error("💡 Error: You have already voted on this proposal");
                } else if (staticError.message.includes("ProposerCannotVote")) {
                    console.error("💡 Error: Proposer cannot vote on their own proposal");
                } else {
                    console.error("💡 Unknown contract error - check contract requirements");
                }
            }
            
            throw voteError;
        }
        
    } catch (error) {
        console.error("\n❌ SCRIPT FAILED:");
        console.error("Error:", error.message);
        throw error;
    }
}

// Run the vote
bscVote()
    .then((result) => {
        if (result?.success) {
            console.log(`\n✅ Vote completed successfully! Tx: ${result.hash}`);
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Failed to vote!");
        process.exit(1);
    });

export { bscVote };