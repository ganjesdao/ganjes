import pkg from 'hardhat';
const { ethers, artifacts } = pkg;
import dotenv from "dotenv";

dotenv.config();

// Command line argument parser
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        command: args[0] || 'help',
        proposalId: null,
        address: null,
        format: 'table' // table, json, csv
    };
    
    for (let i = 1; i < args.length; i += 2) {
        const flag = args[i];
        const value = args[i + 1];
        
        switch (flag) {
            case '--proposal-id':
            case '-p':
                options.proposalId = parseInt(value);
                break;
            case '--address':
            case '-a':
                options.address = value;
                break;
            case '--format':
            case '-f':
                options.format = value;
                break;
        }
    }
    
    return options;
}

// Display help information
function showHelp() {
    console.log(`
📊 Ganjes DAO Data Query Tool
============================

Usage: node scripts/getDataCmd.js <command> [options]

Commands:
  help                          Show this help message
  stats                         Get overall DAO statistics
  proposals                     List all proposals
  proposal --proposal-id <id>   Get specific proposal details
  user --address <address>      Get user statistics and voting history
  config                        Show DAO configuration
  token                         Show token information
  health                        Show DAO health metrics
  active                        Show only active proposals
  history                       Show voting history for all proposals

Options:
  --proposal-id, -p <id>        Proposal ID number
  --address, -a <address>       User address to query
  --format, -f <format>         Output format: table, json, csv (default: table)

Examples:
  node scripts/getDataCmd.js stats
  node scripts/getDataCmd.js proposal -p 1
  node scripts/getDataCmd.js user -a 0x123...
  node scripts/getDataCmd.js proposals --format json
  node scripts/getDataCmd.js active
`);
}

// Initialize contracts
async function initContracts() {
    const [signer] = await ethers.getSigners();
    
    const daoAddress = process.env.DAO_ADDRESS;
    const tokenAddress = process.env.TOKEN_ADDRESS;
    
    if (!daoAddress || !tokenAddress) {
        throw new Error("❌ DAO_ADDRESS and TOKEN_ADDRESS must be set in .env file");
    }
    
    const daoArtifact = await artifacts.readArtifact("GanjesDAOOptimized");
    const tokenArtifact = await artifacts.readArtifact("SimpleToken");
    
    const dao = new ethers.Contract(daoAddress, daoArtifact.abi, signer);
    const token = new ethers.Contract(tokenAddress, tokenArtifact.abi, signer);
    
    return { dao, token, signer, daoAddress, tokenAddress };
}

// Format output based on format type
function formatOutput(data, format, title = "") {
    if (title) console.log(`\n📊 ${title}\n${"=".repeat(title.length + 4)}`);
    
    switch (format) {
        case 'json':
            console.log(JSON.stringify(data, null, 2));
            break;
        case 'csv':
            if (Array.isArray(data) && data.length > 0) {
                const headers = Object.keys(data[0]);
                console.log(headers.join(','));
                data.forEach(row => {
                    console.log(headers.map(h => row[h]).join(','));
                });
            } else {
                console.log("No data available for CSV format");
            }
            break;
        default: // table format
            if (Array.isArray(data)) {
                data.forEach((item, index) => {
                    console.log(`\n📋 Item ${index + 1}:`);
                    Object.entries(item).forEach(([key, value]) => {
                        console.log(`   ${key}: ${value}`);
                    });
                });
            } else {
                Object.entries(data).forEach(([key, value]) => {
                    console.log(`${key}: ${value}`);
                });
            }
    }
}

// Get overall DAO statistics
async function getStats(contracts, format) {
    const { dao, token } = contracts;
    
    const tokenName = await token.name();
    const tokenSymbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    const totalProposals = await dao.getTotalProposals();
    const admin = await dao.admin();
    const minInvestment = await dao.minInvestmentAmount();
    
    const stats = {
        tokenName,
        tokenSymbol,
        totalSupply: ethers.formatEther(totalSupply),
        totalProposals: Number(totalProposals),
        admin,
        minInvestment: ethers.formatEther(minInvestment)
    };
    
    formatOutput(stats, format, "DAO Statistics");
}

// Get all proposals
async function getProposals(contracts, format, activeOnly = false) {
    const { dao } = contracts;
    
    const totalProposals = await dao.getTotalProposals();
    
    if (totalProposals === 0n) {
        console.log("📝 No proposals found");
        return;
    }
    
    const proposals = [];
    const currentTime = Math.floor(Date.now() / 1000);
    
    for (let i = 1; i <= totalProposals; i++) {
        try {
            const proposal = await dao.proposals(i);
            
            const isActive = !proposal.executed && Number(proposal.endTime) > currentTime;
            
            if (activeOnly && !isActive) continue;
            
            const status = proposal.executed ? "Executed" : 
                          isActive ? "Active" : "Expired";
            
            const proposalData = {
                id: i,
                projectName: proposal.projectName,
                description: proposal.description,
                proposer: proposal.proposer,
                fundingGoal: ethers.formatEther(proposal.fundingGoal),
                totalInvested: ethers.formatEther(proposal.totalInvested),
                votesFor: ethers.formatEther(proposal.totalVotesFor),
                votesAgainst: ethers.formatEther(proposal.totalVotesAgainst),
                votersFor: Number(proposal.votersFor),
                votersAgainst: Number(proposal.votersAgainst),
                endTime: new Date(Number(proposal.endTime) * 1000).toISOString(),
                status
            };
            
            proposals.push(proposalData);
        } catch (error) {
            console.error(`❌ Error fetching proposal #${i}:`, error.message);
        }
    }
    
    const title = activeOnly ? "Active Proposals" : "All Proposals";
    formatOutput(proposals, format, title);
}

