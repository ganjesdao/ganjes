import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../../../context/WalletContext';

// Smart contract ABI (replace with your full ABI from Remix/Hardhat)
const GanjesDAOABI = [{"inputs":[{"internalType":"address","name":"_governanceToken","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"depositor","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"FundsDeposited","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"FundsWithdrawn","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"MinInvestmentAmountSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"proposalId","type":"uint256"},{"indexed":false,"internalType":"address","name":"proposer","type":"address"},{"indexed":false,"internalType":"string","name":"description","type":"string"},{"indexed":false,"internalType":"uint256","name":"fundingGoal","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ProposalCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"proposalId","type":"uint256"},{"indexed":false,"internalType":"bool","name":"passed","type":"bool"},{"indexed":false,"internalType":"uint256","name":"amountAllocated","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ProposalExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"proposalId","type":"uint256"},{"indexed":false,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"bool","name":"support","type":"bool"},{"indexed":false,"internalType":"uint256","name":"weight","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"investmentAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"Voted","type":"event"},{"inputs":[],"name":"MIN_QUORUM_PERCENT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MIN_TOKENS_FOR_PROPOSAL","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"VOTING_DURATION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allProposalIds","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"_description","type":"string"},{"internalType":"uint256","name":"_fundingGoal","type":"uint256"}],"name":"createProposal","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"depositFunds","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_proposalId","type":"uint256"}],"name":"executeProposal","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"fundingHistory","outputs":[{"internalType":"uint256","name":"proposalId","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"fundingRecordCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllProposalIds","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getDAOBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_recordId","type":"uint256"}],"name":"getFundingRecord","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_proposalId","type":"uint256"}],"name":"getProposalDetails","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"proposer","type":"address"},{"internalType":"string","name":"description","type":"string"},{"internalType":"uint256","name":"fundingGoal","type":"uint256"},{"internalType":"uint256","name":"totalVotesFor","type":"uint256"},{"internalType":"uint256","name":"totalVotesAgainst","type":"uint256"},{"internalType":"uint256","name":"votersFor","type":"uint256"},{"internalType":"uint256","name":"votersAgainst","type":"uint256"},{"internalType":"uint256","name":"totalInvested","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bool","name":"executed","type":"bool"},{"internalType":"bool","name":"passed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_proposalId","type":"uint256"}],"name":"getVoterCounts","outputs":[{"internalType":"uint256","name":"votersFor","type":"uint256"},{"internalType":"uint256","name":"votersAgainst","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"governanceToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minInvestmentAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proposalCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"proposals","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"proposer","type":"address"},{"internalType":"string","name":"description","type":"string"},{"internalType":"uint256","name":"fundingGoal","type":"uint256"},{"internalType":"uint256","name":"totalVotesFor","type":"uint256"},{"internalType":"uint256","name":"totalVotesAgainst","type":"uint256"},{"internalType":"uint256","name":"votersFor","type":"uint256"},{"internalType":"uint256","name":"votersAgainst","type":"uint256"},{"internalType":"uint256","name":"totalInvested","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bool","name":"executed","type":"bool"},{"internalType":"bool","name":"passed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_minInvestmentAmount","type":"uint256"}],"name":"setMinInvestmentAmount","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_proposalId","type":"uint256"},{"internalType":"bool","name":"_support","type":"bool"},{"internalType":"uint256","name":"_investmentAmount","type":"uint256"}],"name":"vote","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_to","type":"address"}],"name":"withdrawExcessFunds","outputs":[],"stateMutability":"nonpayable","type":"function"}];

// Governance token ABI (minimal for approve and balanceOf)
const TokenABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
];

// Replace with your deployed contract addresses
const DAO_CONTRACT_ADDRESS = "0x42DfcbF08cdf0d7A522E7A1c19ec3cC30a180117"; // Update this
const TOKEN_CONTRACT_ADDRESS = process.env.REACT_APP_TOKEN_ADDRESS; // Update this

