#!/usr/bin/env node

// Quick vote script that accepts arguments directly
const { spawn } = require('child_process');

// Get arguments from command line
const proposalId = process.argv[2];
const voteChoice = process.argv[3]; // 'for' or 'against'
const investmentAmount = process.argv[4];

function showHelp() {
    console.log("🗳️  Quick Vote for Ganjes DAO");
    console.log("============================\n");
    console.log("📋 Usage:");
    console.log("  node scripts/quickVote.cjs <proposal_id> <vote_choice> <investment_amount>");
    console.log("\n📝 Parameters:");
    console.log("  proposal_id      - ID of proposal to vote on (e.g., 1, 2, 3)");
    console.log("  vote_choice      - 'for' or 'against'");
    console.log("  investment_amount - Amount of tokens to invest (e.g., 50, 100)");
    console.log("\n📝 Examples:");
    console.log("  node scripts/quickVote.cjs 1 for 50");
    console.log("  node scripts/quickVote.cjs 2 against 25");
    console.log("  node scripts/quickVote.cjs 3 for 100");
    console.log("\n🔄 Alternative:");
    console.log("  npm run vote-proposal          # Interactive mode");
    console.log("  PROPOSAL_ID=1 VOTE_CHOICE=for INVESTMENT_AMOUNT=50 npm run vote-proposal");
}

if (!proposalId || !voteChoice || !investmentAmount || 
    proposalId === '--help' || proposalId === '-h') {
    showHelp();
    process.exit(1);
}

// Validate inputs
if (isNaN(parseInt(proposalId)) || parseInt(proposalId) <= 0) {
    console.error("❌ Invalid proposal ID:", proposalId);
    console.error("💡 Please provide a positive number");
    process.exit(1);
}

if (!['for', 'against', 'yes', 'no', 'y', 'n'].includes(voteChoice.toLowerCase())) {
    console.error("❌ Invalid vote choice:", voteChoice);
    console.error("💡 Please use 'for' or 'against'");
    process.exit(1);
}

if (isNaN(parseFloat(investmentAmount)) || parseFloat(investmentAmount) <= 0) {
    console.error("❌ Invalid investment amount:", investmentAmount);
    console.error("💡 Please provide a positive number");
    process.exit(1);
}

// Normalize vote choice
const normalizedVote = ['for', 'yes', 'y'].includes(voteChoice.toLowerCase()) ? 'for' : 'against';

console.log(`🗳️  Quick Vote on Proposal #${proposalId}`);
console.log(`   📊 Vote: ${normalizedVote.toUpperCase()}`);
console.log(`   💰 Investment: ${investmentAmount} tokens`);
console.log("");

// Set environment variables and run the script
const env = { 
    ...process.env, 
    PROPOSAL_ID: proposalId,
    VOTE_CHOICE: normalizedVote,
    INVESTMENT_AMOUNT: investmentAmount
};

const child = spawn('npm', ['run', 'vote-proposal'], {
    env: env,
    stdio: 'inherit',
    shell: true
});

child.on('error', (error) => {
    console.error('❌ Error running vote script:', error.message);
    process.exit(1);
});

child.on('close', (code) => {
    process.exit(code);
});