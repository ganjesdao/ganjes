import React, { useCallback, useEffect, useState } from 'react';
import Header from './component/Header';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import Auth from '../../Auth/Auth';
import { toast } from 'react-toastify';
import { getContractAddress, getRpcUrl, isTestnet, getNetworkByChainId, NETWORKS } from '../../utils/networks';
import { daoABI } from '../../Auth/Abi';
import { tokenABI } from '../../utils/Tokenabi';
import { ethers } from 'ethers';
import { FaSearch, FaListAlt, FaUser, FaThumbsUp, FaThumbsDown, FaChartLine, FaCalendarAlt, FaCheckCircle, FaClock, FaDollarSign, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function InvestorDashboard() {
  const [isToggle, setIsToggle] = useState(false);
  const [authToken] = useState(sessionStorage.getItem('authToken'));
  const [walletAddress, setWalletAddress] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [isNetworkSupported, setIsNetworkSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userProposals, setUserProposals] = useState([]);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [daoContract, setDaoContract] = useState(null);
  const [tokenContractInstance, setTokenContractInstance] = useState(null);

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSort, setFilterSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();
  const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;

  // Retry logic for RPC calls
  const withRetry = async (fn, maxRetries = 3, delay = 2000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (error.code === -32603 && error.message.includes('circuit breaker')) {
          if (attempt === maxRetries) {
            throw new Error('Circuit breaker open after max retries. Please try again later or switch RPC providers.');
          }
          toast.warn(`Circuit breaker error. Retrying (${attempt}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  };

  // Add custom styles with proper cleanup
  useEffect(() => {
    const customStyles = `
      .hover-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important;
      }
      .progress-bar {
        transition: width 0.8s ease;
      }
      .btn:hover {
        transform: translateY(-2px);
      }
      .card {
        transition: all 0.3s ease;
      }
      .filter-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
      }
      .search-input {
        border-radius: 25px;
        border: 2px solid #e9ecef;
        padding: 10px 20px;
        transition: all 0.3s ease;
      }
      .search-input:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
      }
      .filter-button {
        border-radius: 20px;
        padding: 8px 16px;
        margin: 0 5px;
        transition: all 0.3s ease;
      }
      .filter-button.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
      }
      .proposal-card {
        background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
        border: none;
        border-radius: 15px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0,0,0,0.08);
      }
      .proposal-header {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-bottom: 1px solid #dee2e6;
      }
      .funding-progress-bar {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        border-radius: 10px;
        height: 10px;
      }
      .stats-card {
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border: 1px solid #e9ecef;
        border-radius: 10px;
        transition: all 0.3s ease;
      }
      .stats-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      }
      .view-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 25px;
        padding: 12px 30px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: all 0.3s ease;
      }
      .view-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      }
      .badge-gradient {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 15px;
        padding: 5px 12px;
        font-size: 0.8em;
        font-weight: 500;
      }
      @media (max-width: 768px) {
        .col-xl-6 {
          margin-bottom: 1rem !important;
        }
        .d-flex.justify-content-between {
          flex-direction: column !important;
        }
        .d-flex.justify-content-between .d-flex {
          margin-top: 1rem;
          justify-content: center !important;
        }
        .filter-button {
          margin: 2px;
          font-size: 0.9em;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = customStyles;
    styleSheet.id = 'dashboard-custom-styles';

    if (!document.getElementById('dashboard-custom-styles')) {
      document.head.appendChild(styleSheet);
    }

    return () => {
      const styleElement = document.getElementById('dashboard-custom-styles');
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  // Handle profile data from Auth
  const handleProfileDataFetched = (data) => {
    // Optional: Handle Auth result
  };

  // Filter and sort proposals
  const getFilteredProposals = () => {
    let filtered = [...userProposals];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((p) => {
        switch (filterStatus) {
          case 'active':
            return !p.executed && Number(p.endTime) * 1000 > Date.now();
          case 'executed':
            return p.executed;
          case 'funded':
            return Number(p.totalInvested) >= Number(p.fundingGoal);
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.proposer || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort proposals
    filtered.sort((a, b) => {
      switch (filterSort) {
        case 'newest':
          return Number(b.id || 0) - Number(a.id || 0);
        case 'oldest':
          return Number(a.id || 0) - Number(b.id || 0);
        case 'mostFunded':
          return Number(b.totalInvested || 0) - Number(a.totalInvested || 0);
        case 'leastFunded':
          return Number(a.totalInvested || 0) - Number(b.totalInvested || 0);
        case 'mostVotes':
          return Number(b.votersFor || 0) - Number(a.votersFor || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Handle network change
  const handleNetworkChange = useCallback(
    async (network) => {
      if (!network) {
        setIsNetworkSupported(false);
        setContractAddress('');
        setCurrentNetwork(null);
        setDaoContract(null);
        setTokenContractInstance(null);
        setUserProposals([]);
        return;
      }

      try {
        const networkConfig = getNetworkByChainId(network.chainId);
        if (!networkConfig || !networkConfig.rpcUrls.length) {
          setIsNetworkSupported(false);
          toast.error(`No valid RPC URL for ${network.chainName}. Please configure a valid RPC provider.`);
          setCurrentNetwork(null);
          setDaoContract(null);
          setTokenContractInstance(null);
          setUserProposals([]);
          return;
        }

        setIsNetworkSupported(true);
        setCurrentNetwork(network);

        const contractAddr = getContractAddress(network.chainId);
        if (contractAddr === '0x0000000000000000000000000000000000000000') {
          setIsNetworkSupported(false);
          toast.error(`No contract deployed on ${network.chainName}. Please switch to a supported network.`);
          setCurrentNetwork(null);
          setDaoContract(null);
          setTokenContractInstance(null);
          setUserProposals([]);
          return;
        }
        setContractAddress(contractAddr);

        // Initialize provider with fallback RPC URLs
        let provider;
        for (const url of networkConfig.rpcUrls) {
          try {
            provider = new ethers.JsonRpcProvider(url);
            await provider.getNetwork();
            break;
          } catch (error) {
            console.warn(`RPC ${url} failed:`, error);
            if (networkConfig.rpcUrls.indexOf(url) === networkConfig.rpcUrls.length - 1) {
              throw new Error('All RPC URLs failed. Please check your network configuration.');
            }
          }
        }

        const contractInstance = new ethers.Contract(contractAddr, daoABI, provider);
        setDaoContract(contractInstance);

        const tokenContractInst = new ethers.Contract(tokenAddress, tokenABI, provider);
        setTokenContractInstance(tokenContractInst);

        if (walletAddress) {
          await initializeContract(contractInstance, tokenContractInst);
        }
      } catch (error) {
        console.error('Network change error:', error);
        if (error.message.includes('circuit breaker')) {
          toast.error('Circuit breaker open. Please try again later or switch RPC providers.');
        } else {
          toast.error(`Failed to initialize network: ${error.message}`);
        }
        setIsNetworkSupported(false);
        setCurrentNetwork(null);
        setDaoContract(null);
        setTokenContractInstance(null);
        setUserProposals([]);
      }
    },
    [walletAddress, tokenAddress]
  );

  // Initialize contract and fetch proposal IDs
  const initializeContract = async (contractInstance, tokenContractInst) => {
    if (!walletAddress) {
      console.warn('Wallet address not available. Skipping contract initialization.');
      return;
    }

    setIsLoading(true);

    try {
      // Fetch proposal IDs for the proposer
      const proposerIds = await withRetry(() => contractInstance.getProposalsIdByInvestor(walletAddress));
      console.log('Proposer IDs:', proposerIds);

      if (!Array.isArray(proposerIds)) {
        console.warn('Proposer IDs is not an array:', proposerIds);
        toast.warning('No valid proposal IDs found for this wallet.');
        setIsLoading(false);
        return;
      }

      const decimals = await withRetry(() => tokenContractInst.decimals());

      // Limit to 20 proposals to prevent RPC overload
      const proposalPromises = proposerIds.slice(0, 20).map(async (proposalId) => {
        try {
          const proposal = await withRetry(() => contractInstance.proposals(proposalId));
          return {
            id: Number(proposalId),
            proposer: proposal.proposer || '0x0000000000000000000000000000000000000000',
            description: proposal.description || `Proposal #${proposalId}`,
            projectName: proposal.projectName || (proposal.description?.slice(0, 50) + '...' || `Proposal #${proposalId}`),
            fundingGoal: Number(ethers.formatUnits(proposal.fundingGoal || '0', decimals)).toFixed(2),
            totalInvested: Number(ethers.formatUnits(proposal.totalInvested || '0', decimals)).toFixed(2),
            totalVotesFor: Number(proposal.votersFor || 0),
            totalVotesAgainst: Number(proposal.votersAgainst || 0),
            votersFor: Number(proposal.votersFor || 0),
            votersAgainst: Number(proposal.votersAgainst || 0),
            endTime: Number(proposal.endTime) || 0,
            executed: Boolean(proposal.executed),
            passed: Boolean(proposal.passed),
            rejected: Boolean(proposal.rejected),
            status: proposal.executed
              ? proposal.passed
                ? 'PASSED'
                : 'FAILED'
              : proposal.rejected
                ? 'REJECTED'
                : Number(proposal.endTime) * 1000 > Date.now()
                  ? 'ACTIVE'
                  : 'PENDING',
            fundingPercent: proposal.fundingGoal && proposal.totalInvested
              ? (Number(ethers.formatUnits(proposal.totalInvested, decimals)) / Number(ethers.formatUnits(proposal.fundingGoal, decimals)) * 100).toFixed(2)
              : '0',
            deadline: new Date(Number(proposal.endTime) * 1000).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            timeRemaining: Math.max(0, Number(proposal.endTime) - Math.floor(Date.now() / 1000)),
          };
        } catch (error) {
          console.error(`Error fetching proposal ${proposalId}:`, error);
          return null;
        }
      });

      const proposals = (await Promise.all(proposalPromises)).filter((proposal) => proposal !== null);

      if (proposals.length > 0) {
        setUserProposals(proposals);
      } else {
        toast.warning('No proposals found for this wallet.');
      }
    } catch (error) {
      console.error('Error fetching proposer IDs:', error);
      if (error.message.includes('circuit breaker')) {
        toast.error('Circuit breaker open. Please try again later or switch RPC providers.');
      } else {
        toast.error(`Failed to fetch proposal IDs: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check wallet connection and listen for account/network changes
  useEffect(() => {
    const checkWalletConnected = async () => {
      if (!window.ethereum) {
        toast.error('MetaMask is not installed. Please install it to use this DApp.');
        return;
      }

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          if (currentNetwork) {
            handleNetworkChange(currentNetwork);
          } else {
            const defaultNetwork = NETWORKS.BSC_TESTNET;
            setCurrentNetwork(defaultNetwork);
            handleNetworkChange(defaultNetwork);
          }
        } else {
          setWalletAddress(null);
        }
      } catch (error) {
        console.error('Failed to check connected accounts:', error);
        toast.error('Failed to connect to MetaMask. Please ensure it is unlocked.');
      }
    };

    checkWalletConnected();

    window.ethereum?.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        if (currentNetwork) {
          handleNetworkChange(currentNetwork);
        }
      } else {
        setWalletAddress(null);
        setUserProposals([]);
        toast.warning('Wallet disconnected. Please reconnect to MetaMask.');
      }
    });

    window.ethereum?.on('chainChanged', (chainId) => {
      const network = getNetworkByChainId(chainId);
      setCurrentNetwork(network);
      handleNetworkChange(network);
    });

    return () => {
      window.ethereum?.removeListener('accountsChanged', () => { });
      window.ethereum?.removeListener('chainChanged', () => { });
    };
  }, [currentNetwork, handleNetworkChange]);

  // Navigate to proposal details
  const viewProposalDetails = (proposalId) => {
    localStorage.setItem('proposalId', proposalId);
    navigate('/investor-vote');
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
              <div className="container-fluid px-4">
                <h1 className="mt-4">My Votes</h1>

                {isLoading ? (
                  <div className="text-center my-5">
                    <div className="spinner-border text-primary" role="status" style={{ width: '4rem', height: '4rem' }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">Fetching proposals from blockchain...</p>
                  </div>
                ) : isNetworkSupported ? (
                  <>
                    {/* Summary Cards */}
                    <div className="row">
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-primary text-white mb-4">
                          <div className="card-body">Total Proposals: {userProposals.length}</div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-warning text-white mb-4">
                          <div className="card-body">Executed: {userProposals.filter((p) => p.executed).length}</div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-success text-white mb-4">
                          <div className="card-body">
                            Votes For: {userProposals.reduce((acc, p) => acc + Number(p.votersFor || 0), 0)}
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-danger text-white mb-4">
                          <div className="card-body">
                            Votes Against: {userProposals.reduce((acc, p) => acc + Number(p.votersAgainst || 0), 0)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Filters & Search */}
                    <div className="row mb-4">
                      <div className="col-12">
                        <div className="card filter-card border-0 shadow-sm">
                          <div className="card-body">
                            <div className="row align-items-center">
                              <div className="col-md-4 mb-3 mb-md-0">
                                <h6 className="mb-2 text-white">
                                  <FaSearch className="me-2" />
                                  Search Proposals
                                </h6>
                                <input
                                  type="text"
                                  className="form-control search-input"
                                  placeholder="Search by description or proposer..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                />
                              </div>
                              <div className="col-md-4 mb-3 mb-md-0">
                                <h6 className="mb-2 text-white">
                                  <i className="fas fa-filter me-2"></i>
                                  Filter by Status
                                </h6>
                                <div className="d-flex flex-wrap">
                                  {[
                                    { value: 'all', label: 'All', icon: 'fas fa-list' },
                                    { value: 'active', label: 'Active', icon: 'fas fa-clock' },
                                    { value: 'executed', label: 'Executed', icon: 'fas fa-check-circle' },
                                    { value: 'funded', label: 'Funded', icon: 'fas fa-dollar-sign' },
                                  ].map((filter) => (
                                    <button
                                      key={filter.value}
                                      className={`btn btn-sm filter-button ${filterStatus === filter.value ? 'active' : 'btn-outline-light'}`}
                                      onClick={() => setFilterStatus(filter.value)}
                                    >
                                      <i className={`${filter.icon} me-1`}></i>
                                      {filter.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="col-md-4">
                                <h6 className="mb-2 text-white">
                                  <i className="fas fa-sort me-2"></i>
                                  Sort by
                                </h6>
                                <select
                                  className="form-select"
                                  value={filterSort}
                                  onChange={(e) => setFilterSort(e.target.value)}
                                  style={{ borderRadius: '20px' }}
                                >
                                  <option value="newest">Newest First</option>
                                  <option value="oldest">Oldest First</option>
                                  <option value="mostFunded">Most Funded</option>
                                  <option value="leastFunded">Least Funded</option>
                                  <option value="mostVotes">Most Votes</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proposal Results Info */}
                    <div className="row mb-3">
                      <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center">
                          <h4 className="mb-0">
                            <FaListAlt className="me-2 text-primary" />
                            Investment Proposals
                          </h4>
                          <div className="d-flex align-items-center">
                            <span className="badge badge-gradient me-2">
                              {getFilteredProposals().length} of {userProposals.length} proposals
                            </span>
                            {searchQuery && (
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => setSearchQuery('')}>
                                <FaTimes className="me-1" />
                                Clear Search
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proposal List */}
                    <div className="row">
                      {getFilteredProposals().length === 0 ? (
                        <div className="col-12">
                          <div className="card border-0 shadow-sm">
                            <div className="card-body text-center py-5">
                              <div className="mb-4">
                                <FaSearch className="fa-3x text-muted" />
                              </div>
                              <h5 className="text-muted mb-2">
                                {searchQuery ? 'No matching proposals found' : 'No proposals found'}
                              </h5>
                              <p className="text-muted mb-0">
                                {searchQuery
                                  ? 'Try adjusting your search terms or filters'
                                  : 'You have not created any investment proposals on this network.'}
                              </p>
                              {searchQuery && (
                                <button
                                  className="btn btn-primary mt-3"
                                  onClick={() => {
                                    setSearchQuery('');
                                    setFilterStatus('all');
                                  }}
                                >
                                  <i className="fas fa-refresh me-2"></i>
                                  Reset Filters
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        getFilteredProposals().map((p) => (
                          <div className="col-xl-6 col-lg-6 col-md-12 mb-4" key={p.id}>
                            <div className="card proposal-card h-100 hover-card">
                              <div className="card-header proposal-header border-0 pb-0">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-2">
                                      <span className="badge badge-gradient me-2">
                                        <i className="fas fa-hashtag me-1"></i>#{p.id}
                                      </span>
                                      <span className={`badge ${p.executed ? 'bg-success' : 'bg-warning'} bg-opacity-90`}>
                                        <i className={`fas ${p.executed ? 'fa-check-circle' : 'fa-clock'} me-1`}></i>
                                        {p.executed ? 'Executed' : 'Active'}
                                      </span>
                                      {Number(p.totalInvested) >= Number(p.fundingGoal) && (
                                        <span className="badge bg-success bg-opacity-90 ms-2">
                                          <FaDollarSign className="me-1" />
                                          Funded
                                        </span>
                                      )}
                                    </div>
                                    <h5 className="mb-2 text-dark fw-bold">
                                      {p.description.length > 60 ? p.description.slice(0, 60) + '...' : p.description}
                                    </h5>
                                  </div>
                                </div>
                              </div>

                              <div className="card-body pt-2">
                                {/* Proposer Info */}
                                <div className="mb-3 p-3 stats-card">
                                  <div className="small text-muted mb-1">
                                    <FaUser className="me-1" />
                                    Proposer
                                  </div>
                                  <div className="font-monospace small fw-semibold">
                                    {p.proposer.substring(0, 8)}...{p.proposer.slice(-6)}
                                  </div>
                                </div>

                                {/* Voting Stats */}
                                <div className="row mb-3">
                                  <div className="col-6">
                                    <div className="stats-card p-3 text-center">
                                      <div className="text-success">
                                        <FaThumbsUp className="fa-lg mb-2" />
                                      </div>
                                      <div className="fw-bold text-success h5 mb-1">{p.votersFor}</div>
                                      <div className="small text-muted">Votes For</div>
                                    </div>
                                  </div>
                                  <div className="col-6">
                                    <div className="stats-card p-3 text-center">
                                      <div className="text-danger">
                                        <FaThumbsDown className="fa-lg mb-2" />
                                      </div>
                                      <div className="fw-bold text-danger h5 mb-1">{p.votersAgainst}</div>
                                      <div className="small text-muted">Votes Against</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Funding Progress */}
                                <div className="mb-3">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-semibold">
                                      <FaChartLine className="me-1 text-primary" />
                                      Funding Progress
                                    </span>
                                    <span className="badge bg-primary bg-opacity-10 text-primary">{p.fundingPercent}%</span>
                                  </div>
                                  <div className="progress mb-2" style={{ height: '12px', borderRadius: '10px' }}>
                                    <div
                                      className="funding-progress-bar"
                                      role="progressbar"
                                      style={{ width: `${p.fundingPercent}%` }}
                                    ></div>
                                  </div>
                                  <div className="row">
                                    <div className="col-6">
                                      <div className="small text-muted">Raised</div>
                                      <div className="fw-bold text-success">{p.totalInvested} GNJ</div>
                                    </div>
                                    <div className="col-6 text-end">
                                      <div className="small text-muted">Goal</div>
                                      <div className="fw-bold text-primary">{p.fundingGoal} GNJ</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Deadline */}
                                <div className="mb-3 p-3 stats-card">
                                  <div className="d-flex align-items-center">
                                    <FaCalendarAlt className="text-warning me-2 fa-lg" />
                                    <div>
                                      <div className="small text-muted">Deadline</div>
                                      <div className="fw-semibold text-dark">{p.deadline}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="card-footer bg-white border-0 pt-0">
                                <button
                                  onClick={() => viewProposalDetails(p.id)}
                                  className="btn view-button w-100 text-white"
                                  disabled={isLoading}
                                >
                                  <i className="fas fa-eye me-2"></i>
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  currentNetwork ? (
                    <div className="text-center my-5">
                      <div className="alert alert-danger">
                        <h4>❌ Contract Not Available</h4>
                        <p>
                          The DAO contract is not deployed on <strong>{currentNetwork.chainName}</strong> yet.
                        </p>
                        <p>Please switch to <strong>BSC Testnet</strong> to view and create proposals.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center my-5">
                      <div className="alert alert-info">
                        <h4>🌐 Select Network</h4>
                        <p>Please select a network from the header dropdown to get started.</p>
                        <small className="text-muted">Recommended: BSC Testnet for development and testing</small>
                      </div>
                    </div>
                  )
                )}
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
}

export default InvestorDashboard;