// Get specific proposal details
async function getProposal(contracts, proposalId, format) {
    const { dao } = contracts;
    
    try {
        const proposal = await dao.proposals(proposalId);
        const currentTime = Math.floor(Date.now() / 1000);
        
        const isActive = !proposal.executed && Number(proposal.endTime) > currentTime;
        const status = proposal.executed ? "Executed" : 
                      isActive ? "Active" : "Expired";
        
        const timeRemaining = Number(proposal.endTime) - currentTime;
        
        const proposalData = {
            id: proposalId,
            projectName: proposal.projectName,
            description: proposal.description,
            proposer: proposal.proposer,
            fundingGoal: ethers.formatEther(proposal.fundingGoal),
            totalInvested: ethers.formatEther(proposal.totalInvested),
            progress: `${((Number(proposal.totalInvested) * 100) / Number(proposal.fundingGoal)).toFixed(1)}%`,
            votesFor: ethers.formatEther(proposal.totalVotesFor),
            votesAgainst: ethers.formatEther(proposal.totalVotesAgainst),
            votersFor: Number(proposal.votersFor),
            votersAgainst: Number(proposal.votersAgainst),
            endTime: new Date(Number(proposal.endTime) * 1000).toISOString(),
            timeRemaining: isActive ? `${Math.floor(timeRemaining / 3600)}h ${Math.floor((timeRemaining % 3600) / 60)}m` : "N/A",
            status,
            executed: proposal.executed
        };
        
        formatOutput(proposalData, format, `Proposal #${proposalId} Details`);
    } catch (error) {
        console.error(`❌ Error fetching proposal #${proposalId}:`, error.message);
    }
}

// Get user statistics and voting history
async function getUserData(contracts, userAddress, format) {
    const { dao, token } = contracts;
    
    try {
        const userBalance = await token.balanceOf(userAddress);
        const userAllowance = await token.allowance(userAddress, contracts.daoAddress);
        const totalProposals = await dao.getTotalProposals();
        
        // Get voting history
        const votingHistory = [];
        let totalInvested = 0n;
        
        for (let i = 1; i <= totalProposals; i++) {
            try {
                const userInvestment = await dao.getUserInvestment(i, userAddress);
                if (userInvestment.hasVoted) {
                    const proposal = await dao.proposals(i);
                    votingHistory.push({
                        proposalId: i,
                        projectName: proposal.projectName,
                        investment: ethers.formatEther(userInvestment.investment),
                        proposalStatus: proposal.executed ? "Executed" : "Pending"
                    });
                    totalInvested += userInvestment.investment;
                }
            } catch (error) {
                // User hasn't voted on this proposal
            }
        }
        
        const userData = {
            address: userAddress,
            tokenBalance: ethers.formatEther(userBalance),
            daoAllowance: ethers.formatEther(userAllowance),
            proposalsVotedOn: votingHistory.length,
            totalInvested: ethers.formatEther(totalInvested),
            votingHistory
        };
        
        formatOutput(userData, format, `User Data for ${userAddress}`);
    } catch (error) {
        console.error(`❌ Error fetching user data:`, error.message);
    }
}

// Get DAO configuration
async function getConfig(contracts, format) {
    const { dao } = contracts;
    
    const admin = await dao.admin();
    const minInvestment = await dao.minInvestmentAmount();
    const votingDuration = await dao.votingDuration();
    const minTokensForProposal = await dao.MIN_TOKENS_FOR_PROPOSAL();
    const creationFeeAmount = await dao.PROPOSAL_CREATION_FEE();
    const maxProposalsPerUser = await dao.maxProposalsPerUser();
    const minQuorumPercent = await dao.MIN_QUORUM_PERCENT();
    const proposalCooldown = await dao.PROPOSAL_COOLDOWN();
    
    const config = {
        admin,
        minInvestment: ethers.formatEther(minInvestment),
        votingDuration: `${votingDuration}s (${Math.floor(Number(votingDuration) / 60)}m)`,
        minTokensForProposal: ethers.formatEther(minTokensForProposal),
        creationFee: ethers.formatEther(creationFeeAmount),
        maxProposalsPerUser: Number(maxProposalsPerUser),
        minQuorumPercent: `${minQuorumPercent}%`,
        proposalCooldown: `${proposalCooldown}s (${Math.floor(Number(proposalCooldown) / 3600)}h)`
    };
    
    formatOutput(config, format, "DAO Configuration");
}

