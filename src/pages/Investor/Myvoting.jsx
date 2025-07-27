import React, { useState, useEffect } from 'react';
import Header from './component/Header';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import Auth from './auth/Auth';
import { daoABI } from '../../Auth/Abi';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getContractAddress, isTestnet } from '../../utils/networks';
import { FaEye, FaVoteYea, FaCoins, FaThumbsUp, FaThumbsDown, FaExclamationTriangle, FaCalendarAlt, FaHistory, FaArrowRight, FaTrophy, FaFire, FaPercentage, FaChartBar, FaAward, FaDollarSign, FaChartLine } from 'react-icons/fa';


// Simple ERC20 ABI for token operations
const tokenABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
];

function MyVoting() {
  // Add custom styles for voting history cards
  const cardStyles = `
    <style>
      .vote-history-card {
        transition: all 0.3s ease;
        border: 1px solid #e3e6f0 !important;
      }
      .vote-history-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
      }
      .text-truncate-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .gradient-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      .analytics-card {
        transition: all 0.3s ease;
        border-radius: 15px !important;
        border: none !important;
        overflow: hidden;
      }
      .analytics-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175) !important;
      }
      .analytics-icon {
        font-size: 3rem;
        opacity: 0.8;
      }
      .bg-gradient-primary {
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important;
      }
      .bg-gradient-success {
        background: linear-gradient(135deg, #28a745 0%, #155724 100%) !important;
      }
      .proposal-overview-card {
        transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        border: none !important;
        border-radius: 20px !important;
        background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
        overflow: hidden;
        position: relative;
      }
      .proposal-overview-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .proposal-overview-card:hover::before {
        opacity: 1;
      }
      .proposal-overview-card:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 20px 40px rgba(102, 126, 234, 0.15) !important;
      }
      .proposal-status-badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        font-weight: 600;
        padding: 0.5rem 1rem;
        border-radius: 25px;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .proposal-id-circle {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }
      .proposal-id-circle::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
        transform: rotate(45deg);
        transition: transform 0.6s ease;
      }
      .proposal-overview-card:hover .proposal-id-circle::before {
        transform: rotate(225deg);
      }
      .funding-progress-modern {
        height: 8px;
        background: linear-gradient(90deg, #e9ecef 0%, #dee2e6 100%);
        border-radius: 10px;
        overflow: hidden;
        position: relative;
      }
      .funding-progress-bar {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        height: 100%;
        border-radius: 10px;
        position: relative;
        overflow: hidden;
      }
      .funding-progress-bar::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        animation: shimmer 2s infinite;
      }
      @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }
      .vote-stat-modern {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 15px;
        padding: 1rem;
        text-align: center;
        position: relative;
        overflow: hidden;
      }
      .vote-stat-modern::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1), transparent);
        transition: left 0.5s ease;
      }
      .proposal-overview-card:hover .vote-stat-modern::before {
        left: 100%;
      }
      .action-btn-modern {
        border: 2px solid transparent;
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(135deg, #667eea, #764ba2) border-box;
        border-radius: 25px;
        transition: all 0.3s ease;
        font-weight: 600;
        position: relative;
        overflow: hidden;
      }
      .action-btn-modern:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(102, 126, 234, 0.2);
      }
      .action-btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
      }
    </style>
  `;

  // Inject styles
  React.useEffect(() => {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = cardStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  const [support, setSupport] = useState(true);
  const navigate = useNavigate();
  const pId = localStorage.getItem('proposalId');
  const [walletAddress, setWalletAddress] = useState(null);
  const [isToggle, setIsToggle] = useState(false);
  const [daoContract, setDaoContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState("");
  const authToken = sessionStorage.getItem('authToken');
  const tokenContract = process.env.REACT_APP_TOKEN_ADDRESS;
  const [signer, setSigner] = useState(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [voteAmount, setVoteAmount] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [votingHistory, setVotingHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalVotes: 0,
    totalProjects: 0,
    totalInvestment: 0,
    votesFor: 0,
    votesAgainst: 0,
    successRate: 0,
    averageInvestment: 0,
    executedProjects: 0,
    monthlyVotes: 0,
    mostActiveMonth: '',
    topInvestment: 0
  });
  const [recentProposals, setRecentProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);


  // Wallet connection check
  useEffect(() => {
    const checkWalletConnected = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error("Failed to check connected accounts:", error);
      }
    };

    checkWalletConnected();

    // Listen for account changes
    window.ethereum?.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setWalletAddress(null);
      }
    });

    return () => {
      window.ethereum?.removeListener('accountsChanged', () => { });
    };
  }, []);

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not found. Please install it.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      setWalletAddress(accounts[0]);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      toast.error("Failed to connect wallet!");
    }
  };

  // Navigate to dashboard
  const navigateToDashboard = () => {
    if (walletAddress) {
      navigate('/dashboard');
    } else {
      connectWallet();
    }
  };


  // Handle network change
  const handleNetworkChange = (network) => {
    setCurrentNetwork(network);
    if (network) {
      const address = getContractAddress(network.chainId);
      setContractAddress(address);
      console.log(`Network changed to: ${network.chainName}`);
      console.log(`Contract address: ${address}`);

      // Initialize contract with new network
      initializeContract(address);
    } else {
      setContractAddress("");
      setDaoContract(null);
    }
  };

  // Initialize contract
  const initializeContract = async (contractAddr) => {
    if (!contractAddr || contractAddr === '0x0000000000000000000000000000000000000000') {
      toast.warning("⚠️ Contract not deployed on this network yet!");
      setDaoContract(null);
      return;
    }

    if (typeof window.ethereum === 'undefined') {
      toast.error("Please install MetaMask!");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      setSigner(signer);

      const contract = new ethers.Contract(contractAddr, daoABI, signer);
      setDaoContract(contract);


      toast.success(`✅ Connected to contract on ${currentNetwork?.chainName}`);
    } catch (error) {
      console.error("Init error:", error.message);

      if (error.message.includes("could not detect network")) {
        toast.error("❌ Failed to connect to the network. Please check your wallet connection.");
      } else if (error.message.includes("user rejected")) {
        toast.error("❌ Connection rejected by user.");
      } else {
        toast.error(`❌ Failed to initialize contract: ${error.message}`);
      }

      setDaoContract(null);
    } finally {
      setLoading(false);
    }
  };


  // Fetch voting history when wallet and contract are ready
  useEffect(() => {
    if (daoContract && walletAddress) {
      fetchVotingHistory();
    }
  }, [daoContract, walletAddress]);

  // Fetch recent proposals when contract is ready
  useEffect(() => {
    if (daoContract) {
      fetchRecentProposals();
    }
  }, [daoContract]);


  const closeVoteModal = () => {
    setShowVoteModal(false);
    setVoteAmount(15);
  };

  const handleVoteSubmit = () => {
    if (pId && voteAmount > 0) {
      handleVote(pId, voteAmount);
    } else {
      toast.error("Please enter a valid vote amount");
    }
  };

  const handleVote = async (proposalId, amount) => {
    console.log('Proposal ID', proposalId, 'Amount:', amount);
    if (!contractAddress || !tokenContract || !daoContract) {
      toast.error("Contract not initialized properly");
      return;
    }

    try {
      setLoading(true);
      toast.info("Approving tokens...");

      // Convert amount to string for consistency
      const amountStr = amount.toString();

      await approveTokens(amountStr);

      toast.info("Casting vote...");
      const tx = await daoContract.vote(proposalId, support, ethers.parseEther(amountStr));
      await tx.wait();

      toast.success('Vote cast successfully!');
      closeVoteModal();


    } catch (error) {
      console.error('Error voting:', error);
      if (error.message.includes("insufficient allowance")) {
        toast.error('Insufficient token allowance. Please approve tokens first.');
      } else if (error.message.includes("insufficient balance")) {
        toast.error('Insufficient token balance.');
      } else if (error.message.includes("user rejected")) {
        toast.error('Transaction rejected by user.');
      } else {
        toast.error('Failed to vote. Check proposal ID, investment amount, and allowance.');
      }
    } finally {
      setLoading(false);
    }
  };


  // Fetch voting history using getVotesByInvestor
  const fetchVotingHistory = async () => {
    if (!daoContract || !walletAddress) {
      console.warn("Contract or wallet address not available");
      return;
    }

    try {
      setLoadingHistory(true);
      console.log("Fetching voting history for:", walletAddress);

      // Check if method exists in ABI
      if (!daoContract.interface.hasFunction("getVotesByInvestor")) {
        console.warn("⚠ Method getVotesByInvestor not found in contract ABI.");
        toast.error("The contract does not support voting history.");
        return;
      }

      // Call the function safely
      let votes;
      try {
        votes = await daoContract.getVotesByInvestor(walletAddress);
        console.log("✅ Votes fetched:", votes);
      } catch (callError) {
        console.warn("⚠ getVotesByInvestor() reverted, trying callStatic...");
        try {
          votes = await daoContract.callStatic.getVotesByInvestor(walletAddress);
          console.log("✅ Fallback callStatic result:", votes);
        } catch (staticErr) {
          console.error("❌ getVotesByInvestor failed:", staticErr);
          toast.error("⚠ Unable to fetch votes. You may not have voted yet.");
          return;
        }
      }

      // Parse and format voting history
      if (!votes || votes.length === 0) {
        console.log("ℹ No votes found for address:", walletAddress);
        setVotingHistory([]);
        return;
      }

      // Format vote data with proposal details
      const formattedVotes = await Promise.all(
        votes.map(async (vote, index) => {
          try {
            const proposalId = Number(vote.proposalId);
            const proposalBasic = await daoContract.getProposalBasicDetails(proposalId);

            return {
              id: index,
              proposalId: proposalId,
              projectName: proposalBasic.projectName,
              description: proposalBasic.description,
              support: vote.support,
              investmentAmount: ethers.formatEther(vote.investmentAmount),
              timestamp: new Date(Number(vote.timestamp) * 1000),
              proposalStatus: proposalBasic.executed ? 'Executed' : 'Pending'
            };
          } catch (error) {
            console.error(`Error fetching proposal ${vote.proposalId} details:`, error);
            return {
              id: index,
              proposalId: Number(vote.proposalId),
              projectName: "Unknown Project",
              description: "Unable to fetch proposal details",
              support: vote.support,
              investmentAmount: ethers.formatEther(vote.investmentAmount),
              timestamp: new Date(Number(vote.timestamp) * 1000),
              proposalStatus: "Unknown"
            };
          }
        })
      );

      setVotingHistory(formattedVotes);
      console.log("✅ Formatted voting history:", formattedVotes);

      // Calculate analytics
      calculateAnalytics(formattedVotes);

    } catch (error) {
      console.error("❌ Error fetching voting history:", error);
      toast.error("Failed to fetch voting history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Calculate analytics from voting history
  const calculateAnalytics = (votes) => {
    if (!votes || votes.length === 0) {
      setAnalytics({
        totalVotes: 0,
        totalProjects: 0,
        totalInvestment: 0,
        votesFor: 0,
        votesAgainst: 0,
        successRate: 0,
        averageInvestment: 0,
        executedProjects: 0,
        monthlyVotes: 0,
        mostActiveMonth: '',
        topInvestment: 0
      });
      return;
    }

    const totalVotes = votes.length;
    const uniqueProjects = new Set(votes.map(vote => vote.proposalId)).size;
    const totalInvestment = votes.reduce((sum, vote) => sum + parseFloat(vote.investmentAmount), 0);
    const votesFor = votes.filter(vote => vote.support).length;
    const votesAgainst = votes.filter(vote => !vote.support).length;
    const executedProjects = votes.filter(vote => vote.proposalStatus === 'Executed').length;
    const successRate = totalVotes > 0 ? (executedProjects / totalVotes * 100) : 0;
    const averageInvestment = totalVotes > 0 ? totalInvestment / totalVotes : 0;
    const topInvestment = Math.max(...votes.map(vote => parseFloat(vote.investmentAmount)));

    // Calculate monthly statistics
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyVotes = votes.filter(vote =>
      vote.timestamp.getMonth() === currentMonth &&
      vote.timestamp.getFullYear() === currentYear
    ).length;

    // Find most active month
    const monthCounts = {};
    votes.forEach(vote => {
      const monthKey = `${vote.timestamp.getFullYear()}-${vote.timestamp.getMonth()}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    const mostActiveMonthKey = Object.keys(monthCounts).reduce((a, b) =>
      monthCounts[a] > monthCounts[b] ? a : b, Object.keys(monthCounts)[0] || ''
    );

    const mostActiveMonth = mostActiveMonthKey ?
      new Date(parseInt(mostActiveMonthKey.split('-')[0]), parseInt(mostActiveMonthKey.split('-')[1])).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

    setAnalytics({
      totalVotes,
      totalProjects: uniqueProjects,
      totalInvestment: parseFloat(totalInvestment.toFixed(2)),
      votesFor,
      votesAgainst,
      successRate: parseFloat(successRate.toFixed(1)),
      averageInvestment: parseFloat(averageInvestment.toFixed(2)),
      executedProjects,
      monthlyVotes,
      mostActiveMonth,
      topInvestment: parseFloat(topInvestment.toFixed(2))
    });
  };

  // Fetch recent proposals for overview
  const fetchRecentProposals = async () => {
    if (!daoContract) {
      console.warn("Contract not available for fetching proposals");
      return;
    }

    try {
      setLoadingProposals(true);
      console.log("Fetching recent proposals...");

      // Get all proposal IDs
      const allIds = await daoContract.getAllProposalIds();
      console.log("All proposal IDs:", allIds);
      
      if (!allIds || allIds.length === 0) {
        setRecentProposals([]);
        return;
      }

      // Get the 6 most recent proposals (or all if less than 6)
      const recentIds = allIds.slice(-6).reverse(); // Get last 6 and reverse for newest first

      // Fetch details for each recent proposal
      const proposalPromises = recentIds.map(async (id) => {
        try {
          const proposalBasic = await daoContract.getProposalBasicDetails(Number(id));
          const votingDetails = await daoContract.getProposalVotingDetails(Number(id));
          
          return {
            id: Number(id),
            projectName: proposalBasic.projectName,
            description: proposalBasic.description,
            projectUrl: proposalBasic.projectUrl,
            proposer: proposalBasic.proposer,
            fundingGoal: ethers.formatEther(proposalBasic.fundingGoal),
            endTime: new Date(Number(proposalBasic.endTime) * 1000),
            executed: proposalBasic.executed,
            passed: proposalBasic.passed,
            totalVotesFor: Number(votingDetails.totalVotesFor),
            totalVotesAgainst: Number(votingDetails.totalVotesAgainst),
            votersFor: Number(votingDetails.votersFor),
            votersAgainst: Number(votingDetails.votersAgainst),
            totalInvested: ethers.formatEther(votingDetails.totalInvested),
            isActive: new Date() < new Date(Number(proposalBasic.endTime) * 1000),
            progressPercentage: proposalBasic.fundingGoal > 0 ? 
              (Number(votingDetails.totalInvested) / Number(proposalBasic.fundingGoal) * 100) : 0
          };
        } catch (error) {
          console.error(`Error fetching proposal ${id} details:`, error);
          return null;
        }
      });

      const proposals = await Promise.all(proposalPromises);
      const validProposals = proposals.filter(proposal => proposal !== null);
      
      setRecentProposals(validProposals);
      console.log("✅ Recent proposals fetched:", validProposals);

    } catch (error) {
      console.error("❌ Error fetching recent proposals:", error);
      toast.error("Failed to fetch recent proposals");
    } finally {
      setLoadingProposals(false);
    }
  };

  const approveTokens = async (amount) => {
    if (!tokenContract || !signer) {
      toast.error("Token contract or signer not initialized");
      return;
    }

    try {
      // Create token contract instance using the address and ABI
      const tokenContractInstance = new ethers.Contract(tokenContract, tokenABI, signer);

      const tx = await tokenContractInstance.approve(contractAddress, ethers.parseEther(amount));
      await tx.wait();

      toast.success(`Approved ${amount} tokens for DAO contract!`);
    } catch (error) {
      console.error('Error approving tokens:', error);
      if (error.message.includes("user rejected")) {
        toast.error('Token approval rejected by user.');
      } else {
        toast.error('Failed to approve tokens. Check balance and try again.');
      }
      throw error; // Re-throw to handle in voting function
    }
  };


  const voteAgainsts = () => {
    setSupport(false);
    setVoteAmount(1)
  };

  const handleProfileDataFetched = () => {
    // Handle Auth result if needed
  };


  return (
    <>
      {!authToken && <Auth onProfileDataFetched={handleProfileDataFetched} />}
      <div className={isToggle ? 'sb-nav-fixed sb-sidenav-toggled' : 'sb-nav-fixed'}>
        <Header isToggle={isToggle} setIsToggle={setIsToggle} onNetworkChange={handleNetworkChange} />
        <div id="layoutSidenav">
          <div id="layoutSidenav_nav">
            <nav className="sb-sidenav accordion sb-sidenav-dark" id="sidenavAccordion">
              <Sidebar />
            </nav>
          </div>
          <div id="layoutSidenav_content">
            <main>
              {/* Stats Section */}
              <section className="py-4 mt-4">
                {isLoading ? (
                  <div className="text-center my-5">
                    <div className="spinner-border text-primary" role="status" style={{ width: '4rem', height: '4rem' }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3 text-muted">Fetching proposals from blockchain...</p>
                  </div>
                ) : (
                  <div className="container-fluid">
                    {/* Analytics Dashboard */}
                    <div className="row mb-4">
                      <div className="col-12">
                        <div className="card shadow-lg border-0">
                          <div className="card-header gradient-header text-white py-3">
                            <h4 className="card-title mb-0 fw-bold">
                              <FaChartBar className="me-2" />
                              Voting Analytics Dashboard
                            </h4>
                          </div>
                          <div className="card-body p-4">
                            {loadingHistory ? (
                              <div className="text-center py-4">
                                <div className="spinner-border text-primary mb-3" role="status">
                                  <span className="visually-hidden">Loading analytics...</span>
                                </div>
                                <p className="text-muted">Calculating your voting statistics...</p>
                              </div>
                            ) : (
                              <div className="row g-4">
                                {/* Total Votes */}
                                <div className="col-lg-3 col-md-6 col-12">
                                  <div className="analytics-card bg-primary text-white h-100">
                                    <div className="card-body text-center p-4">
                                      <div className="mb-3">
                                        <FaVoteYea className="analytics-icon" />
                                      </div>
                                      <h2 className="fw-bold mb-2">{analytics.totalVotes}</h2>
                                      <p className="mb-1 opacity-75">Total Votes Cast</p>
                                      <small className="opacity-50">Lifetime participation</small>
                                    </div>
                                  </div>
                                </div>

                                {/* Total Projects */}
                                <div className="col-lg-3 col-md-6 col-12">
                                  <div className="analytics-card bg-success text-white h-100">
                                    <div className="card-body text-center p-4">
                                      <div className="mb-3">
                                        <FaTrophy className="analytics-icon" />
                                      </div>
                                      <h2 className="fw-bold mb-2">{analytics.totalProjects}</h2>
                                      <p className="mb-1 opacity-75">Projects Voted</p>
                                      <small className="opacity-50">Unique proposals</small>
                                    </div>
                                  </div>
                                </div>

                                {/* Total Investment */}
                                <div className="col-lg-3 col-md-6 col-12">
                                  <div className="analytics-card bg-warning text-white h-100">
                                    <div className="card-body text-center p-4">
                                      <div className="mb-3">
                                        <FaDollarSign className="analytics-icon" />
                                      </div>
                                      <h2 className="fw-bold mb-2">{analytics.totalInvestment}</h2>
                                      <p className="mb-1 opacity-75">GNJ Invested</p>
                                      <small className="opacity-50">Total contribution</small>
                                    </div>
                                  </div>
                                </div>

                                {/* Success Rate */}
                                <div className="col-lg-3 col-md-6 col-12">
                                  <div className="analytics-card bg-info text-white h-100">
                                    <div className="card-body text-center p-4">
                                      <div className="mb-3">
                                        <FaPercentage className="analytics-icon" />
                                      </div>
                                      <h2 className="fw-bold mb-2">{analytics.successRate}%</h2>
                                      <p className="mb-1 opacity-75">Success Rate</p>
                                      <small className="opacity-50">Executed proposals</small>
                                    </div>
                                  </div>
                                </div>

                                {/* Secondary Analytics Row */}
                                <div className="col-lg-4 col-md-6 col-12">
                                  <div className="card border-0 bg-light h-100">
                                    <div className="card-body text-center p-4">
                                      <div className="d-flex justify-content-center align-items-center mb-3">
                                        <div className="bg-success rounded-circle p-3 me-3">
                                          <FaThumbsUp className="text-white" />
                                        </div>
                                        <div className="bg-danger rounded-circle p-3">
                                          <FaThumbsDown className="text-white" />
                                        </div>
                                      </div>
                                      <div className="row">
                                        <div className="col-6">
                                          <h4 className="text-success mb-1">{analytics.votesFor}</h4>
                                          <small className="text-muted">For</small>
                                        </div>
                                        <div className="col-6">
                                          <h4 className="text-danger mb-1">{analytics.votesAgainst}</h4>
                                          <small className="text-muted">Against</small>
                                        </div>
                                      </div>
                                      <p className="text-muted mb-0 mt-2">Vote Distribution</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Average Investment */}
                                <div className="col-lg-4 col-md-6 col-12">
                                  <div className="card border-0 bg-light h-100">
                                    <div className="card-body text-center p-4">
                                      <div className="bg-primary rounded-circle p-3 mx-auto mb-3" style={{ width: 'fit-content' }}>
                                        <FaCoins className="text-white" />
                                      </div>
                                      <h4 className="text-primary mb-2">{analytics.averageInvestment} GNJ</h4>
                                      <p className="text-muted mb-1">Average Investment</p>
                                      <small className="text-muted">Per vote</small>
                                    </div>
                                  </div>
                                </div>

                                {/* Top Investment */}
                                <div className="col-lg-4 col-md-6 col-12">
                                  <div className="card border-0 bg-light h-100">
                                    <div className="card-body text-center p-4">
                                      <div className="bg-warning rounded-circle p-3 mx-auto mb-3" style={{ width: 'fit-content' }}>
                                        <FaAward className="text-white" />
                                      </div>
                                      <h4 className="text-warning mb-2">{analytics.topInvestment} GNJ</h4>
                                      <p className="text-muted mb-1">Highest Investment</p>
                                      <small className="text-muted">Single vote</small>
                                    </div>
                                  </div>
                                </div>

                                {/* Monthly Activity */}
                                <div className="col-lg-6 col-md-6 col-12">
                                  <div className="card border-0 bg-gradient-primary text-white h-100">
                                    <div className="card-body text-center p-4">
                                      <div className="mb-3">
                                        <FaFire className="analytics-icon" />
                                      </div>
                                      <h3 className="fw-bold mb-2">{analytics.monthlyVotes}</h3>
                                      <p className="mb-1 opacity-75">Votes This Month</p>
                                      <small className="opacity-50">Keep the momentum!</small>
                                    </div>
                                  </div>
                                </div>

                                {/* Most Active Month */}
                                <div className="col-lg-6 col-md-6 col-12">
                                  <div className="card border-0 bg-gradient-success text-white h-100">
                                    <div className="card-body text-center p-4">
                                      <div className="mb-3">
                                        <FaCalendarAlt className="analytics-icon" />
                                      </div>
                                      <h5 className="fw-bold mb-2">{analytics.mostActiveMonth || 'N/A'}</h5>
                                      <p className="mb-1 opacity-75">Most Active Month</p>
                                      <small className="opacity-50">Peak engagement period</small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Proposals Overview */}
                    <div className="row mb-4">
                      <div className="col-12">
                        <div className="card shadow-lg border-0">
                          <div className="card-header gradient-header text-white py-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <h4 className="card-title mb-0 fw-bold">
                                <FaChartLine className="me-2" />
                                Recent Proposals Overview
                              </h4>
                              <span className="badge bg-light text-dark rounded-pill px-3">
                                {recentProposals.length} Active
                              </span>
                            </div>
                          </div>
                          <div className="card-body p-4">
                            {loadingProposals ? (
                              <div className="text-center py-4">
                                <div className="spinner-border text-primary mb-3" role="status">
                                  <span className="visually-hidden">Loading proposals...</span>
                                </div>
                                <p className="text-muted">Fetching latest proposals from blockchain...</p>
                              </div>
                            ) : recentProposals.length === 0 ? (
                              <div className="text-center py-5">
                                <div className="mb-4">
                                  <FaExclamationTriangle className="text-muted" style={{ fontSize: '4rem', opacity: 0.3 }} />
                                </div>
                                <h5 className="text-muted mb-3">No Proposals Found</h5>
                                <p className="text-muted">
                                  There are currently no proposals in the DAO. Check back later!
                                </p>
                              </div>
                            ) : (
                              <div className="row g-4">
                                {recentProposals.map((proposal) => (
                                  <div key={proposal.id} className="col-lg-4 col-md-6 col-12">
                                    <div className="card proposal-overview-card h-100">
                                      <div className="card-body p-4">
                                        {/* Modern Header with Circle ID */}
                                        <div className="d-flex justify-content-between align-items-center mb-4">
                                          <div className="d-flex align-items-center">
                                            <div className="proposal-id-circle me-3">
                                              <span className="text-white fw-bold fs-5">#{proposal.id}</span>
                                            </div>
                                            <div>
                                              <h6 className="mb-1 fw-bold text-dark">
                                                {proposal.projectName.length > 15 ? 
                                                  `${proposal.projectName.substring(0, 15)}...` : 
                                                  proposal.projectName
                                                }
                                              </h6>
                                              <small className="text-muted opacity-75">
                                                {proposal.endTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                              </small>
                                            </div>
                                          </div>
                                          <span className="proposal-status-badge">
                                            {proposal.isActive ? '🟢 Live' : proposal.executed ? '✅ Done' : '⏰ Ended'}
                                          </span>
                                        </div>

                                        {/* Project Description */}
                                        <div className="mb-4">
                                          <p className="text-muted mb-0 text-truncate-2" style={{ 
                                            height: '3rem', 
                                            fontSize: '0.9rem', 
                                            lineHeight: '1.5' 
                                          }}>
                                            {proposal.description}
                                          </p>
                                        </div>

                                        {/* Modern Voting Stats */}
                                        <div className="row g-3 mb-4">
                                          <div className="col-6">
                                            <div className="vote-stat-modern">
                                              <div className="d-flex align-items-center justify-content-center mb-2">
                                                <div className="bg-success rounded-circle p-2 me-2" style={{ width: '35px', height: '35px' }}>
                                                  <FaThumbsUp className="text-white" style={{ fontSize: '0.8rem' }} />
                                                </div>
                                                <span className="fw-bold text-success fs-5">{proposal.votersFor}</span>
                                              </div>
                                              <small className="text-muted fw-600">Support</small>
                                            </div>
                                          </div>
                                          <div className="col-6">
                                            <div className="vote-stat-modern">
                                              <div className="d-flex align-items-center justify-content-center mb-2">
                                                <div className="bg-danger rounded-circle p-2 me-2" style={{ width: '35px', height: '35px' }}>
                                                  <FaThumbsDown className="text-white" style={{ fontSize: '0.8rem' }} />
                                                </div>
                                                <span className="fw-bold text-danger fs-5">{proposal.votersAgainst}</span>
                                              </div>
                                              <small className="text-muted fw-600">Oppose</small>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Modern Funding Progress */}
                                        <div className="mb-4">
                                          <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div className="d-flex align-items-center">
                                              <FaDollarSign className="text-warning me-2" />
                                              <span className="text-muted fw-600" style={{ fontSize: '0.85rem' }}>Funding</span>
                                            </div>
                                            <span className="fw-bold" style={{ 
                                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                              WebkitBackgroundClip: 'text',
                                              WebkitTextFillColor: 'transparent',
                                              fontSize: '0.9rem'
                                            }}>
                                              {parseFloat(proposal.totalInvested).toFixed(1)}K / {parseFloat(proposal.fundingGoal).toFixed(1)}K GNJ
                                            </span>
                                          </div>
                                          <div className="funding-progress-modern">
                                            <div
                                              className="funding-progress-bar"
                                              style={{
                                                width: `${Math.min(proposal.progressPercentage, 100)}%`
                                              }}
                                            ></div>
                                          </div>
                                          <div className="d-flex justify-content-between mt-2">
                                            <small className="text-muted">Progress</small>
                                            <small className="fw-bold text-primary">
                                              {proposal.progressPercentage.toFixed(1)}%
                                            </small>
                                          </div>
                                        </div>

                                        {/* Modern Action Buttons */}
                                        <div className="row g-2 mt-auto">
                                          <div className="col-7">
                                            <button 
                                              className="btn action-btn-modern btn-sm w-100"
                                              onClick={() => {
                                                localStorage.setItem('proposalId', proposal.id);
                                                window.location.reload();
                                              }}
                                            >
                                              <FaEye className="me-2" />
                                              View Details
                                            </button>
                                          </div>
                                          <div className="col-5">
                                            {proposal.isActive && (
                                              <button 
                                                className="btn action-btn-primary btn-sm w-100"
                                                onClick={() => {
                                                  localStorage.setItem('proposalId', proposal.id);
                                                  setShowVoteModal(true);
                                                }}
                                              >
                                                <FaVoteYea className="me-1" />
                                                Vote
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Voting History Section */}
                    <div className="card shadow-lg border-0 mb-4">
                      <div className="card-header gradient-header text-white py-3">
                        <h4 className="card-title mb-0 fw-bold">
                          <FaHistory className="me-2" />
                          My Voting History
                        </h4>
                      </div>
                      <div className="card-body p-4">
                        {loadingHistory ? (
                          <div className="text-center py-4">
                            <div className="spinner-border text-primary mb-3" role="status">
                              <span className="visually-hidden">Loading voting history...</span>
                            </div>
                            <p className="text-muted">Fetching your voting history from blockchain...</p>
                          </div>
                        ) : votingHistory.length === 0 ? (
                          <div className="text-center py-5">
                            <div className="mb-4">
                              <FaHistory className="text-muted" style={{ fontSize: '4rem', opacity: 0.3 }} />
                            </div>
                            <h5 className="text-muted mb-3">No Voting History Found</h5>
                            <p className="text-muted">
                              You haven't voted on any proposals yet. Start participating in DAO governance!
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                              <div>
                                <h6 className="text-muted mb-1">Total Votes Cast</h6>
                                <h4 className="text-primary mb-0">{votingHistory.length}</h4>
                              </div>
                              <div className="text-end">
                                <h6 className="text-muted mb-1">Total Investment</h6>
                                <h4 className="text-success mb-0">
                                  {votingHistory.reduce((sum, vote) => sum + parseFloat(vote.investmentAmount), 0).toFixed(2)} GNJ
                                </h4>
                              </div>
                            </div>

                            <div className="row">
                              {votingHistory.map((vote) => (
                                <div key={vote.id} className="col-lg-6 col-12 mb-4">
                                  <div className="card border-0 shadow-sm vote-history-card h-100">
                                    <div className="card-body p-4">
                                      {/* Vote Header */}
                                      <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div className="d-flex align-items-center">
                                          <div className={`rounded-circle p-2 me-3 ${vote.support ? 'bg-success' : 'bg-danger'}`}>
                                            {vote.support ?
                                              <FaThumbsUp className="text-white" /> :
                                              <FaThumbsDown className="text-white" />
                                            }
                                          </div>
                                          <div>
                                            <h6 className="mb-1 fw-bold">Proposal #{vote.proposalId}</h6>
                                            <small className={`badge ${vote.support ? 'bg-success' : 'bg-danger'} rounded-pill`}>
                                              {vote.support ? 'Voted For' : 'Voted Against'}
                                            </small>
                                          </div>
                                        </div>
                                        <span className={`badge ${vote.proposalStatus === 'Executed' ? 'bg-primary' : 'bg-warning'} rounded-pill`}>
                                          {vote.proposalStatus}
                                        </span>
                                      </div>

                                      {/* Project Info */}
                                      <div className="mb-3">
                                        <h6 className="text-dark mb-2 fw-bold text-truncate">
                                          {vote.projectName}
                                        </h6>
                                        <p className="text-muted small mb-0 text-truncate-2" style={{ height: '2.5rem' }}>
                                          {vote.description}
                                        </p>
                                      </div>

                                      {/* Investment & Date */}
                                      <div className="row g-2 mb-3">
                                        <div className="col-6">
                                          <div className="bg-light rounded p-2 text-center">
                                            <FaCoins className="text-warning mb-1" />
                                            <div className="fw-bold text-primary small">{vote.investmentAmount} GNJ</div>
                                            <small className="text-muted">Investment</small>
                                          </div>
                                        </div>
                                        <div className="col-6">
                                          <div className="bg-light rounded p-2 text-center">
                                            <FaCalendarAlt className="text-info mb-1" />
                                            <div className="fw-bold text-dark small">
                                              {vote.timestamp.toLocaleDateString()}
                                            </div>
                                            <small className="text-muted">Vote Date</small>
                                          </div>
                                        </div>
                                      </div>

                                      {/* View Details Button */}
                                      <button
                                        className="btn btn-outline-primary btn-sm w-100 rounded-pill"
                                        onClick={() => {
                                          localStorage.setItem('proposalId', vote.proposalId);
                                          window.location.reload();
                                        }}
                                      >
                                        <FaArrowRight className="me-1" />
                                        View Proposal Details
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </main>
            <Footer />
          </div>
        </div>
      </div>

      {/* Vote Modal */}
      {showVoteModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              {/* Modal Header */}
              <div className="modal-header gradient-header text-white py-4">
                <h4 className="modal-title fw-bold mb-0">
                  <FaVoteYea className="me-3" />
                  Cast Your Vote
                </h4>
                <button type="button" className="btn-close btn-close-white" onClick={closeVoteModal}></button>
              </div>

              <div className="modal-body p-4">
                {/* Proposal ID Card */}
                <div className="text-center mb-4">
                  <div className="stats-card p-4 shadow-sm">
                    <div className="d-flex justify-content-center align-items-center mb-3">
                      <div className="bg-primary rounded-circle p-3 me-3 icon-circle">
                        <FaVoteYea className="text-white fs-5" />
                      </div>
                      <div>
                        <h6 className="text-muted mb-1">Proposal ID</h6>
                        <h3 className="text-primary mb-0 fw-bold">#{pId}</h3>
                      </div>
                    </div>
                    <small className="text-muted">
                      Make your voice heard in the DAO governance
                    </small>
                  </div>
                </div>

                {/* Investment Amount */}
                <div className="mb-4">
                  <label htmlFor="voteAmount" className="form-label fw-bold mb-3">
                    <FaCoins className="text-warning me-2" />
                    Investment Amount (GNJ tokens)
                  </label>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text bg-warning text-white">
                      <FaCoins />
                    </span>
                    <input
                      type="number"
                      className="form-control border-0 shadow-sm"
                      id="voteAmount"
                      value={voteAmount}
                      onChange={(e) => setVoteAmount(e.target.value)}
                      min="1"
                      placeholder="Enter amount to invest"
                      style={{ fontSize: '1.1rem' }}
                    />
                    <span className="input-group-text bg-light text-muted">GNJ</span>
                  </div>
                  <div className="form-text text-muted mt-2">
                    <small>
                      <FaExclamationTriangle className="me-1 text-warning" />
                      Minimum: 1 GNJ token required
                    </small>
                  </div>
                </div>

                {/* Vote Preference */}
                <div className="mb-4">
                  <label className="form-label fw-bold mb-3">
                    <FaVoteYea className="text-primary me-2" />
                    Vote Preference
                  </label>
                  <div className="row g-3">
                    <div className="col-md-6 col-12">
                      <div
                        className={`vote-card ${support ? 'bg-success bg-opacity-10 border-success selected' : 'bg-light'}`}
                        onClick={() => setSupport(true)}
                      >
                        <div className="card-body text-center p-3">
                          <div className="form-check">
                            <input
                              type="radio"
                              className="form-check-input"
                              id="voteFor"
                              name="votePreference"
                              checked={support}
                              onChange={() => setSupport(true)}
                            />
                            <label className="form-check-label w-100" htmlFor="voteFor">
                              <div className="d-flex flex-column align-items-center">
                                <div className="bg-success rounded-circle p-3 mb-2 icon-circle">
                                  <FaThumbsUp className="text-white fs-4" />
                                </div>
                                <h6 className="text-success fw-bold mb-1">Vote For</h6>
                                <small className="text-muted">Support this proposal</small>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 col-12">
                      <div className={`vote-card ${!support ? 'bg-danger bg-opacity-10 border-danger selected' : 'bg-light'}`} onClick={() => voteAgainsts()}>
                        <div className="card-body text-center p-3">
                          <div className="form-check">
                            <input
                              type="radio"
                              className="form-check-input"
                              id="voteAgainst"
                              name="votePreference"
                              checked={!support}
                              onChange={() => voteAgainsts()}
                            />
                            <label className="form-check-label w-100" htmlFor="voteAgainst">
                              <div className="d-flex flex-column align-items-center">
                                <div className="bg-danger rounded-circle p-3 mb-2 icon-circle">
                                  <FaThumbsDown className="text-white fs-4" />
                                </div>
                                <h6 className="text-danger fw-bold mb-1">Vote Against</h6>
                                <small className="text-muted">Oppose this proposal</small>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vote Summary */}
                <div className={`alert ${support ? 'alert-success' : 'alert-danger'} border-0 shadow-sm`}>
                  <div className="d-flex align-items-center">
                    <div className={`${support ? 'bg-success' : 'bg-danger'} rounded-circle p-2 me-3`}>
                      {support ? <FaThumbsUp className="text-white" /> : <FaThumbsDown className="text-white" />}
                    </div>
                    <div>
                      <strong>Vote Summary:</strong>
                      <div className="mt-1">
                        You are voting <strong>{support ? 'FOR' : 'AGAINST'}</strong> this proposal with{' '}
                        <strong>{voteAmount} GNJ tokens</strong>.
                      </div>
                      <small className="text-muted mt-1 d-block">
                        Your investment will be used to support the project if the proposal passes.
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer bg-light border-0 p-4">
                <div className="row w-100">
                  <div className="col-md-6 col-12 mb-2 mb-md-0">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-lg w-100 rounded-pill"
                      onClick={closeVoteModal}
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="col-md-6 col-12">
                    <button
                      type="button"
                      className="btn btn-gradient btn-lg w-100 rounded-pill text-white"
                      onClick={handleVoteSubmit}
                      disabled={loading || !voteAmount || voteAmount <= 0}
                      style={{
                        background: support
                          ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                          : 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)',
                        border: 'none'
                      }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaVoteYea className="me-2" />
                          Cast Vote {support ? 'For' : 'Against'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MyVoting;
