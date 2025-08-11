import React, { useCallback, useEffect, useState } from 'react';
import Header from './component/Header';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import Auth from '../../Auth/Auth';
import { toast } from 'react-toastify';
import { getContractAddress, getRpcUrl, isTestnet, getNetworkByChainId, NETWORKS } from '../../utils/networks';
import { daoABI } from '../../Auth/Abi';
import { ethers } from 'ethers';

function ActivityLog() {
  const [isToggle, setIsToggle] = useState(false);
  const [authToken] = useState(sessionStorage.getItem('authToken'));
  const [walletAddress, setWalletAddress] = useState(null);
  const [rpcUrl, setRpcUrl] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [isNetworkSupported, setIsNetworkSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [account, setAccount] = useState(null);
  const [daoContract, setDaoContract] = useState(null);

  // Handle profile data from Auth component
  const handleProfileDataFetched = (data) => {
    // Optional: Handle Auth result
  };

  // Retry logic for RPC calls to mitigate circuit breaker errors
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
        setRpcUrl('');
        setContractAddress('');
        setCurrentNetwork(null);
        setDaoContract(null);
        return;
      }

      try {
        const rpcUrl = getRpcUrl(network.chainId);
        if (!rpcUrl) {
          setIsNetworkSupported(false);
          toast.error(`No valid RPC URL for ${network.chainName}. Please configure a valid RPC provider.`);
          setCurrentNetwork(null);
          setDaoContract(null);
          return;
        }

        setIsNetworkSupported(true);
        setRpcUrl(rpcUrl);
        setCurrentNetwork(network);

        const contractAddr = getContractAddress(network.chainId);
        if (contractAddr === '0x0000000000000000000000000000000000000000') {
          setIsNetworkSupported(false);
          toast.error(`No contract deployed on ${network.chainName}. Please switch to a supported network.`);
          setCurrentNetwork(null);
          setDaoContract(null);
          return;
        }
        setContractAddress(contractAddr);

        // Initialize provider with fallback RPC URLs
        const networkConfig = getNetworkByChainId(network.chainId);
        let provider;
        for (const url of networkConfig.rpcUrls) {
          try {
            provider = new ethers.JsonRpcProvider(url);
            await provider.getNetwork(); // Test connection
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

        if (walletAddress) {
          await fetchActivityData(contractInstance);
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
      }
    },
    [walletAddress]
  );

  // Fetch activity data (proposals, votes, transfers)
  const fetchActivityData = async (contractInstance) => {
    if (!walletAddress) {
      console.warn('Wallet address not available. Skipping activity fetch.');
      return;
    }

    setIsLoading(true);

    try {
      const activityList = [];

      // Fetch proposal creation activities
      const proposerIds = await withRetry(() =>
        contractInstance.getProposalsIDByProposer(walletAddress)
      );

      if (Array.isArray(proposerIds)) {
        const proposalPromises = proposerIds.slice(0, 10).map(async (proposerId) => {
          try {
            const proposal = await withRetry(() => contractInstance.getProposal(proposerId));
            return {
              id: `proposal-${proposerId}`,
              type: 'PROPOSAL_CREATED',
              title: `Created Proposal #${proposerId}`,
              description: proposal.description || `Proposal #${proposerId}`,
              amount: ethers.formatEther(proposal.fundingGoal || '0'),
              status: proposal.executed
                ? proposal.passed
                  ? 'PASSED'
                  : 'FAILED'
                : proposal.rejected
                  ? 'REJECTED'
                  : Number(proposal.endTime) * 1000 > Date.now()
                    ? 'ACTIVE'
                    : 'PENDING',
              timestamp: new Date().toISOString(), // Mock timestamp - would come from blockchain events
              icon: 'fa-plus-circle',
              color: 'primary',
              details: {
                proposalId: Number(proposerId),
                fundingGoal: ethers.formatEther(proposal.fundingGoal || '0'),
                totalVotesFor: ethers.formatEther(proposal.totalVotesFor || '0'),
                totalVotesAgainst: ethers.formatEther(proposal.totalVotesAgainst || '0'),
                endTime: new Date(Number(proposal.endTime) * 1000).toLocaleDateString()
              }
            };
          } catch (error) {
            console.error(`Error fetching proposal ${proposerId}:`, error);
            return null;
          }
        });

        const proposalActivities = (await Promise.all(proposalPromises)).filter(Boolean);
        activityList.push(...proposalActivities);
      }

      // Mock additional activity types for demonstration
      // In a real implementation, these would come from blockchain events
      const mockActivities = [
        {
          id: 'transfer-1',
          type: 'TOKEN_TRANSFER',
          title: 'Received GNJS Tokens',
          description: 'Received tokens from reward distribution',
          amount: '1000.0',
          status: 'COMPLETED',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          icon: 'fa-arrow-down',
          color: 'success',
          details: {
            from: '0x1234...5678',
            to: walletAddress,
            txHash: '0xabcd...1234'
          }
        },
        {
          id: 'vote-1',
          type: 'VOTE_CAST',
          title: 'Voted on Proposal #15',
          description: 'Cast vote in favor of the proposal',
          amount: '500.0',
          status: 'CONFIRMED',
          timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          icon: 'fa-vote-yea',
          color: 'info',
          details: {
            proposalId: 15,
            voteType: 'FOR',
            weight: '500.0'
          }
        },
        {
          id: 'transfer-2',
          type: 'TOKEN_TRANSFER',
          title: 'Sent GNJS Tokens',
          description: 'Transferred tokens to another address',
          amount: '250.0',
          status: 'COMPLETED',
          timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          icon: 'fa-arrow-up',
          color: 'warning',
          details: {
            from: walletAddress,
            to: '0x9876...5432',
            txHash: '0xefgh...5678'
          }
        }
      ];

      activityList.push(...mockActivities);

      // Sort activities by timestamp (newest first)
      activityList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setActivities(activityList);
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
          setAccount(accounts[0]);
          if (currentNetwork) {
            handleNetworkChange(currentNetwork);
          } else {
            const defaultNetwork = NETWORKS.BSC_TESTNET;
            setCurrentNetwork(defaultNetwork);
            handleNetworkChange(defaultNetwork);
          }
        } else {
          setWalletAddress(null);
          setAccount(null);
        }
      } catch (error) {
        console.error('Failed to check connected accounts:', error);
        toast.error('Failed to connect to MetaMask. Please ensure it is unlocked.');
      }
    };

    checkWalletConnected();

    // Listen for account changes
    window.ethereum?.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setAccount(accounts[0]);
        if (currentNetwork) {
          handleNetworkChange(currentNetwork);
        }
      } else {
        setWalletAddress(null);
        setAccount(null);
        toast.warning('Wallet disconnected. Please reconnect to MetaMask.');
      }
    });

    // Listen for network changes
    window.ethereum?.on('chainChanged', (chainId) => {
      const network = getNetworkByChainId(chainId);
      setCurrentNetwork(network);
      handleNetworkChange(network);
    });

    // Cleanup listeners on unmount
    return () => {
      window.ethereum?.removeListener('accountsChanged', () => { });
      window.ethereum?.removeListener('chainChanged', () => { });
    };
  }, [currentNetwork, handleNetworkChange]);

  // Manual refresh function
  const refreshActivities = async () => {
    if (daoContract && account) {
      try {
        setIsLoading(true);
        await fetchActivityData(daoContract);
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
                <h4 className="mt-4">Activity Log</h4>

                {/* Network Status & Controls */}
                <div className="row mb-4">
                  <div className="col-12">
                    {currentNetwork ? (
                      <div className="alert alert-info d-flex justify-content-between align-items-center">
                        <div>
                          <i className="fas fa-history me-2"></i>Recent Activities
                          {account && (
                            <small className="d-block text-muted mt-1">
                              <i className="fas fa-wallet me-1"></i>
                              {account.substring(0, 10)}...{account.slice(-8)}
                            </small>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {isTestnet(currentNetwork.chainId) && (
                            <span className="badge bg-warning">Testnet</span>
                          )}
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={refreshActivities}
                            disabled={isLoading}
                            title="Refresh activities"
                          >
                            <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''} me-1`}></i>
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
                        <div className="card bg-primary text-white mb-4">
                          <div className="card-body">
                            <div>Total Activities: {activities.length || 0}</div>
                            <small className="opacity-75">&nbsp;</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-success text-white mb-4">
                          <div className="card-body">
                            <div>Proposals Created: {activities.filter((a) => a.type === 'PROPOSAL_CREATED').length}</div>
                            <small className="opacity-75">&nbsp;</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-info text-white mb-4">
                          <div className="card-body">
                            <div>Votes Cast: {activities.filter((a) => a.type === 'VOTE_CAST').length}</div>
                            <small className="opacity-75">&nbsp;</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-warning text-white mb-4">
                          <div className="card-body">
                            <div>Token Transfers: {activities.filter((a) => a.type === 'TOKEN_TRANSFER').length}</div>
                            <small className="opacity-75">&nbsp;</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="mt-5">
                      <div className="row">
                        <div className="col-12">
                          {activities.length === 0 ? (
                            <div className="text-center py-5">
                              <div className="mb-4">
                                <i className="fas fa-history fa-3x text-muted mb-3"></i>
                                <h5 className="text-muted">No Activity Found</h5>
                                <p className="text-muted">
                                  You don't have any recent activities to display.
                                </p>
                                <div className="mt-3">
                                  <button
                                    className="btn btn-primary me-2"
                                    onClick={() => (window.location.href = '/create-proposal')}
                                  >
                                    <i className="fas fa-plus me-1"></i>
                                    Create Your First Proposal
                                  </button>
                                  <button
                                    className="btn btn-outline-secondary"
                                    onClick={refreshActivities}
                                    disabled={isLoading}
                                  >
                                    <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''} me-1`}></i>
                                    Try Again
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="card">
                              <div className="card-header">
                                <h5 className="mb-0">
                                  <i className="fas fa-clock me-2"></i>Activity Timeline
                                </h5>
                              </div>
                              <div className="card-body p-0">
                                <div className="list-group list-group-flush">
                                  {activities.map((activity, index) => (
                                    <div className="list-group-item border-0 py-3" key={activity.id}>
                                      <div className="d-flex align-items-start">
                                        <div className={`me-3 rounded-circle d-flex align-items-center justify-content-center bg-${activity.color} bg-opacity-10 text-${activity.color}`}
                                          style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                          <i className={`fas ${activity.icon} fa-lg`}></i>
                                        </div>
                                        <div className="flex-grow-1">
                                          <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                              <h6 className="mb-1 fw-bold">{activity.title}</h6>
                                              <p className="mb-1 text-muted">{activity.description}</p>
                                            </div>
                                            <div className="text-end">
                                              <span className={`badge bg-${activity.color === 'primary' ? 'primary' : 
                                                activity.color === 'success' ? 'success' : 
                                                activity.color === 'info' ? 'info' : 
                                                activity.color === 'warning' ? 'warning' : 'secondary'} bg-opacity-10 text-${activity.color}`}>
                                                {activity.status}
                                              </span>
                                              <div className="small text-muted mt-1">
                                                {formatRelativeTime(activity.timestamp)}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="row">
                                            <div className="col-md-6">
                                              <div className="d-flex align-items-center">
                                                <i className="fas fa-coins text-warning me-2"></i>
                                                <span className="fw-semibold">{activity.amount} GNJS</span>
                                              </div>
                                            </div>
                                            <div className="col-md-6">
                                              <div className="small text-muted">
                                                {activity.type === 'PROPOSAL_CREATED' && activity.details && (
                                                  <>ID: #{activity.details.proposalId}, Goal: {activity.details.fundingGoal} GNJS</>
                                                )}
                                                {activity.type === 'TOKEN_TRANSFER' && activity.details && (
                                                  <>
                                                    {activity.details.from.substring(0, 8)}...{activity.details.from.slice(-6)} → {activity.details.to.substring(0, 8)}...{activity.details.to.slice(-6)}
                                                  </>
                                                )}
                                                {activity.type === 'VOTE_CAST' && activity.details && (
                                                  <>Vote: {activity.details.voteType}, Weight: {activity.details.weight} GNJS</>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      {index < activities.length - 1 && <hr className="my-3" />}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
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
                        <p>Please switch to <strong>BSC Testnet</strong> to view your activity.</p>
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

export default ActivityLog;