const GanjesDAO = () => {
  const { provider, signer, account, contractAddress, isConnected, connectWallet } = useWallet();
  const [daoContract, setDaoContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [daoBalance, setDaoBalance] = useState('0');
  const [minInvestment, setMinInvestment] = useState('0');
  const [proposals, setProposals] = useState([]);
  const [fundingRecords, setFundingRecords] = useState([]);
  const [specificProposal, setSpecificProposal] = useState(null); // NEW: For specific proposal details

  // Form states
  const [proposalDescription, setProposalDescription] = useState('');
  const [fundingGoal, setFundingGoal] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [support, setSupport] = useState(true);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawTo, setWithdrawTo] = useState('');
  const [newMinInvestment, setNewMinInvestment] = useState('');
  const [recordId, setRecordId] = useState('');
  const [specificProposalId, setSpecificProposalId] = useState(''); // NEW: For fetching specific proposal

  // Initialize contracts when wallet is connected
  useEffect(() => {
    const initializeContracts = async () => {
      if (!signer || !provider) return;
      
      try {
        const daoContract = new ethers.Contract(
          contractAddress || DAO_CONTRACT_ADDRESS, 
          GanjesDAOABI, 
          signer
        );
        const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TokenABI, signer);

        setDaoContract(daoContract);
        setTokenContract(tokenContract);

        // Check if user is admin
        const admin = await daoContract.admin();
        setIsAdmin(account.toLowerCase() === admin.toLowerCase());

        // Fetch initial data
        fetchDAOData();
      } catch (error) {
        console.error('Error initializing contracts:', error);
      }
    };

    initializeContracts();
  }, [signer, provider, account, contractAddress]);

  // Define fetchDAOData outside useEffect to avoid dependency issues
  const fetchDAOData = async () => {
    if (!daoContract) return;
    try {
      // Fetch DAO balance
      const balance = await daoContract.getDAOBalance();
      setDaoBalance(ethers.formatEther(balance));

      // Fetch minimum investment amount
      const minInv = await daoContract.minInvestmentAmount();
      setMinInvestment(ethers.formatEther(minInv));

      // Fetch all proposal IDs and details
      const proposalIds = await daoContract.getAllProposalIds();
      const proposalsData = await Promise.all(
        proposalIds.map(async (id) => {
          const details = await daoContract.getProposalDetails(id);
          return {
            id: Number(id),
            proposer: details[1],
            description: details[2],
            fundingGoal: ethers.formatEther(details[3]),
            totalVotesFor: ethers.formatEther(details[4]),
            totalVotesAgainst: ethers.formatEther(details[5]),
            votersFor: Number(details[6]),
            votersAgainst: Number(details[7]),
            totalInvested: ethers.formatEther(details[8]),
            endTime: new Date(Number(details[9]) * 1000).toLocaleString(),
            executed: details[10],
            passed: details[11],
          };
        })
      );
      setProposals(proposalsData);

      // Fetch funding records
      const recordCount = Number(await daoContract.fundingRecordCount());
      const records = [];
      for (let i = 1; i <= recordCount; i++) {
        const record = await daoContract.getFundingRecord(i);
        records.push({
          proposalId: Number(record[0]),
          recipient: record[1],
          amount: ethers.formatEther(record[2]),
          timestamp: new Date(Number(record[3]) * 1000).toLocaleString(),
        });
      }
      setFundingRecords(records);
    } catch (error) {
      console.error('Error fetching DAO data:', error);
    }
  };

  // Fetch specific proposal by ID
  const fetchSpecificProposal = async () => {
    if (!daoContract || !specificProposalId) return;
    try {
      const details = await daoContract.getProposalDetails(specificProposalId);
      const voterCounts = await daoContract.getVoterCounts(specificProposalId);
      const proposalData = {
        id: Number(details[0]),
        proposer: details[1],
        description: details[2],
        fundingGoal: ethers.formatEther(details[3]),
        totalVotesFor: ethers.formatEther(details[4]),
        totalVotesAgainst: ethers.formatEther(details[5]),
        votersFor: Number(voterCounts[0]),
        votersAgainst: Number(voterCounts[1]),
        totalInvested: ethers.formatEther(details[8]),
        endTime: new Date(Number(details[9]) * 1000).toLocaleString(),
        executed: details[10],
        passed: details[11],
      };
      setSpecificProposal(proposalData);
      setSpecificProposalId('');
    } catch (error) {
      console.error('Error fetching specific proposal:', error);
      alert('Failed to fetch proposal. Check proposal ID.');
    }
  };

  // Approve tokens for voting or depositing
  const approveTokens = async (amount) => {
    if (!tokenContract || !signer) return;
    try {
      const tx = await tokenContract.approve(DAO_CONTRACT_ADDRESS, ethers.parseEther(amount));
      await tx.wait();
      alert(`Approved ${amount} tokens for DAO contract!`);
    } catch (error) {
      console.error('Error approving tokens:', error);
      alert('Failed to approve tokens. Check balance and try again.');
    }
  };

  // Create a new proposal
  const handleCreateProposal = async () => {
    if (!daoContract) return;
    try {
      const tx = await daoContract.createProposal(proposalDescription, ethers.parseEther(fundingGoal));
      await tx.wait();
      alert('Proposal created successfully!');
      setProposalDescription('');
      setFundingGoal('');
      fetchDAOData();
    } catch (error) {
      console.error('Error creating proposal:', error);
      alert('Failed to create proposal. Ensure sufficient tokens (100 minimum).');
    }
  };

  // Vote on a proposal
  const handleVote = async () => {
    if (!daoContract || !tokenContract) return;
    try {
      await approveTokens(investmentAmount);
      const tx = await daoContract.vote(proposalId, support, ethers.parseEther(investmentAmount));
      await tx.wait();
      alert('Vote cast successfully!');
      setProposalId('');
      setInvestmentAmount('');
      fetchDAOData();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. Check proposal ID, investment amount, and allowance.');
    }
  };

  // Execute a proposal (admin only)
  const handleExecuteProposal = async () => {
    if (!daoContract || !isAdmin) return;
    try {
      const tx = await daoContract.executeProposal(proposalId);
      await tx.wait();
      alert('Proposal executed successfully!');
      setProposalId('');
      fetchDAOData();
    } catch (error) {
      console.error('Error executing proposal:', error);
      alert('Failed to execute proposal. Check if voting period ended.');
    }
  };

  // Deposit funds
  const handleDepositFunds = async () => {
    if (!daoContract || !tokenContract) return;
    try {
      await approveTokens(depositAmount);
      const tx = await daoContract.depositFunds(ethers.parseEther(depositAmount));
      await tx.wait();
      alert('Funds deposited successfully!');
      setDepositAmount('');
      fetchDAOData();
    } catch (error) {
      console.error('Error depositing funds:', error);
      alert('Failed to deposit funds. Check balance and allowance.');
    }
  };

  // Withdraw excess funds (admin only)
  const handleWithdrawExcessFunds = async () => {
    if (!daoContract || !isAdmin) return;
    try {
      const tx = await daoContract.withdrawExcessFunds(ethers.parseEther(withdrawAmount), withdrawTo);
      await tx.wait();
      alert('Funds withdrawn successfully!');
      setWithdrawAmount('');
      setWithdrawTo('');
      fetchDAOData();
    } catch (error) {
      console.error('Error withdrawing funds:', error);
      alert('Failed to withdraw funds. Check balance and address.');
    }
  };

  // Set minimum investment amount (admin only)
  const handleSetMinInvestment = async () => {
    if (!daoContract || !isAdmin) return;
    try {
      const tx = await daoContract.setMinInvestmentAmount(ethers.parseEther(newMinInvestment));
      await tx.wait();
      alert('Minimum investment amount set successfully!');
      setNewMinInvestment('');
      fetchDAOData();
    } catch (error) {
      console.error('Error setting minimum investment:', error);
      alert('Failed to set minimum investment.');
    }
  };

  // Fetch funding record by ID
  const handleGetFundingRecord = async () => {
    if (!daoContract) return;
    try {
      const record = await daoContract.getFundingRecord(recordId);
      alert(
        `Funding Record: Proposal ID: ${record[0]}, Recipient: ${record[1]}, Amount: ${ethers.formatEther(record[2])} tokens, Timestamp: ${new Date(Number(record[3]) * 1000).toLocaleString()}`
      );
      setRecordId('');
    } catch (error) {
      console.error('Error fetching funding record:', error);
      alert('Failed to fetch funding record. Check record ID.');
    }
  };

  // Fetch data on mount
  useEffect(() => {
    if (daoContract) {
      fetchDAOData();
    }
  }, [daoContract]);

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>GanjesDAO Interface</h1>
      {!isConnected ? (
        <button style={styles.button} onClick={connectWallet}>
          Connect Wallet
        </button>
      ) : (
        <div>
          <p style={styles.info}>Connected Account: {account}</p>
          <p style={styles.info}>DAO Balance: {daoBalance} tokens</p>
          <p style={styles.info}>Minimum Investment: {minInvestment} tokens</p>
          {isAdmin && <p style={styles.info}>You are the admin!</p>}

          {/* Create Proposal */}
          <div style={styles.section}>
            <h2>Create Proposal</h2>
            <input
              style={styles.input}
              type="text"
              placeholder="Description"
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
            />
            <input
              style={styles.input}
              type="number"
              placeholder="Funding Goal (tokens)"
              value={fundingGoal}
              onChange={(e) => setFundingGoal(e.target.value)}
            />
            <button style={styles.button} onClick={handleCreateProposal}>
              Create Proposal
            </button>
          </div>

          {/* Vote on Proposal */}
          <div style={styles.section}>
            <h2>Vote on Proposal</h2>
            <input
              style={styles.input}
              type="number"
              placeholder="Proposal ID"
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
            />
            <select
              style={styles.input}
              value={support}
              onChange={(e) => setSupport(e.target.value === 'true')}
            >
              <option value={true}>Support</option>
              <option value={false}>Against</option>
            </select>
            <input
              style={styles.input}
              type="number"
              placeholder="Investment Amount (tokens)"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
            />
            <button style={styles.button} onClick={handleVote}>
              Vote
            </button>
          </div>

          {/* Execute Proposal (Admin Only) */}
          {isAdmin && (
            <div style={styles.section}>
              <h2>Execute Proposal</h2>
              <input
                style={styles.input}
                type="number"
                placeholder="Proposal ID"
                value={proposalId}
                onChange={(e) => setProposalId(e.target.value)}
              />
              <button style={styles.button} onClick={handleExecuteProposal}>
                Execute Proposal
              </button>
            </div>
          )}

          {/* Deposit Funds */}
          <div style={styles.section}>
            <h2>Deposit Funds</h2>
            <input
              style={styles.input}
              type="number"
              placeholder="Amount (tokens)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <button style={styles.button} onClick={handleDepositFunds}>
              Deposit Funds
            </button>
          </div>

          {/* Withdraw Excess Funds (Admin Only) */}
          {isAdmin && (
            <div style={styles.section}>
              <h2>Withdraw Excess Funds</h2>
              <input
                style={styles.input}
                type="number"
                placeholder="Amount (tokens)"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <input
                style={styles.input}
                type="text"
                placeholder="Recipient Address"
                value={withdrawTo}
                onChange={(e) => setWithdrawTo(e.target.value)}
              />
              <button style={styles.button} onClick={handleWithdrawExcessFunds}>
                Withdraw Funds
              </button>
            </div>
          )}

          {/* Set Minimum Investment (Admin Only) */}
          {isAdmin && (
            <div style={styles.section}>
              <h2>Set Minimum Investment</h2>
              <input
                style={styles.input}
                type="number"
                placeholder="Minimum Investment (tokens)"
                value={newMinInvestment}
                onChange={(e) => setNewMinInvestment(e.target.value)}
              />
              <button style={styles.button} onClick={handleSetMinInvestment}>
                Set Minimum Investment
              </button>
            </div>
          )}

          {/* Fetch Specific Proposal */}
          <div style={styles.section}>
            <h2>Fetch Specific Proposal</h2>
            <input
              style={styles.input}
              type="number"
              placeholder="Proposal ID"
              value={specificProposalId}
              onChange={(e) => setSpecificProposalId(e.target.value)}
            />
            <button style={styles.button} onClick={fetchSpecificProposal}>
              Fetch Proposal
            </button>
            {specificProposal && (
              <div style={styles.proposal}>
                <p><strong>ID:</strong> {specificProposal.id}</p>
                <p><strong>Proposer:</strong> {specificProposal.proposer}</p>
                <p><strong>Description:</strong> {specificProposal.description}</p>
                <p><strong>Funding Goal:</strong> {specificProposal.fundingGoal} tokens</p>
                <p><strong>Total Votes For:</strong> {specificProposal.totalVotesFor} tokens</p>
                <p><strong>Total Votes Against:</strong> {specificProposal.totalVotesAgainst} tokens</p>
                <p><strong>Voters For:</strong> {specificProposal.votersFor}</p>
                <p><strong>Voters Against:</strong> {specificProposal.votersAgainst}</p>
                <p><strong>Total Invested:</strong> {specificProposal.totalInvested} tokens</p>
                <p><strong>End Time:</strong> {specificProposal.endTime}</p>
                <p><strong>Executed:</strong> {specificProposal.executed ? 'Yes' : 'No'}</p>
                <p><strong>Passed:</strong> {specificProposal.passed ? 'Yes' : 'No'}</p>
              </div>
            )}
          </div>

          {/* Fetch All Proposals */}
          <div style={styles.section}>
            <h2>Fetch All Proposals</h2>
            <button style={styles.button} onClick={fetchDAOData}>
              Fetch All Proposals
            </button>
          </div>

          {/* Display Proposals */}
          <div style={styles.section}>
            <h2>All Proposals</h2>
            {proposals.length === 0 ? (
              <p>No proposals found.</p>
            ) : (
              proposals.map((proposal) => (
                <div key={proposal.id} style={styles.proposal}>
                  <p><strong>ID:</strong> {proposal.id}</p>
                  <p><strong>Proposer:</strong> {proposal.proposer}</p>
                  <p><strong>Description:</strong> {proposal.description}</p>
                  <p><strong>Funding Goal:</strong> {proposal.fundingGoal} tokens</p>
                  <p><strong>Total Votes For:</strong> {proposal.totalVotesFor} tokens</p>
                  <p><strong>Total Votes Against:</strong> {proposal.totalVotesAgainst} tokens</p>
                  <p><strong>Voters For:</strong> {proposal.votersFor}</p>
                  <p><strong>Voters Against:</strong> {proposal.votersAgainst}</p>
                  <p><strong>Total Invested:</strong> {proposal.totalInvested} tokens</p>
                  <p><strong>End Time:</strong> {proposal.endTime}</p>
                  <p><strong>Executed:</strong> {proposal.executed ? 'Yes' : 'No'}</p>
                  <p><strong>Passed:</strong> {proposal.passed ? 'Yes' : 'No'}</p>
                </div>
              ))
            )}
          </div>

          {/* Get Funding Record */}
          <div style={styles.section}>
            <h2>Get Funding Record</h2>
            <input
              style={styles.input}
              type="number"
              placeholder="Record ID"
              value={recordId}
              onChange={(e) => setRecordId(e.target.value)}
            />
            <button style={styles.button} onClick={handleGetFundingRecord}>
              Fetch Funding Record
            </button>
          </div>

          {/* Display Funding Records */}
          <div style={styles.section}>
            <h2>Funding Records</h2>
            {fundingRecords.length === 0 ? (
              <p>No funding records found.</p>
            ) : (
              fundingRecords.map((record, index) => (
                <div key={index} style={styles.fundingRecord}>
                  <p><strong>Proposal ID:</strong> {record.proposalId}</p>
                  <p><strong>Recipient:</strong> {record.recipient}</p>
                  <p><strong>Amount:</strong> {record.amount} tokens</p>
                  <p><strong>Timestamp:</strong> {record.timestamp}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Inline CSS styles
const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    textAlign: 'center',
    color: '#333',
  },
  info: {
    fontSize: '16px',
    margin: '5px 0',
  },
  section: {
    margin: '20px 0',
    padding: '15px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    backgroundColor: '#f9f9f9',
  },
  input: {
    padding: '8px',
    margin: '5px',
    width: '200px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  button: {
    padding: '8px 16px',
    margin: '5px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  proposal: {
    margin: '10px 0',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
  },
  fundingRecord: {
    margin: '10px 0',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
  },
};

export default GanjesDAO;