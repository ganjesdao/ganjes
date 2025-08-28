import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function voteOnProposal() {
    try {
        console.log("🗳️  Ganjes DAO Voting System");
        console.log("============================\n");

        const [signer] = await ethers.getSigners();
        console.log("📝 Voting account:", signer.address);

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

        // Get user's token balance
        const userBalance = await token.balanceOf(signer.address);
        const minInvestment = await dao.minInvestmentAmount();

        console.log(`\n💳 Your Token Balance: ${ethers.formatEther(userBalance)} tokens`);
        console.log(`💵 Minimum Investment: ${ethers.formatEther(minInvestment)} tokens`);

        if (userBalance < minInvestment) {
            throw new Error(`❌ Insufficient tokens. You need at least ${ethers.formatEther(minInvestment)} tokens to vote`);
        }

        // Get total number of proposals
        const totalProposals = await dao.getTotalProposals();
        console.log(`\n📊 Total Proposals: ${totalProposals}`);

        if (totalProposals === 0n) {
            console.log("📝 No proposals available to vote on.");
            return;
        }

        // Show active proposals
        console.log("\n🗳️  ACTIVE PROPOSALS:");
        console.log("=".repeat(50));

        const currentTime = Math.floor(Date.now() / 1000);
        const activeProposals = [];

        for (let i = 1; i <= totalProposals; i++) {
            try {
                const proposal = await dao.proposals(i);

                if (!proposal.executed && Number(proposal.endTime) > currentTime) {
                    activeProposals.push({
                        id: i,
                        projectName: proposal.projectName,
                        proposer: proposal.proposer,
                        fundingGoal: proposal.fundingGoal,
                        endTime: proposal.endTime,
                        totalInvested: proposal.totalInvested
                    });

                    const timeRemaining = Number(proposal.endTime) - currentTime;
                    const hours = Math.floor(timeRemaining / 3600);
                    const minutes = Math.floor((timeRemaining % 3600) / 60);

                    console.log(`\n📋 Proposal #${i}`);
                    console.log(`   📛 Project: ${proposal.projectName}`);
                    console.log(`   👤 Proposer: ${proposal.proposer}`);
                    console.log(`   💰 Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
                    console.log(`   📈 Invested: ${ethers.formatEther(proposal.totalInvested)} tokens`);
                    console.log(`   ⏰ Time Left: ${hours}h ${minutes}m`);


                    // Check if user already voted
                    try {
                        const userInvestment = await dao.getUserInvestment(i, signer.address);
                        if (userInvestment.hasVoted) {
                            console.log(`   🗳️  Status: ✅ Already voted (${ethers.formatEther(userInvestment.investment)} tokens)`);
                        } else {
                            console.log(`   🗳️  Status: 🟢 Available to vote`);
                        }
                    } catch (e) {
                        console.log(`   🗳️  Status: 🟢 Available to vote`);
                    }
                }
            } catch (error) {
                console.log(`   ❌ Error fetching proposal #${i}`);
            }
        }

        if (activeProposals.length === 0) {
            console.log("📝 No active proposals available for voting.");
            return;
        }

        console.log("\n" + "=".repeat(50));

        // Get voting parameters from user
        const proposalIdInput = await askQuestion("\n🆔 Enter Proposal ID to vote on: ");
        const proposalId = parseInt(proposalIdInput);

        if (isNaN(proposalId) || proposalId <= 0 || proposalId > totalProposals) {
            throw new Error("❌ Invalid proposal ID");
        }

        // Check if proposal is active
        const proposal = await dao.proposals(proposalId);

        if (proposal.executed) {
            throw new Error("❌ This proposal has already been executed");
        }

        if (Number(proposal.endTime) <= currentTime) {
            throw new Error("❌ Voting period for this proposal has ended");
        }

        if (proposal.proposer.toLowerCase() === signer.address.toLowerCase()) {
            throw new Error("❌ You cannot vote on your own proposal");
        }



        console.log(`\n📋 Selected Proposal #${proposalId}: ${proposal.projectName}`);
        console.log(`👤 Proposer: ${proposal.proposer}`);
        console.log(`💰 Funding Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
        console.log(`📈 Current Investment: ${ethers.formatEther(proposal.totalInvested)} tokens`);

        // Get vote choice
        const voteChoice = await askQuestion("\n🗳️  Your vote (for/against): ");
        let support;

        if (voteChoice.toLowerCase().startsWith('f') || voteChoice.toLowerCase() === 'yes' || voteChoice.toLowerCase() === 'y') {
            support = true;
            console.log("✅ Voting FOR this proposal");
        } else if (voteChoice.toLowerCase().startsWith('a') || voteChoice.toLowerCase() === 'no' || voteChoice.toLowerCase() === 'n') {
            support = false;
            console.log("❌ Voting AGAINST this proposal");
        } else {
            throw new Error("❌ Invalid vote choice. Please enter 'for' or 'against'");
        }

        // Get investment amount
        const investmentInput = await askQuestion(`\n💰 Investment amount (min ${ethers.formatEther(minInvestment)} tokens): `);
        const investmentAmount = ethers.parseEther(investmentInput);

        if (investmentAmount < minInvestment) {
            throw new Error(`❌ Investment amount must be at least ${ethers.formatEther(minInvestment)} tokens`);
        }

        if (investmentAmount > userBalance) {
            throw new Error(`❌ Insufficient balance. You have ${ethers.formatEther(userBalance)} tokens`);
        }

        if (investmentAmount > proposal.fundingGoal) {
            throw new Error(`❌ Investment cannot exceed funding goal of ${ethers.formatEther(proposal.fundingGoal)} tokens`);
        }

        console.log("\n📊 Vote Summary:");
        console.log(`   🆔 Proposal ID: #${proposalId}`);
        console.log(`   📛 Project: ${proposal.projectName}`);
        console.log(`   🗳️  Vote: ${support ? 'FOR' : 'AGAINST'}`);
        console.log(`   💰 Investment: ${ethers.formatEther(investmentAmount)} tokens`);
        console.log(`   📊 Vote Weight: ${ethers.formatEther(userBalance)} tokens (your total balance)`);

        const confirm = await askQuestion("\n❓ Confirm your vote? (yes/no): ");

        if (!confirm.toLowerCase().startsWith('y')) {
            console.log("❌ Vote cancelled by user");
            return;
        }

        // Check and approve tokens if needed
        console.log("\n🔐 Checking token allowance...");
        const currentAllowance = await token.allowance(signer.address, daoAddress);

        if (currentAllowance < investmentAmount) {
            console.log("🔐 Approving DAO to spend tokens...");
            const approveTx = await token.approve(daoAddress, investmentAmount);
            await approveTx.wait();
            console.log("✅ Token approval confirmed");
        }

        // Submit vote
        console.log("\n🗳️  Submitting your vote...");

        // Estimate gas
        const gasEstimate = await dao.vote.estimateGas(proposalId, support, investmentAmount);
        console.log(`⛽ Gas estimate: ${gasEstimate}`);

        // Submit actual transaction
        const voteTx = await dao.vote(proposalId, support, investmentAmount, {
            gasLimit: gasEstimate + 100000n // Add buffer
        });


        // const voteTx = await dao.vote(proposalId, support, investmentAmount, {
        //     gasLimit: 210000
        // });

        console.log("⏳ Waiting for transaction confirmation...");
        const receipt = await voteTx.wait();

        // Parse vote event
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

            console.log("\n🎉 Vote Successfully Submitted!");
            console.log("=====================================");
            console.log(`🆔 Proposal ID: #${decodedEvent.args.proposalId}`);
            console.log(`🗳️  Vote: ${decodedEvent.args.support ? 'FOR' : 'AGAINST'}`);
            console.log(`💰 Investment: ${ethers.formatEther(decodedEvent.args.investmentAmount)} tokens`);
            console.log(`📊 Vote Weight: ${ethers.formatEther(decodedEvent.args.weight)} tokens`);
            console.log(`📅 Transaction Hash: ${receipt.hash}`);
            console.log(`🏗️  Block Number: ${receipt.blockNumber}`);

            // Show updated proposal stats
            const updatedProposal = await dao.proposals(proposalId);
            console.log("\n📈 Updated Proposal Statistics:");
            console.log(`   👍 Votes FOR: ${ethers.formatEther(updatedProposal.totalVotesFor)} (${updatedProposal.votersFor} voters)`);
            console.log(`   👎 Votes AGAINST: ${ethers.formatEther(updatedProposal.totalVotesAgainst)} (${updatedProposal.votersAgainst} voters)`);
            console.log(`   💸 Total Invested: ${ethers.formatEther(updatedProposal.totalInvested)} tokens`);

            const fundingProgress = Number((updatedProposal.totalInvested * 100n) / proposal.fundingGoal);
            console.log(`   📊 Funding Progress: ${Math.min(fundingProgress, 100).toFixed(1)}%`);

            console.log("\n💡 Next Steps:");
            console.log("   - Your tokens are now locked until proposal execution");
            console.log("   - If proposal passes, funds go to the proposer");
            console.log("   - If proposal fails, you can claim your investment back");
            console.log("   - Monitor proposal progress with: npm run get-proposals");

            return {
                proposalId: proposalId,
                support: support,
                investmentAmount: ethers.formatEther(investmentAmount),
                voteWeight: ethers.formatEther(decodedEvent.args.weight),
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };
        } else {
            throw new Error("❌ Vote event not found in transaction receipt");
        }

    } catch (error) {
        console.error("\n❌ Error voting on proposal:", error.message);

        if (error.code === 'CALL_EXCEPTION') {
            console.error("💡 This might be due to:");
            console.error("  - Proposal doesn't exist or has ended");
            console.error("  - You already voted on this proposal");
            console.error("  - Insufficient token balance or allowance");
            console.error("  - You are the proposer (cannot vote on own proposal)");
            console.error("  - Investment amount is invalid");
        }

        throw error;
    } finally {
        rl.close();
    }
}

// Quick vote function with parameters
async function quickVote() {
    const proposalId = process.env.PROPOSAL_ID;
    const voteChoice = process.env.VOTE_CHOICE; // 'for' or 'against'
    const investmentAmount = process.env.INVESTMENT_AMOUNT;

    if (!proposalId || !voteChoice || !investmentAmount) {
        console.log("🗳️  Quick Vote Usage:");
        console.log("PROPOSAL_ID=1 VOTE_CHOICE=for INVESTMENT_AMOUNT=50 npm run quick-vote");
        return;
    }

    try {
        console.log("🚀 Quick Vote Mode");
        console.log("==================");
        console.log(`🆔 Proposal: #${proposalId}`);
        console.log(`🗳️  Vote: ${voteChoice.toUpperCase()}`);
        console.log(`💰 Investment: ${investmentAmount} tokens`);

        const [signer] = await ethers.getSigners();
        const daoAddress = process.env.DAO_ADDRESS;
        const tokenAddress = process.env.TOKEN_ADDRESS;

        const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
        const tokenArtifact = await artifacts.readArtifact("SimpleToken");

        const dao = new ethers.Contract(daoAddress, daoArtifact.abi, signer);
        const token = new ethers.Contract(tokenAddress, tokenArtifact.abi, signer);

        const support = voteChoice.toLowerCase().startsWith('f');
        const investment = ethers.parseEther(investmentAmount);

        // Check allowance and approve if needed
        const currentAllowance = await token.allowance(signer.address, daoAddress);
        if (currentAllowance < investment) {
            console.log("🔐 Approving tokens...");
            const approveTx = await token.approve(daoAddress, investment);
            await approveTx.wait();
        }

        // Submit vote
        console.log("🗳️  Submitting vote...");
        const voteTx = await dao.vote(parseInt(proposalId), support, investment);
        const receipt = await voteTx.wait();

        console.log("✅ Vote submitted successfully!");
        console.log(`📅 Transaction: ${receipt.hash}`);

    } catch (error) {
        console.error("❌ Quick vote failed:", error.message);
        throw error;
    }
}

// Check which mode to run
const args = process.argv.slice(2);
const isQuickMode = process.env.PROPOSAL_ID && process.env.VOTE_CHOICE && process.env.INVESTMENT_AMOUNT;

if (isQuickMode) {
    quickVote()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} else {
    voteOnProposal()
        .then(() => {
            console.log("\n✅ Voting completed!");
            process.exit(0);
        })
        .catch(() => {
            process.exit(1);
        });
}

export { voteOnProposal, quickVote };