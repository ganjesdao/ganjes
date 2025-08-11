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
import { FaEye, FaClock, FaUser, FaCheckCircle, FaChartLine, FaExternalLinkAlt, FaCalendarAlt, FaThumbsUp, FaThumbsDown } from 'react-icons/fa';
import { tokenABI } from '../../utils/Tokenabi';

function ProposalDetails() {
  const timestamp = Math.floor(Date.now() / 1000);
  const isoTimestamp = new Date().toISOString();
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
  const [isLoading, setIsLoading] = useState(true);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [investorDetails, setInvestorDetails] = useState([]);
  const [showInvestors, setShowInvestors] = useState(false);
  const [loadingInvestors, setLoadingInvestors] = useState(false);
  const authToken = sessionStorage.getItem('authToken');
  const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;

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
        } else {
          setWalletAddress(null);
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
      return await provider.getSigner();
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

  // Fetch investor details function
  const fetchInvestorDetails = async (proposalId) => {
    if (!daoContract) {
      toast.error('Contract not initialized');
      return;
    }

    try {
      setLoadingInvestors(true);
      const result = await daoContract.getInvestorDetails(proposalId);
      
      const [investors, investments, voteSupports, timestamps, hasVotedFlags] = result;
      
      const formattedInvestors = investors.map((investor, index) => ({
        address: investor,
        investment: ethers.formatEther(investments[index] || '0'),
        voteSupport: voteSupports[index],
        timestamp: timestamps[index] ? new Date(Number(timestamps[index]) * 1000).toLocaleString() : 'Unknown',
        hasVoted: hasVotedFlags[index]
      }));

      setInvestorDetails(formattedInvestors);
      setShowInvestors(true);
      toast.success(`Loaded ${formattedInvestors.length} investor details`);
    } catch (error) {
      console.error('Fetch investors error:', error.message);
      toast.error(`Failed to fetch investor details: ${error.message}`);
    } finally {
      setLoadingInvestors(false);
    }
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
                                  <FaChartLine className="text-primary" />
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
                                <FaChartLine className="me-2 text-warning" />
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
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Investor Details Section */}
                    <div className="card border-0 shadow-lg mt-4">
                      <div className="card-header bg-gradient-primary text-white py-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <h5 className="mb-0">
                            <FaUser className="me-2" />
                            Investor Details
                          </h5>
                          <button
                            className="btn btn-light btn-sm"
                            onClick={() => fetchInvestorDetails(pId)}
                            disabled={loadingInvestors}
                          >
                            {loadingInvestors ? (
                              <>
                                <div className="spinner-border spinner-border-sm me-2" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                                Loading...
                              </>
                            ) : (
                              <>
                                <FaEye className="me-2" />
                                View Investors
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="card-body p-0">
                        {!showInvestors ? (
                          <div className="text-center py-5">
                            <FaUser className="text-muted mb-3" style={{ fontSize: '3rem' }} />
                            <h6 className="text-muted mb-3">Investor Information</h6>
                            <p className="text-muted mb-4">
                              Click "View Investors" to see detailed information about investors,<br />
                              including their investments, votes, and participation timestamps.
                            </p>
                            <button
                              className="btn btn-primary"
                              onClick={() => fetchInvestorDetails(pId)}
                              disabled={loadingInvestors}
                            >
                              <FaEye className="me-2" />
                              Load Investor Details
                            </button>
                          </div>
                        ) : investorDetails.length === 0 ? (
                          <div className="text-center py-5">
                            <FaUser className="text-muted mb-3" style={{ fontSize: '3rem' }} />
                            <h6 className="text-muted mb-3">No Investors Found</h6>
                            <p className="text-muted">
                              This proposal doesn't have any investors yet.
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Investor Summary Cards */}
                            <div className="row p-4 pb-0">
                              <div className="col-md-3 col-6 mb-3">
                                <div className="stats-card text-center p-3 bg-primary bg-opacity-10 border-primary">
                                  <div className="fw-bold text-primary h4">{investorDetails.length}</div>
                                  <small className="text-muted">Total Investors</small>
                                </div>
                              </div>
                              <div className="col-md-3 col-6 mb-3">
                                <div className="stats-card text-center p-3 bg-success bg-opacity-10 border-success">
                                  <div className="fw-bold text-success h4">
                                    {investorDetails.reduce((sum, inv) => sum + parseFloat(inv.investment || 0), 0).toFixed(2)}
                                  </div>
                                  <small className="text-muted">Total Investment (GNJ)</small>
                                </div>
                              </div>
                              <div className="col-md-3 col-6 mb-3">
                                <div className="stats-card text-center p-3 bg-info bg-opacity-10 border-info">
                                  <div className="fw-bold text-info h4">
                                    {investorDetails.filter(inv => inv.hasVoted).length}
                                  </div>
                                  <small className="text-muted">Voted Investors</small>
                                </div>
                              </div>
                              <div className="col-md-3 col-6 mb-3">
                                <div className="stats-card text-center p-3 bg-warning bg-opacity-10 border-warning">
                                  <div className="fw-bold text-warning h4">
                                    {investorDetails.filter(inv => inv.voteSupport).length}
                                  </div>
                                  <small className="text-muted">Support Votes</small>
                                </div>
                              </div>
                            </div>

                            {/* Investor Table */}
                            <div className="table-responsive">
                              <table className="table table-hover mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th className="px-4 py-3">
                                      <FaUser className="me-2 text-muted" />
                                      Investor Address
                                    </th>
                                    <th className="px-4 py-3">
                                      <FaChartLine className="me-2 text-muted" />
                                      Investment (GNJ)
                                    </th>
                                    <th className="px-4 py-3">
                                      <FaThumbsUp className="me-2 text-muted" />
                                      Vote
                                    </th>
                                    <th className="px-4 py-3">
                                      <FaCalendarAlt className="me-2 text-muted" />
                                      Timestamp
                                    </th>
                                    <th className="px-4 py-3">
                                      <FaCheckCircle className="me-2 text-muted" />
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {investorDetails.map((investor, index) => (
                                    <tr key={index} className="border-bottom">
                                      <td className="px-4 py-3">
                                        <div className="d-flex align-items-center">
                                          <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                                            <FaUser className="text-primary" style={{ fontSize: '0.8rem' }} />
                                          </div>
                                          <div>
                                            <div className="fw-semibold" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                              {investor.address.substring(0, 8)}...{investor.address.slice(-6)}
                                            </div>
                                            <small className="text-muted">
                                              {investor.address.substring(0, 20)}...
                                            </small>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="fw-bold text-success">
                                          {parseFloat(investor.investment).toFixed(4)} GNJ
                                        </div>
                                        <small className="text-muted">
                                          ${(parseFloat(investor.investment) * 0.1).toFixed(2)} USD
                                        </small>
                                      </td>
                                      <td className="px-4 py-3">
                                        {investor.hasVoted ? (
                                          <span className={`badge ${investor.voteSupport ? 'bg-success' : 'bg-danger'} bg-opacity-90`}>
                                            {investor.voteSupport ? (
                                              <>
                                                <FaThumbsUp className="me-1" style={{ fontSize: '0.7rem' }} />
                                                For
                                              </>
                                            ) : (
                                              <>
                                                <FaThumbsDown className="me-1" style={{ fontSize: '0.7rem' }} />
                                                Against
                                              </>
                                            )}
                                          </span>
                                        ) : (
                                          <span className="badge bg-secondary bg-opacity-50">
                                            <FaClock className="me-1" style={{ fontSize: '0.7rem' }} />
                                            Not Voted
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="small">{investor.timestamp}</div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={`badge ${parseFloat(investor.investment) > 0 ? 'bg-success' : 'bg-warning'} bg-opacity-10 text-${parseFloat(investor.investment) > 0 ? 'success' : 'warning'}`}>
                                          {parseFloat(investor.investment) > 0 ? (
                                            <>
                                              <FaCheckCircle className="me-1" style={{ fontSize: '0.7rem' }} />
                                              Invested
                                            </>
                                          ) : (
                                            <>
                                              <FaClock className="me-1" style={{ fontSize: '0.7rem' }} />
                                              Pending
                                            </>
                                          )}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Show/Hide Toggle */}
                            <div className="p-3 bg-light border-top">
                              <div className="text-center">
                                <button
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => setShowInvestors(false)}
                                >
                                  <FaEye className="me-2" />
                                  Hide Investor Details
                                </button>
                              </div>
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
    </>
  );
}

export default ProposalDetails;