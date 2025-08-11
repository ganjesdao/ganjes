import React, { useCallback, useEffect, useState } from 'react';
import Header from './component/Header';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import Auth from '../../Auth/Auth';
import { toast } from 'react-toastify';
import { getContractAddress, getRpcUrl, isTestnet, getNetworkByChainId, NETWORKS } from '../../utils/networks';
import { daoABI } from '../../Auth/Abi';
import { ethers } from 'ethers';

function Dashboard() {
  const [isToggle, setIsToggle] = useState(false);
  const [authToken] = useState(sessionStorage.getItem('authToken'));
  const [walletAddress, setWalletAddress] = useState(null);
  const [rpcUrl, setRpcUrl] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [isNetworkSupported, setIsNetworkSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Local loading state
  const [userProposals, setUserProposals] = useState([]); // Local proposals state
  const [currentNetwork, setCurrentNetwork] = useState(null); // Local network state
  const [account, setAccount] = useState(null); // Local account state
  const [daoContract, setDaoContract] = useState(null); // Local contract instance

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
          await initializeContract(contractInstance);
        } else {
          // toast.warning('Wallet not connected. Please connect to MetaMask to fetch proposal data.');
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

  // Initialize contract and fetch proposal IDs
  const initializeContract = async (contractInstance) => {
    if (!walletAddress) {
      console.warn('Wallet address not available. Skipping contract initialization.');
      return;
    }

    setIsLoading(true); // Set loading state to true

    try {
      // Fetch proposal IDs for the proposer
      const proposerIds = await withRetry(() =>
        contractInstance.getProposalsIDByProposer(walletAddress)
      );
      console.log('Proposer IDs:', proposerIds);

      // Validate proposerIds is an array
      if (!Array.isArray(proposerIds)) {
        console.warn('Proposer IDs is not an array:', proposerIds);
        toast.warning('No valid proposal IDs found for this wallet.');
        setIsLoading(false);
        return;
      }

      // Limit to 20 proposals to prevent RPC overload
      const proposalPromises = proposerIds.slice(0, 20).map(async (proposerId) => {
        try {
          const proposal = await withRetry(() => contractInstance.getProposal(proposerId));
          return {
            proposerId: Number(proposerId),
            proposer: proposal.proposer || '0x0000000000000000000000000000000000000000',
            description: proposal.description || `Proposal #${proposerId}`,
            projectName: proposal.projectName || (proposal.description?.slice(0, 50) + '...' || `Proposal #${proposerId}`),
            fundingGoal: ethers.formatEther(proposal.fundingGoal || '0'),
            totalVotesFor: ethers.formatEther(proposal.totalVotesFor || '0'),
            totalVotesAgainst: ethers.formatEther(proposal.totalVotesAgainst || '0'),
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
              ? (Number(ethers.formatEther(proposal.totalInvested)) / Number(ethers.formatEther(proposal.fundingGoal)) * 100).toFixed(2)
              : 0,
            totalInvested: ethers.formatEther(proposal.totalInvested || '0'),
            deadline: new Date(Number(proposal.endTime) * 1000).toLocaleDateString(), // Formatted deadline for UI
            timeRemaining: Math.max(0, Number(proposal.endTime) - Math.floor(Date.now() / 1000)), // Seconds remaining
          };
        } catch (error) {
          console.error(`Error fetching proposal ${proposerId}:`, error);
          return null;
        }
      });

      // Resolve all proposal promises and filter out null results
      const proposals = (await Promise.all(proposalPromises)).filter((proposal) => proposal !== null);

      // Store proposals in local state
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
      setIsLoading(false); // Reset loading state
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
            // Default to BSC Testnet if no network is set
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


  // View proposal details
  const viewDetails = (proposalId) => {
    localStorage.setItem('proposalId', proposalId);
    window.location.href = '/proposal-details';
  };

  // Manual refresh function
  const refreshProposals = async () => {
    if (daoContract && account) {
      try {
        setIsLoading(true);
        await initializeContract(daoContract); // Reuse initializeContract for refresh
      } catch (error) {
        console.error('Refresh error:', error);
        if (error.message.includes('circuit breaker')) {
          toast.error('Circuit breaker open. Please try again later or switch RPC providers.');
        } else {
          toast.error('Failed to refresh proposals');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      //  toast.warning('Contract not initialized or wallet not connected');
    }
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
                <h4 className="mt-4">Dashboard</h4>

                {/* Network Status & Controls */}
                <div className="row mb-4">
                  <div className="col-12">
                    {currentNetwork ? (
                      <div className="alert alert-info d-flex justify-content-between align-items-center">
                        <div>
                          <i className="fas fa-list me-2"></i>My Proposals
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
                            onClick={refreshProposals}
                            disabled={isLoading}
                            title="Refresh proposals"
                          >
                            <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''} me-1`}></i>
                            Refresh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-warning">
                        ⚠️ Please select a network from the header dropdown to view proposals
                      </div>
                    )}
                  </div>
                </div>

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
                          <div className="card-body">
                            <div>Total Proposals: {userProposals.length || 0}</div>
                            <small className="opacity-75">&nbsp;</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-warning text-white mb-4">
                          <div className="card-body">
                            <div>Executed: {userProposals.filter((p) => p.executed).length}</div>
                            <small className="opacity-75">&nbsp;</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-success text-white mb-4">
                          <div className="card-body">
                            <div>Voters For: {userProposals.reduce((acc, p) => acc + Number(p.votersFor || 0), 0)}</div>
                            <small className="opacity-75">
                              Weight: {userProposals.reduce((acc, p) => acc + Number(p.totalVotesFor || 0), 0).toFixed(2)} GNJ
                            </small>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-danger text-white mb-4">
                          <div className="card-body">
                            <div>Voters Against: {userProposals.reduce((acc, p) => acc + Number(p.votersAgainst || 0), 0)}</div>
                            <small className="opacity-75">
                              Weight: {userProposals.reduce((acc, p) => acc + Number(p.totalVotesAgainst || 0), 0).toFixed(2)} GNJ
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proposal List */}
                    <div className="mt-5">
                      <div className="row">
                        {userProposals.length === 0 ? (
                          <div className="text-center py-5">
                            <div className="mb-4">
                              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                              <h5 className="text-muted">No Proposals Found</h5>
                              <p className="text-muted">
                                You haven't created any proposals yet or they couldn't be loaded.
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
                                  onClick={refreshProposals}
                                  disabled={isLoading}
                                >
                                  <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''} me-1`}></i>
                                  Try Again
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          userProposals.map((p) => (
                            <div className="col-xl-6 col-lg-6 col-md-12 mb-4" key={p.proposerId}>
                              <div className="card proposal-card h-100 hover-card">
                                <div className="card-header proposal-header border-0 pb-0">
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div className="flex-grow-1">
                                      <div className="d-flex align-items-center mb-2">
                                        <span className="badge badge-gradient me-2 text-dark">
                                          <i className="fas fa-hashtag me-1"></i>#{p.proposerId}
                                        </span>
                                        <span
                                          className={`badge ${p.status === 'PASSED'
                                            ? 'bg-success'
                                            : p.status === 'FAILED'
                                              ? 'bg-danger'
                                              : p.status === 'ACTIVE'
                                                ? 'bg-primary'
                                                : 'bg-warning'
                                            } bg-opacity-90`}
                                        >
                                          <i
                                            className={`fas ${p.status === 'PASSED'
                                              ? 'fa-check-circle'
                                              : p.status === 'FAILED'
                                                ? 'fa-times-circle'
                                                : p.status === 'ACTIVE'
                                                  ? 'fa-vote-yea'
                                                  : 'fa-clock'
                                              } me-1`}
                                          ></i>
                                          {p.status}
                                        </span>
                                        {Number(p.fundingPercent) >= 100 && (
                                          <span className="badge bg-success bg-opacity-90 ms-2">
                                            <i className="fas fa-target me-1"></i>Funded
                                          </span>
                                        )}
                                        {p.timeRemaining > 0 && (
                                          <span className="badge bg-info bg-opacity-90 ms-2">
                                            <i className="fas fa-hourglass-half me-1"></i>
                                            {Math.floor(p.timeRemaining / 86400)}d{' '}
                                            {Math.floor((p.timeRemaining % 86400) / 3600)}h
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
                                      <i className="fas fa-user me-1"></i>Proposer
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
                                          <i className="fas fa-thumbs-up fa-lg mb-2"></i>
                                        </div>
                                        <div className="fw-bold text-success h5 mb-1">{p.votersFor || '0'}</div>
                                        <div className="small text-muted">Voters For</div>
                                      </div>
                                    </div>
                                    <div className="col-6">
                                      <div className="stats-card p-3 text-center">
                                        <div className="text-danger">
                                          <i className="fas fa-thumbs-down fa-lg mb-2"></i>
                                        </div>
                                        <div className="fw-bold text-danger h5 mb-1">{p.votersAgainst || '0'}</div>
                                        <div className="small text-muted">
                                          Voters Against

                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Funding Progress */}
                                  <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                      <span className="fw-semibold">
                                        <i className="fas fa-chart-line me-1 text-primary"></i>Funding Progress
                                      </span>
                                      <span className="badge bg-primary bg-opacity-10 text-primary">
                                        {p.fundingPercent}%
                                      </span>
                                    </div>
                                    <div className="progress mb-2" style={{ height: '12px', borderRadius: '10px' }}>
                                      <div
                                        className="funding-progress-bar"
                                        role="progressbar"
                                        style={{
                                          width: `${p.fundingPercent}%`,
                                        }}
                                        aria-valuenow={p.fundingPercent}
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                      ></div>
                                    </div>
                                    <div className="row">
                                      <div className="col-6">
                                        <div className="small text-muted">Raised</div>
                                        <div className="fw-bold text-success">
                                          {parseFloat(p.totalInvested || '0').toFixed(2)} GNJ
                                        </div>
                                      </div>
                                      <div className="col-6 text-end">
                                        <div className="small text-muted">Goal</div>
                                        <div className="fw-bold text-primary">
                                          {parseFloat(p.fundingGoal || '0').toFixed(2)} GNJ
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Deadline */}
                                  <div className="mb-3 p-3 stats-card">
                                    <div className="d-flex align-items-center">
                                      <i className="fas fa-calendar-alt text-warning me-2 fa-lg"></i>
                                      <div>
                                        <div className="small text-muted">Deadline</div>
                                        <div className="fw-semibold text-dark">{p.deadline}</div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mb-3 p-3">
                                    <div className="text-end">
                                      <button
                                        className="btn btn-outline-success"
                                        onClick={() => viewDetails(p.proposerId)}
                                      >
                                        View Details
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
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
                        <p>Please switch to <strong>BSC Testnet</strong> to view and create proposals.</p>
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

export default Dashboard;