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
import { FaHistory, FaVoteYea, FaArrowUp, FaArrowDown, FaCoins, FaChartLine, FaCalendarAlt, FaCheckCircle, FaClock, FaThumbsUp, FaThumbsDown, FaUser, FaSyncAlt } from 'react-icons/fa';

function InvestorActivityLog() {
  const [isToggle, setIsToggle] = useState(false);
  const [authToken] = useState(sessionStorage.getItem('authToken'));
  const [walletAddress, setWalletAddress] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [isNetworkSupported, setIsNetworkSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [daoContract, setDaoContract] = useState(null);
  const [tokenContractInstance, setTokenContractInstance] = useState(null);

  const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;

  // Add custom styles similar to investor dashboard
  useEffect(() => {
    const customStyles = `
      .activity-card {
        background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
        border: none;
        border-radius: 15px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        transition: all 0.3s ease;
      }
      .activity-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important;
      }
      .activity-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .activity-timeline {
        position: relative;
      }
      .timeline-item {
        position: relative;
        padding-left: 3rem;
        margin-bottom: 2rem;
      }
      .timeline-item::before {
        content: '';
        position: absolute;
        left: 1rem;
        top: 0;
        bottom: -2rem;
        width: 2px;
        background: linear-gradient(to bottom, #667eea, #764ba2);
        z-index: 1;
      }
      .timeline-item:last-child::before {
        display: none;
      }
      .timeline-icon {
        position: absolute;
        left: 0.5rem;
        top: 0.5rem;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        z-index: 2;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .stats-summary-card {
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border: 1px solid #e9ecef;
        border-radius: 15px;
        transition: all 0.3s ease;
      }
      .stats-summary-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      }
      .activity-badge {
        border-radius: 20px;
        padding: 0.4rem 0.8rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .refresh-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 25px;
        transition: all 0.3s ease;
      }
      .refresh-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = customStyles;
    styleSheet.id = 'investor-activity-styles';

    if (!document.getElementById('investor-activity-styles')) {
      document.head.appendChild(styleSheet);
    }

    return () => {
      const styleElement = document.getElementById('investor-activity-styles');
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  // Handle profile data from Auth
  const handleProfileDataFetched = (data) => {
    // Optional: Handle Auth result
  };

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

  // Handle network change
  const handleNetworkChange = useCallback(
    async (network) => {
      if (!network) {
        setIsNetworkSupported(false);
        setContractAddress('');
        setCurrentNetwork(null);
        setDaoContract(null);
        setTokenContractInstance(null);
        setActivities([]);
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
          setActivities([]);
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
          setActivities([]);
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
          await fetchActivityData(contractInstance, tokenContractInst);
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
        setActivities([]);
      }
    },
    [walletAddress, tokenAddress]
  );

  // Fetch activity data for investor
  const fetchActivityData = async (contractInstance, tokenContractInst) => {
    if (!walletAddress) {
      console.warn('Wallet address not available. Skipping activity fetch.');
      return;
    }

    setIsLoading(true);

    try {
      const activityList = [];
      const decimals = await withRetry(() => tokenContractInst.decimals());

      // Fetch all proposal IDs to check investment activities
      const proposalIds = await withRetry(() => contractInstance.getAllProposalIds());
      
      if (Array.isArray(proposalIds)) {
        // Check investments and votes for each proposal
        const investmentPromises = proposalIds.slice(0, 15).map(async (proposalId) => {
          try {
            const proposal = await withRetry(() => contractInstance.proposals(proposalId));
            
            // Check if user has invested in this proposal
            try {
              const investmentAmount = await withRetry(() => contractInstance.getInvestorInvestment(proposalId, walletAddress));
              if (investmentAmount && Number(investmentAmount) > 0) {
                activityList.push({
                  id: `investment-${proposalId}`,
                  type: 'INVESTMENT',
                  title: `Invested in Proposal #${proposalId}`,
                  description: proposal.description || `Investment in Proposal #${proposalId}`,
                  amount: ethers.formatUnits(investmentAmount, decimals),
                  status: 'COMPLETED',
                  timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Mock timestamp
                  icon: 'fa-chart-line',
                  color: 'success',
                  details: {
                    proposalId: Number(proposalId),
                    proposalTitle: proposal.projectName || `Proposal #${proposalId}`,
                    investmentAmount: ethers.formatUnits(investmentAmount, decimals)
                  }
                });
              }
            } catch (error) {
              console.warn(`Error checking investment for proposal ${proposalId}:`, error);
            }

            // Check if user has voted on this proposal
            try {
              const hasVoted = await withRetry(() => contractInstance.hasVoted(proposalId, walletAddress));
              if (hasVoted) {
                const voteSupport = await withRetry(() => contractInstance.getVoterSupport(proposalId, walletAddress));
                activityList.push({
                  id: `vote-${proposalId}`,
                  type: 'VOTE',
                  title: `Voted on Proposal #${proposalId}`,
                  description: `Cast ${voteSupport ? 'supporting' : 'opposing'} vote`,
                  amount: '0', // Voting doesn't involve token amount
                  status: 'CONFIRMED',
                  timestamp: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(), // Mock timestamp
                  icon: 'fa-vote-yea',
                  color: voteSupport ? 'primary' : 'warning',
                  details: {
                    proposalId: Number(proposalId),
                    proposalTitle: proposal.projectName || `Proposal #${proposalId}`,
                    voteType: voteSupport ? 'FOR' : 'AGAINST'
                  }
                });
              }
            } catch (error) {
              console.warn(`Error checking vote for proposal ${proposalId}:`, error);
            }
          } catch (error) {
            console.error(`Error processing proposal ${proposalId}:`, error);
          }
        });

        await Promise.all(investmentPromises);
      }

      // Add mock token transfer activities for demonstration
      const mockTransfers = [
        {
          id: 'transfer-receive-1',
          type: 'TOKEN_RECEIVED',
          title: 'Received GNJS Tokens',
          description: 'Received tokens from reward distribution',
          amount: '250.0',
          status: 'COMPLETED',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          icon: 'fa-arrow-down',
          color: 'success',
          details: {
            from: '0xReward...Contract',
            txHash: '0xabcd...reward'
          }
        },
        {
          id: 'transfer-send-1',
          type: 'TOKEN_SENT',
          title: 'Sent GNJS Tokens',
          description: 'Transferred tokens to another address',
          amount: '100.0',
          status: 'COMPLETED',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          icon: 'fa-arrow-up',
          color: 'warning',
          details: {
            to: '0x9876...5432',
            txHash: '0xefgh...transfer'
          }
        }
      ];

      activityList.push(...mockTransfers);

      // Sort activities by timestamp (newest first)
      activityList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setActivities(activityList);
      
      if (activityList.length > 0) {
        toast.success(`Loaded ${activityList.length} activity records`);
      }
    } catch (error) {
      console.error('Error fetching activity data:', error);
      if (error.message.includes('circuit breaker')) {
        toast.error('Circuit breaker open. Please try again later or switch RPC providers.');
      } else {
        toast.error(`Failed to fetch activity data: ${error.message}`);
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
        setActivities([]);
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

  // Manual refresh function
  const refreshActivities = async () => {
    if (daoContract && tokenContractInstance && walletAddress) {
      try {
        setIsLoading(true);
        await fetchActivityData(daoContract, tokenContractInstance);
      } catch (error) {
        console.error('Refresh error:', error);
        if (error.message.includes('circuit breaker')) {
          toast.error('Circuit breaker open. Please try again later or switch RPC providers.');
        } else {
          toast.error('Failed to refresh activities');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - activityTime) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return activityTime.toLocaleDateString();
  };

  // Get activity icon component
  const getActivityIcon = (type, color) => {
    const iconMap = {
      'INVESTMENT': FaChartLine,
      'VOTE': FaVoteYea,
      'TOKEN_RECEIVED': FaArrowDown,
      'TOKEN_SENT': FaArrowUp
    };
    const IconComponent = iconMap[type] || FaHistory;
    return <IconComponent className={`text-${color}`} />;
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
                <h1 className="mt-4">Activity Log</h1>
                <ol className="breadcrumb mb-4">
                  <li className="breadcrumb-item active">Activity Log</li>
                </ol>

                {/* Network Status & Controls */}
                <div className="row mb-4">
                  <div className="col-12">
                    {currentNetwork ? (
                      <div className="alert alert-info d-flex justify-content-between align-items-center">
                        <div>
                          <FaHistory className="me-2" />
                          Investment & Voting Activities
                          {walletAddress && (
                            <small className="d-block text-muted mt-1">
                              <FaUser className="me-1" />
                              {walletAddress.substring(0, 10)}...{walletAddress.slice(-8)}
                            </small>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {isTestnet(currentNetwork.chainId) && (
                            <span className="badge bg-warning">Testnet</span>
                          )}
                          <button
                            className="btn refresh-btn text-white btn-sm"
                            onClick={refreshActivities}
                            disabled={isLoading}
                          >
                            <FaSyncAlt className={`${isLoading ? 'fa-spin' : ''} me-1`} />
                            Refresh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-warning">
                        ⚠️ Please select a network from the header dropdown to view activities
                      </div>
                    )}
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center my-5">
                    <div className="spinner-border text-primary" role="status" style={{ width: '4rem', height: '4rem' }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">Fetching activity data from blockchain...</p>
                  </div>
                ) : isNetworkSupported ? (
                  <>
                    {/* Summary Cards */}
                    <div className="row">
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-primary text-white mb-4 stats-summary-card">
                          <div className="card-body">
                            <div>Total Activities: {activities.length || 0}</div>
                            <small className="opacity-75">&nbsp;</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-success text-white mb-4 stats-summary-card">
                          <div className="card-body">
                            <div>Investments: {activities.filter((a) => a.type === 'INVESTMENT').length}</div>
                            <small className="opacity-75">Total: {activities.filter((a) => a.type === 'INVESTMENT').reduce((sum, a) => sum + parseFloat(a.amount || 0), 0).toFixed(2)} GNJ</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-info text-white mb-4 stats-summary-card">
                          <div className="card-body">
                            <div>Votes Cast: {activities.filter((a) => a.type === 'VOTE').length}</div>
                            <small className="opacity-75">
                              For: {activities.filter((a) => a.type === 'VOTE' && a.details?.voteType === 'FOR').length} | Against: {activities.filter((a) => a.type === 'VOTE' && a.details?.voteType === 'AGAINST').length}
                            </small>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-warning text-white mb-4 stats-summary-card">
                          <div className="card-body">
                            <div>Token Transfers: {activities.filter((a) => a.type.includes('TOKEN')).length}</div>
                            <small className="opacity-75">Sent/Received</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="row">
                      <div className="col-12">
                        {activities.length === 0 ? (
                          <div className="activity-card">
                            <div className="card-body text-center py-5">
                              <FaHistory className="text-muted mb-3" style={{ fontSize: '3rem' }} />
                              <h5 className="text-muted mb-3">No Activity Found</h5>
                              <p className="text-muted mb-4">
                                You don't have any investment or voting activities to display yet.
                              </p>
                              <button
                                className="btn refresh-btn text-white"
                                onClick={refreshActivities}
                                disabled={isLoading}
                              >
                                <FaSyncAlt className="me-2" />
                                Check for Activities
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="activity-card">
                            <div className="activity-header card-header py-3">
                              <h5 className="mb-0">
                                <FaHistory className="me-2" />
                                Your Investment & Voting Timeline
                              </h5>
                            </div>
                            <div className="card-body p-4">
                              <div className="activity-timeline">
                                {activities.map((activity, index) => (
                                  <div className="timeline-item" key={activity.id}>
                                    <div className={`timeline-icon bg-${activity.color} text-white`}>
                                      {getActivityIcon(activity.type, 'white')}
                                    </div>
                                    <div className="timeline-content">
                                      <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div className="flex-grow-1">
                                          <h6 className="mb-1 fw-bold">{activity.title}</h6>
                                          <p className="mb-2 text-muted small">{activity.description}</p>
                                        </div>
                                        <div className="text-end">
                                          <span className={`activity-badge bg-${activity.color} text-white`}>
                                            {activity.status}
                                          </span>
                                          <div className="small text-muted mt-1">
                                            {formatRelativeTime(activity.timestamp)}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Activity Details */}
                                      <div className="row">
                                        <div className="col-md-6">
                                          {activity.type === 'INVESTMENT' || activity.type.includes('TOKEN') ? (
                                            <div className="d-flex align-items-center">
                                              <FaCoins className="text-warning me-2" />
                                              <span className="fw-semibold">{parseFloat(activity.amount).toFixed(4)} GNJS</span>
                                            </div>
                                          ) : (
                                            <div className="d-flex align-items-center">
                                              {activity.details?.voteType === 'FOR' ? (
                                                <FaThumbsUp className="text-success me-2" />
                                              ) : (
                                                <FaThumbsDown className="text-danger me-2" />
                                              )}
                                              <span className="fw-semibold">Vote: {activity.details?.voteType}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="col-md-6">
                                          <div className="small text-muted">
                                            {activity.type === 'INVESTMENT' && activity.details && (
                                              <>Proposal: #{activity.details.proposalId} - {activity.details.proposalTitle}</>
                                            )}
                                            {activity.type === 'VOTE' && activity.details && (
                                              <>Proposal: #{activity.details.proposalId} - {activity.details.proposalTitle}</>
                                            )}
                                            {activity.type === 'TOKEN_RECEIVED' && activity.details && (
                                              <>From: {activity.details.from}</>
                                            )}
                                            {activity.type === 'TOKEN_SENT' && activity.details && (
                                              <>To: {activity.details.to}</>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Transaction Hash (if available) */}
                                      {activity.details?.txHash && (
                                        <div className="mt-2">
                                          <small className="text-muted">
                                            Tx: {activity.details.txHash.substring(0, 20)}...
                                          </small>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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
                        <p>Please switch to <strong>BSC Testnet</strong> to view your activities.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center my-5">
                      <div className="alert alert-info">
                        <h4>🌐 Select Network</h4>
                        <p>Please select a network from the header dropdown to get started.</p>
                        <small className="text-muted">
                          Recommended: BSC Testnet for development and testing
                        </small>
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

export default InvestorActivityLog;