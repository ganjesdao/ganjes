#!/usr/bin/env node

// Quick proposal viewer that accepts arguments directly
const { spawn } = require('child_process');
const path = require('path');

// Get the proposal ID from command line arguments
const proposalId = process.argv[2];

if (!proposalId) {
    console.log("🔍 Quick Proposal Viewer");
    console.log("========================\n");
    console.log("❌ No proposal ID provided.");
    console.log("💡 Usage: node scripts/quickView.js <proposal_id>");
    console.log("📝 Examples:");
    console.log("  node scripts/quickView.js 1");
    console.log("  node scripts/quickView.js 2");
    console.log("\n🔄 Alternative:");
    console.log("  PROPOSAL_ID=1 npm run view-proposal");
    process.exit(1);
}

if (isNaN(parseInt(proposalId)) || parseInt(proposalId) <= 0) {
    console.error("❌ Invalid proposal ID:", proposalId);
    console.error("💡 Please provide a positive number");
    process.exit(1);
}

console.log(`🚀 Viewing Proposal #${proposalId}...\n`);

// Set environment variable and run the script
const env = { ...process.env, PROPOSAL_ID: proposalId };

const child = spawn('npm', ['run', 'view-proposal'], {
    env: env,
    stdio: 'inherit',
    shell: true
});

child.on('error', (error) => {
    console.error('❌ Error running script:', error.message);
    process.exit(1);
});

child.on('close', (code) => {
    process.exit(code);
});