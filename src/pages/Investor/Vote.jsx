import React, { useState, useEffect } from 'react';
import Header from './component/Header';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import Auth from '../../Auth/Auth';
import { daoABI } from '../../Auth/Abi';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getContractAddress, getRpcUrl, isTestnet, getNetworkByChainId } from '../../utils/networks';
import { FaEye, FaVoteYea, FaCoins, FaThumbsUp, FaThumbsDown, FaClock, FaUser, FaCheckCircle, FaExclamationTriangle, FaChartLine, FaExternalLinkAlt, FaCalendarAlt, FaTimes } from 'react-icons/fa';
import { tokenABI } from '../../utils/Tokenabi';
// Simple ERC20 ABI for token operations


function ProposalDetails() {
  const timestamp = Math.floor(Date.now() / 1000);
  const isoTimestamp = new Date().toISOString();
  const [support, setSupport] = useState(true);
  const navigate = useNavigate();
  const pId = localStorage.getItem('proposalId');
  const [walletAddress, setWalletAddress] = useState(null);
  const [totalInvested, setTotalInvested] = useState(null);
  const [isToggle, setIsToggle] = useState(false);
  const [proposalDetails, setProposalDetails] = useState({});
  const [fundingGoal, setFundingGoal] = useState(null);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [daoContract, setDaoContract] = useState(null);
  const [tokenContractInstance, setTokenContractInstance] = useState(null);
  const [tokenContractWithSigner, setTokenContractWithSigner] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const authToken = sessionStorage.getItem('authToken');
  const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;
  const [investmentAmount, setInvestmentAmount] = useState('15.00');
  const [proposalId, setProposalId] = useState(pId || '');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [voteAmount, setVoteAmount] = useState('15.00');
  const [walletBalance, setWalletBalance] = useState('0.00');

  // Filter states (unused but preserved)
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSort, setFilterSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

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
        console.error('Failed to check connected accounts:', error);
      }

      window.ethereum?.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          // Fetch balance when account changes
          if (tokenContractInstance) {
            setTimeout(() => fetchWalletBalance(), 1000);
          }
        } else {
          setWalletAddress(null);
          setSigner(null);
          setTokenContractWithSigner(null);
          setWalletBalance('0.00');
          toast.warning('Wallet disconnected. Please reconnect to MetaMask.');
        }
      });

      window.ethereum?.on('chainChanged', (chainId) => {
        const network = getNetworkByChainId(chainId);
        handleNetworkChange(network);
      });

      return () => {
        window.ethereum?.removeListener('accountsChanged', () => { });
        window.ethereum?.removeListener('chainChanged', () => { });
      };
    };

    checkWalletConnected();
  }, []);

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask not found. Please install it.');
      throw new Error('MetaMask not found');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);
      const signer = await provider.getSigner();
      setSigner(signer);
      
      // Fetch balance after wallet connects
      if (tokenContractInstance) {
        setTimeout(() => fetchWalletBalance(), 1000);
      }
      
      return signer;
    } catch (err) {
      console.error('Wallet connection failed:', err);
      toast.error('Failed to connect wallet!');
      throw err;
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
      fetchProposalDetails(pId, network);
    } else {
      setContractAddress('');
      setDaoContract(null);
      setTokenContractInstance(null);
      setTokenContractWithSigner(null);
      setSigner(null);
      setProposalDetails({});
      setFundingGoal(null);
      setTotalInvested(null);
    }
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

  // Fetch proposal details
  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    if (!walletAddress || !tokenContractInstance) {
      setWalletBalance('0.00');
      return;
    }

    try {
      const balance = await withRetry(() => tokenContractInstance.balanceOf(walletAddress));
      const decimals = await withRetry(() => tokenContractInstance.decimals());
      const formattedBalance = Number(ethers.formatUnits(balance, decimals)).toFixed(2);
      setWalletBalance(formattedBalance);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance('0.00');
    }
  };

  const fetchProposalDetails = async (id, network) => {
    if (!id || !network) {
      console.error('Missing proposal ID or network');
      toast.error('Invalid proposal ID or network configuration');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const contractAddr = getContractAddress(network.chainId);
      if (!contractAddr || contractAddr === '0x0000000000000000000000000000000000000000') {
        throw new Error('Invalid contract address for the selected network');
      }

      const networkConfig = getNetworkByChainId(network.chainId);
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

      const contract = new ethers.Contract(contractAddr, daoABI, provider);
      setDaoContract(contract);

      const tokenContractInst = new ethers.Contract(tokenAddress, tokenABI, provider);
      setTokenContractInstance(tokenContractInst);

      const decimals = await withRetry(() => tokenContractInst.decimals());
      const symbol = await withRetry(() => tokenContractInst.symbol());

      const basic = await withRetry(() => contract.proposals(id));
      const proposalData = {
        id: id,
        proposer: basic.proposer || 'Unknown',
        projectName: basic.projectName || 'Unnamed Project',
        description: basic.description || 'No description available',
        projectUrl: basic.projectUrl || '#',
        fundingGoal: basic.fundingGoal || 0n,
        totalInvested: basic.totalInvested || 0n,
        endTime: basic.endTime || 0n,
        executed: basic.executed || false,
        votersFor: Number(basic.votersFor || 0),
        votersAgainst: Number(basic.votersAgainst || 0),
      };

      setProposalDetails(proposalData);

      const fundingGoalFormatted = Number(ethers.formatUnits(proposalData.fundingGoal, decimals)).toFixed(2);
      const totalInvestedFormatted = Number(ethers.formatUnits(proposalData.totalInvested, decimals)).toFixed(2);

      setFundingGoal(fundingGoalFormatted);
      setTotalInvested(totalInvestedFormatted);

      // Fetch wallet balance if wallet is connected
      if (walletAddress) {
        fetchWalletBalance();
      }
    } catch (error) {
      console.error('Error fetching proposal details:', error);
      toast.error(`Failed to fetch proposal details: ${error.message || 'Unknown error'}`);
      setProposalDetails({});
      setFundingGoal(null);
      setTotalInvested(null);
    } finally {
      setIsLoading(false);
    }
  };

  const closeVoteModal = () => {
    setShowVoteModal(false);
    setVoteAmount('15.00');
  };

  const handleVoteSubmit = async () => {
    if (!proposalId || Number(voteAmount) <= 0) {
      toast.error('Please enter a valid proposal ID and vote amount');
      return;
    }

    try {
      setIsLoading(true);

      // Initialize signer and token contract if not already initialized
      let localSigner = signer;
      let localTokenContractWithSigner = tokenContractWithSigner;

      const timeEnding = Number(proposalDetails.endTime);
      const currentTime = Math.floor(Date.now() / 1000);

      console.log(`Ending time ${timeEnding} < ${currentTime}`)

      const proposerAddress = proposalDetails.proposer.toLowerCase();
      const voterAddress = walletAddress.toLowerCase();



      if (proposerAddress === voterAddress) {
        toast.error("You can't vote for yourself");
        return;
      }

      if (currentTime >= timeEnding) {
        toast.error("Voting period has ended.");
        return;

      }

      if (!localSigner || !localTokenContractWithSigner) {
        toast.info('Initializing wallet and token contract...');
        localSigner = await connectWallet();
        if (!localSigner) {
          throw new Error('Failed to initialize signer');
        }
        localTokenContractWithSigner = new ethers.Contract(tokenAddress, tokenABI, localSigner);
        setTokenContractWithSigner(localTokenContractWithSigner);
      }

      await handleVote(proposalId, voteAmount, localSigner, localTokenContractWithSigner);
    } catch (error) {
      console.error('Error in handleVoteSubmit:', error);
      toast.error(`Failed to initiate vote: ${error.message || 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const handleVote = async (proposalId, amount, signer, tokenContractWithSigner) => {
    if (!contractAddress || !tokenAddress || !daoContract) {
      toast.error('Contract not initialized properly');
      setIsLoading(false);
      return;
    }

    try {


      const daoContractWithSigner = new ethers.Contract(contractAddress, daoABI, signer);

      // Check balance
      const balance = await withRetry(() => tokenContractWithSigner.balanceOf(walletAddress));
      const decimals = await withRetry(() => tokenContractWithSigner.decimals());
      const formattedBalance = Number(ethers.formatUnits(balance, decimals)).toFixed(2);

      if (Number(formattedBalance) < Number(amount)) {
        throw new Error(`Insufficient balance. Available: ${formattedBalance} GNJ, Required: ${amount} GNJ`);
      }

      // Check allowance
      const allowance = await withRetry(() => tokenContractWithSigner.allowance(walletAddress, contractAddress));
      const formattedAllowance = Number(ethers.formatUnits(allowance, decimals)).toFixed(2);

      if (Number(formattedAllowance) < Number(amount)) {
        toast.info('Approving tokens...');
        await approveTokens(amount, tokenContractWithSigner, decimals);
      }

      toast.info('Casting vote...');
      const tx = await withRetry(() =>
        daoContractWithSigner.vote(proposalId, support, ethers.parseUnits(amount, decimals))
      );
      await tx.wait();

      toast.success('Vote cast successfully!');
      closeVoteModal();
      fetchProposalDetails(proposalId, currentNetwork);
    } catch (error) {
      console.error('Error voting:', error);
      if (error.code === 4001) {
        toast.error('Transaction rejected by user.');
      } else if (error.code === -32603 && error.message.includes('circuit breaker')) {
        toast.error('Circuit breaker open. Please try again later or switch RPC providers.');
      } else if (error.message.includes('insufficient allowance')) {
        toast.error('Insufficient token allowance. Please approve tokens first.');
      } else if (error.message.includes('insufficient balance')) {
        toast.error('Insufficient token balance.');
      } else if (error.message.includes('voting period')) {
        toast.error('Voting period has ended or proposal is executed.');
      } else {
        toast.error(`Failed to vote: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const approveTokens = async (amount, tokenContractWithSigner, decimals) => {
    try {
      const tx = await withRetry(() =>
        tokenContractWithSigner.approve(contractAddress, ethers.parseUnits(amount, decimals))
      );
      await tx.wait();
      toast.success(`Approved ${amount} GNJ tokens for DAO contract!`);
    } catch (error) {
      console.error('Error approving tokens:', error);
      if (error.code === 4001) {
        toast.error('Token approval rejected by user.');
      } else {
        toast.error(`Failed to approve tokens: ${error.message || 'Unknown error'}`);
      }
      throw error;
    }
  };

  const voteAgainst = () => {
    setSupport(false);
    setVoteAmount('1.00');
  };

  const handleProfileDataFetched = (data) => {
    // Optional: Handle Auth result
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
                    {/* Main Proposal Card */}
                    <div className="card proposal-card shadow-lg border-0 mb-4 mt-5">
                      {/* Header Section */}
                      <div className="card-header gradient-header text-white py-4">
                        <div className="row align-items-center">
                          <div className="col-md-8 col-12">
                            <h3 className="card-title mb-2 fw-bold">
                              <FaChartLine className="me-2 floating-icon" />
                              {proposalDetails.projectName || 'Unnamed Project'}
                            </h3>
                            <p className="mb-0 opacity-75">Proposal ID: #{pId}</p>
                          </div>
                          <div className="col-md-4 col-12 text-md-end text-center mt-3 mt-md-0">
                            <span className={`badge ${proposalDetails.executed ? 'bg-success' : 'bg-warning'} rounded-pill px-4 py-2`} style={{ fontSize: '0.9rem' }}>
                              {proposalDetails.executed ? (
                                <>
                                  <FaCheckCircle className="me-1" /> Executed
                                </>
                              ) : (
                                <>
                                  <FaClock className="me-1" /> Pending
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="card-body p-4">
                        <div className="row">
                          {/* Project Image */}
                          <div className="col-lg-4 col-md-5 col-12 mb-4 mb-md-0">
                            <div className="position-relative">
                              <img
                                className="w-100 project-image shadow-sm"
                                src="assets/image/Landing/canabies-logo.avif"
                                alt="Project Logo"
                                style={{ objectFit: 'cover', height: '250px' }}
                              />
                              <div className="position-absolute top-0 start-0 p-2">
                                <div className="bg-white rounded-circle p-2 shadow icon-circle">
                                  <FaVoteYea className="text-primary" />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Project Details */}
                          <div className="col-lg-8 col-md-7 col-12">
                            {/* Description */}
                            <div className="mb-4">
                              <h5 className="text-primary mb-3">
                                <FaEye className="me-2" />
                                Project Description
                              </h5>
                              <p className="text-muted lh-lg text-truncate-3">{proposalDetails.description || 'No description available'}</p>
                            </div>

                            {/* Project URL */}
                            <div className="mb-4">
                              <h6 className="text-dark mb-2">Project URL</h6>
                              <a
                                className="btn btn-outline-primary btn-sm rounded-pill px-3"
                                href={proposalDetails.projectUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <FaExternalLinkAlt className="me-1" /> View Project
                              </a>
                            </div>

                            {/* Voting Stats */}
                            <div className="mb-4">
                              <h6 className="text-dark mb-3">Voting Statistics</h6>
                              <div className="row">
                                <div className="col-md-6 col-12 mb-2">
                                  <div className="stats-card d-flex align-items-center p-3">
                                    <div className="bg-success rounded-circle p-2 me-3 icon-circle">
                                      <FaThumbsUp className="text-white" />
                                    </div>
                                    <div>
                                      <div className="fw-bold text-success">{proposalDetails.votersFor || 0}</div>
                                      <small className="text-muted">Votes For</small>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-md-6 col-12 mb-2">
                                  <div className="stats-card d-flex align-items-center p-3">
                                    <div className="bg-danger rounded-circle p-2 me-3 icon-circle">
                                      <FaThumbsDown className="text-white" />
                                    </div>
                                    <div>
                                      <div className="fw-bold text-danger">{proposalDetails.votersAgainst || 0}</div>
                                      <small className="text-muted">Votes Against</small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Funding Information */}
                            <div className="mb-4">
                              <h6 className="text-dark mb-3">
                                <FaCoins className="me-2 text-warning" />
                                Funding Information
                              </h6>
                              <div className="row">
                                <div className="col-md-6 col-12 mb-3">
                                  <div className="stats-card border p-3 text-center">
                                    <div className="text-primary fw-bold fs-4">{fundingGoal ? `${fundingGoal} GNJ` : '0 GNJ'}</div>
                                    <small className="text-muted">Funding Goal</small>
                                  </div>
                                </div>
                                <div className="col-md-6 col-12 mb-3">
                                  <div className="stats-card border p-3 text-center">
                                    <div className="text-success fw-bold fs-4">{totalInvested ? `${totalInvested} GNJ` : '0 GNJ'}</div>
                                    <small className="text-muted">Total Invested</small>
                                  </div>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="mt-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="text-muted">Progress</span>
                                  <span className="fw-bold">{fundingGoal && Number(fundingGoal) > 0 ? ((Number(totalInvested) / Number(fundingGoal)) * 100).toFixed(1) : 0}%</span>
                                </div>
                                <div className="progress" style={{ height: '8px', borderRadius: '10px' }}>
                                  <div
                                    className="progress-bar"
                                    role="progressbar"
                                    style={{
                                      width: `${fundingGoal && Number(fundingGoal) > 0 ? (Number(totalInvested) / Number(fundingGoal)) * 100 : 0}%`,
                                      borderRadius: '10px',
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>

                            {/* Proposer Information */}
                            <div className="mb-4">
                              <h6 className="text-dark mb-3">
                                <FaUser className="me-2" />
                                Proposer Information
                              </h6>
                              <div className="stats-card d-flex align-items-center p-3">
                                <img
                                  src="assets/image/Landing/iconCanabies.webp"
                                  width={40}
                                  height={40}
                                  className="rounded-circle me-3"
                                  alt="Proposer Avatar"
                                />
                                <div>
                                  <div className="fw-bold text-truncate" style={{ maxWidth: '200px' }}>
                                    {proposalDetails.proposer || 'Unknown'}
                                  </div>
                                  <small className="text-muted">Proposal Creator</small>
                                </div>
                              </div>
                            </div>

                            {/* Timeline */}
                            <div className="mb-4">
                              <h6 className="text-dark mb-3">
                                <FaCalendarAlt className="me-2 text-info" />
                                Timeline
                              </h6>
                              <div className="stats-card d-flex align-items-center p-3">
                                <div className="bg-info rounded-circle p-2 me-3 icon-circle">
                                  <FaClock className="text-white" />
                                </div>
                                <div>
                                  <div className="fw-bold">End Date</div>
                                  <small className="text-muted">
                                    {proposalDetails.endTime && Number(proposalDetails.endTime) > 0
                                      ? new Date(Number(proposalDetails.endTime) * 1000).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                      : 'Not set'}
                                  </small>
                                </div>
                              </div>
                            </div>

                            {/* Vote Button */}
                            <div className="mt-4">
                              {(() => {
                                const currentTime = Math.floor(Date.now() / 1000);
                                const endTime = Number(proposalDetails.endTime);
                                const isVotingEnded = currentTime >= endTime;
                                
                                return (
                                  <button
                                    className="btn btn-gradient btn-lg w-100 rounded-pill text-white"
                                    onClick={() => {
                                      setShowVoteModal(true);
                                      if (walletAddress && tokenContractInstance) {
                                        fetchWalletBalance();
                                      }
                                    }}
                                    disabled={isLoading || !currentNetwork || !contractAddress || proposalDetails.executed || isVotingEnded}
                                    style={{
                                      background: isVotingEnded 
                                        ? 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'
                                        : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                      border: 'none',
                                    }}
                                  >
                                    {isVotingEnded ? (
                                      <>
                                        <FaTimes className="me-2" />
                                        Voting Ended
                                      </>
                                    ) : (
                                      <>
                                        <FaVoteYea className="me-2" />
                                        Cast Your Vote
                                      </>
                                    )}
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
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
                    <small className="text-muted">Make your voice heard in the DAO governance</small>
                  </div>
                </div>

                {/* Wallet Balance */}
                <div className="mb-4">
                  <div className="stats-card p-3 bg-light border">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary rounded-circle p-2 me-3">
                          <FaCoins className="text-white" />
                        </div>
                        <div>
                          <h6 className="mb-1 fw-bold">Your Wallet Balance</h6>
                          <small className="text-muted">Available GNJ tokens</small>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold fs-5 text-primary">{walletBalance} GNJ</div>
                        <small className="text-muted">Balance</small>
                      </div>
                    </div>
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
                      max={walletBalance}
                      step="0.01"
                      placeholder="Enter amount to invest"
                      style={{ fontSize: '1.1rem' }}
                    />
                    <span className="input-group-text bg-light text-muted">GNJ</span>
                  </div>
                  <div className="form-text text-muted mt-2">
                    <small>
                      <FaExclamationTriangle className="me-1 text-warning" />
                      Minimum: 1 GNJ token required • Available: {walletBalance} GNJ
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
                      <div
                        className={`vote-card ${!support ? 'bg-danger bg-opacity-10 border-danger selected' : 'bg-light'}`}
                        onClick={voteAgainst}
                      >
                        <div className="card-body text-center p-3">
                          <div className="form-check">
                            <input
                              type="radio"
                              className="form-check-input"
                              id="voteAgainst"
                              name="votePreference"
                              checked={!support}
                              onChange={voteAgainst}
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
                        You are voting <strong>{support ? 'FOR' : 'AGAINST'}</strong> this proposal with <strong>{voteAmount} GNJ tokens</strong>.
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
                    <button type="button" className="btn btn-outline-secondary btn-lg w-100 rounded-pill" onClick={closeVoteModal}>
                      Cancel
                    </button>
                  </div>
                  <div className="col-md-6 col-12">
                    <button
                      type="button"
                      className="btn btn-gradient btn-lg w-100 rounded-pill text-white"
                      onClick={handleVoteSubmit}
                      disabled={isLoading || !voteAmount || Number(voteAmount) <= 0 || !contractAddress || !currentNetwork}
                      style={{
                        background: support ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)',
                        border: 'none',
                      }}
                    >
                      {isLoading ? (
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

export default ProposalDetails;