// Get token information
async function getTokenInfo(contracts, format) {
    const { token } = contracts;
    
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    
    const tokenInfo = {
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatEther(totalSupply),
        contractAddress: contracts.tokenAddress
    };
    
    formatOutput(tokenInfo, format, "Token Information");
}

// Get DAO health metrics
async function getHealthMetrics(contracts, format) {
    const { dao } = contracts;
    
    const totalProposals = await dao.getTotalProposals();
    
    if (totalProposals === 0n) {
        console.log("📝 No proposals to analyze for health metrics");
        return;
    }
    
    let activeProposals = 0;
    let executedProposals = 0;
    let totalVoters = 0;
    let totalFundsRaised = 0n;
    let totalFundingRequested = 0n;
    
    const currentTime = Math.floor(Date.now() / 1000);
    
    for (let i = 1; i <= totalProposals; i++) {
        try {
            const proposal = await dao.proposals(i);
            
            const isActive = !proposal.executed && Number(proposal.endTime) > currentTime;
            
            if (isActive) activeProposals++;
            if (proposal.executed) executedProposals++;
            
            totalVoters += Number(proposal.votersFor) + Number(proposal.votersAgainst);
            totalFundsRaised += proposal.totalInvested;
            totalFundingRequested += proposal.fundingGoal;
        } catch (error) {
            console.error(`Error analyzing proposal #${i}`);
        }
    }
    
    const healthMetrics = {
        totalProposals: Number(totalProposals),
        activeProposals,
        executedProposals,
        expiredProposals: Number(totalProposals) - activeProposals - executedProposals,
        successRate: `${totalProposals > 0 ? ((executedProposals / Number(totalProposals)) * 100).toFixed(1) : 0}%`,
        averageVotersPerProposal: (totalVoters / Number(totalProposals)).toFixed(1),
        totalFundingRequested: ethers.formatEther(totalFundingRequested),
        totalFundsRaised: ethers.formatEther(totalFundsRaised),
        fundingEfficiency: `${totalFundingRequested > 0 ? ((Number(totalFundsRaised) * 100) / Number(totalFundingRequested)).toFixed(1) : 0}%`,
        activityLevel: activeProposals > 0 ? "Active" : totalProposals > 0 ? "Dormant" : "Inactive"
    };
    
    formatOutput(healthMetrics, format, "DAO Health Metrics");
}

// Get voting history for all proposals
async function getVotingHistory(contracts, format) {
    const { dao } = contracts;
    
    const totalProposals = await dao.getTotalProposals();
    
    if (totalProposals === 0n) {
        console.log("📝 No voting history available");
        return;
    }
    
    const votingHistory = [];
    
    for (let i = 1; i <= totalProposals; i++) {
        try {
            const proposal = await dao.proposals(i);
            
            const historyItem = {
                proposalId: i,
                projectName: proposal.projectName,
                proposer: proposal.proposer,
                totalVotesFor: ethers.formatEther(proposal.totalVotesFor),
                totalVotesAgainst: ethers.formatEther(proposal.totalVotesAgainst),
                votersFor: Number(proposal.votersFor),
                votersAgainst: Number(proposal.votersAgainst),
                totalInvested: ethers.formatEther(proposal.totalInvested),
                endTime: new Date(Number(proposal.endTime) * 1000).toISOString(),
                executed: proposal.executed
            };
            
            votingHistory.push(historyItem);
        } catch (error) {
            console.error(`Error getting voting history for proposal #${i}`);
        }
    }
    
    formatOutput(votingHistory, format, "Voting History");
}

// Main function
async function main() {
    try {
        const options = parseArgs();
        
        if (options.command === 'help') {
            showHelp();
            return;
        }
        
        console.log("🔍 Ganjes DAO Data Query");
        console.log("========================");
        
        const contracts = await initContracts();
        
        switch (options.command) {
            case 'stats':
                await getStats(contracts, options.format);
                break;
                
            case 'proposals':
                await getProposals(contracts, options.format);
                break;
                
            case 'proposal':
                if (!options.proposalId) {
                    console.error("❌ Proposal ID required. Use --proposal-id or -p flag");
                    return;
                }
                await getProposal(contracts, options.proposalId, options.format);
                break;
                
            case 'user':
                if (!options.address) {
                    console.error("❌ User address required. Use --address or -a flag");
                    return;
                }
                await getUserData(contracts, options.address, options.format);
                break;
                
            case 'config':
                await getConfig(contracts, options.format);
                break;
                
            case 'token':
                await getTokenInfo(contracts, options.format);
                break;
                
            case 'health':
                await getHealthMetrics(contracts, options.format);
                break;
                
            case 'active':
                await getProposals(contracts, options.format, true);
                break;
                
            case 'history':
                await getVotingHistory(contracts, options.format);
                break;
                
            default:
                console.error(`❌ Unknown command: ${options.command}`);
                showHelp();
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

// Run the script
main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));