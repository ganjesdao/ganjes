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
import { FaEye, FaVoteYea, FaCoins, FaThumbsUp, FaThumbsDown, FaClock, FaUser, FaCheckCircle, FaExclamationTriangle, FaChartLine, FaExternalLinkAlt, FaCalendarAlt, FaTimes } from 'react-icons/fa';


// Simple ERC20 ABI for token operations
const tokenABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
];

function Vote() {
  const timestamp = Math.floor(Date.now() / 1000);
  const isoTimestamp = new Date().toISOString();
  const [support, setSupport] = useState(true);
  const navigate = useNavigate();
  const pId = localStorage.getItem('proposalId');
  const [walletAddress, setWalletAddress] = useState(null);
  const [totalInvested, setTotalInvested] = useState(0);
  const [isToggle, setIsToggle] = useState(false);
  const [proposalDetails, setProposalDetails] = useState([]);
  const [fundingGoal, setFundingGoal] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [daoContract, setDaoContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState("");
  const authToken = sessionStorage.getItem('authToken');
  const tokenContract = process.env.REACT_APP_TOKEN_ADDRESS;
  const [investmentAmount, setInvestmentAmount] = useState(15);
  const [proposalId, setProposalId] = useState('');
  const [signer, setSigner] = useState(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState(null);
  const [voteAmount, setVoteAmount] = useState(15);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
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
      const provider = new ethers.BrowserProvider(window.ethereum);
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
      setProposalDetails([]);
    }
  };

  // Initialize contract
  const initializeContract = async (contractAddr) => {
    if (!contractAddr || contractAddr === '0x0000000000000000000000000000000000000000') {

      setDaoContract(null);
      setProposalDetails([]);
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
      setProposalDetails([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch proposal details
  const fetchProposalDetails = async (id, contract) => {
    try {
      setIsLoading(true);
      const proposalData = [];
      const basic = await contract.proposals(id);


      console.log('Proposal Data', basic);

      setProposalDetails(basic);
      const fundingGoal = ethers.formatUnits(basic.fundingGoal, 18);
      const endTime = new Date(Number(basic.endTime) * 1000).toLocaleString();
      const totalInvested = ethers.formatUnits(basic.totalInvested, 18); // Convert timestamp to date string
      setFundingGoal(fundingGoal);
      setTotalInvested(totalInvested);
      setIsLoading(false);

    } catch (error) {
      console.error("Error fetching proposals:", error);
      toast.error("Failed to fetch proposals!");
      setProposalDetails([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch proposals on network change
  useEffect(() => {
    if (daoContract && currentNetwork) {
      const fetchProposalsOnNetworkChange = async () => {
        try {
          setIsLoading(true);
          const ids = await daoContract.getAllProposalIds();
          await fetchProposalDetails(pId, daoContract);
        } catch (error) {
          console.error("Error fetching proposals on network change:", error);
          setProposalDetails([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProposalsOnNetworkChange();
    }
  }, [daoContract, currentNetwork]);


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
      toast.error(error.message);
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
                              {proposalDetails.projectName}
                            </h3>
                            <p className="mb-0 opacity-75">
                              Proposal ID: #{pId}
                            </p>
                          </div>
                          <div className="col-md-4 col-12 text-md-end text-center mt-3 mt-md-0">
                            <span className={`badge ${proposalDetails.executed ? 'bg-success' : 'bg-warning'} rounded-pill px-4 py-2`} style={{ fontSize: '0.9rem' }}>
                              {proposalDetails.executed ? (
                                <><FaCheckCircle className="me-1" /> Executed</>
                              ) : (
                                <><FaClock className="me-1" /> Pending</>
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
                                src='assets/image/Landing/canabies-logo.avif'
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
                              <p className="text-muted lh-lg text-truncate-3">
                                {proposalDetails.description}
                              </p>
                            </div>

                            {/* Project URL */}
                            <div className="mb-4">
                              <h6 className="text-dark mb-2">Project URL</h6>
                              <a
                                className="btn btn-outline-primary btn-sm rounded-pill px-3"
                                href={proposalDetails.projectUrl}
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
                                      <div className="fw-bold text-success">{proposalDetails.votersFor}</div>
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
                                      <div className="fw-bold text-danger">{proposalDetails.votersAgainst}</div>
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
                                    <div className="text-primary fw-bold fs-4">GNJ {fundingGoal}</div>
                                    <small className="text-muted">Funding Goal</small>
                                  </div>
                                </div>
                                <div className="col-md-6 col-12 mb-3">
                                  <div className="stats-card border p-3 text-center">
                                    <div className="text-success fw-bold fs-4">GNJ {totalInvested}</div>
                                    <small className="text-muted">Total Invested</small>
                                  </div>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="mt-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="text-muted">Progress</span>
                                  <span className="fw-bold">
                                    {fundingGoal > 0 ? ((totalInvested / fundingGoal) * 100).toFixed(1) : 0}%
                                  </span>
                                </div>
                                <div className="progress" style={{ height: '8px', borderRadius: '10px' }}>
                                  <div
                                    className="progress-bar"
                                    role="progressbar"
                                    style={{
                                      width: `${fundingGoal > 0 ? (totalInvested / fundingGoal) * 100 : 0}%`,
                                      borderRadius: '10px'
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
                                    {proposalDetails.proposer}
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
                                    {proposalDetails.endTime && new Date(Number(proposalDetails.endTime) * 1000).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer with Action Button */}
                      <div className="card-footer bg-light border-0 py-4">
                        <div className="row align-items-center">
                          <div className="col-md-8 col-12 mb-3 mb-md-0">
                            <div className="d-flex align-items-center">
                              <FaVoteYea className="text-primary me-2" />
                              <span className="text-muted">
                                Join the community and support this project with your vote
                              </span>
                            </div>
                          </div>
                          <div className="col-md-4 col-12 text-md-end text-center">
                            {timestamp > proposalDetails.endTime ?
                              <button
                                className="btn btn-danger btn-lg rounded-pill px-4 shadow-sm text-white pulse-animation"
                              >
                                <FaTimes className="me-2" />
                                Voting Ended
                              </button>

                              :
                              <button
                                className="btn btn-gradient btn-lg rounded-pill px-4 shadow-sm text-white pulse-animation"
                                onClick={() => setShowVoteModal(true)} >
                                <FaVoteYea className="me-2" />
                                Cast Your Vote
                              </button>

                            }

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

export default Vote;
