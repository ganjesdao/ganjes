import React, { useState, useEffect } from 'react';
import Header from './component/Header';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import Auth from './auth/Auth';
import { daoABI } from '../../Auth/Abi';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getContractAddress, isTestnet } from '../../utils/networks';


// Simple ERC20 ABI for token operations
const tokenABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
];

function InvestorDashboard() {
  const [isToggle, setIsToggle] = useState(false);
  const [proposalDetails, setProposalDetails] = useState([]);
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

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSort, setFilterSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

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
      
      .vote-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 25px;
        padding: 12px 30px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: all 0.3s ease;
      }
      
      .vote-button:hover {
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

    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = customStyles;
    styleSheet.id = "dashboard-custom-styles";

    // Check if styles already exist
    const existingStyles = document.getElementById("dashboard-custom-styles");
    if (!existingStyles) {
      document.head.appendChild(styleSheet);
    }

    // Cleanup function
    return () => {
      const styleElement = document.getElementById("dashboard-custom-styles");
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  const handleProfileDataFetched = (data) => {
    // Optional: Handle Auth result
  };

  // Filter and sort proposals
  const getFilteredProposals = () => {
    let filtered = [...proposalDetails];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => {
        switch (filterStatus) {
          case 'active':
            return !p.executed;
          case 'executed':
            return p.executed;
          case 'funded':
            // Safely parse the values
            const totalInvested = parseFloat(p.totalInvested || '0');
            const fundingGoal = parseFloat(p.fundingGoal || '0');
            return totalInvested >= fundingGoal;
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p =>
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.proposer || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort proposals
    filtered.sort((a, b) => {
      switch (filterSort) {
        case 'newest':
          return parseInt(b.id || '0') - parseInt(a.id || '0');
        case 'oldest':
          return parseInt(a.id || '0') - parseInt(b.id || '0');
        case 'mostFunded':
          const bInvested = parseFloat(b.totalInvested || '0');
          const aInvested = parseFloat(a.totalInvested || '0');
          return bInvested - aInvested;
        case 'leastFunded':
          const aInvestedLeast = parseFloat(a.totalInvested || '0');
          const bInvestedLeast = parseFloat(b.totalInvested || '0');
          return aInvestedLeast - bInvestedLeast;
        case 'mostVotes':
          const bVotes = parseInt(b.voteCountFor || '0');
          const aVotes = parseInt(a.voteCountFor || '0');
          return bVotes - aVotes;
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Handle network change from Header component
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

  // Initialize contract and fetch proposals
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

      // Fetch all proposal IDs
      const ids = await contract.getAllProposalIds();
      await getProposalDetails(ids, contract);

    } catch (error) {


      if (error.message.includes("could not detect network")) {
        toast.error("❌ Failed to connect to the network. Please check your wallet connection.");
      } else if (error.message.includes("user rejected")) {
        toast.error("❌ Connection rejected by user.");
      }

      setDaoContract(null);
      setProposalDetails([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if network is supported
  const isNetworkSupported = () => {
    return currentNetwork && contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';
  };

  const getProposalDetails = async (ids, contract) => {
    try {
      const details = await Promise.all(ids.map(async (id) => {
        const proposal = await contract.proposals(id);

        const proposaldata = await proposal
        console.log('Proposal Data', proposaldata);

        // Safely convert BigInt values to strings first, then to numbers where needed
        const endTimeStr = proposal.endTime ? proposal.endTime.toString() : '0';
        const fundingGoalStr = proposal.fundingGoal ? proposal.fundingGoal.toString() : '0';
        const totalInvestedStr = proposal.totalInvested ? proposal.totalInvested.toString() : '0';
        const votersForStr = proposal.votersFor ? proposal.votersFor.toString() : '0';
        const totalVotesForStr = proposal.totalVotesFor ? proposal.totalVotesFor.toString() : '0';
        const totalVotesAgainstStr = proposal.totalVotesAgainst ? proposal.totalVotesAgainst.toString() : '0';
        const votersAgainst = proposaldata.votersAgainst ? proposal.votersAgainst.toString() : '0';

        return {
          id: id.toString(),
          description: proposal.description || "",
          fundingGoal: ethers.formatUnits(fundingGoalStr, 18),
          proposer: proposal.proposer || "",
          voteCountFor: votersForStr,
          votersAgainst: votersAgainst,
          totalVotesFor: totalVotesForStr,
          totalInvested: ethers.formatUnits(totalInvestedStr, 18),
          totalVotesAgainst: totalVotesAgainstStr,
          deadline: parseInt(endTimeStr) > 0 ? new Date(parseInt(endTimeStr) * 1000).toLocaleString() : "No deadline",
          executed: Boolean(proposal.executed)
        };
      }));
      setProposalDetails(details);
      setConsoleLogs(prev => [...prev, {
        timestamp: new Date().toLocaleString(),
        function: "getProposalDetails",
        status: "Success",
        result: details
      }]);
    } catch (error) {

      setProposalDetails([]);
    }
  };


  const openVoteModal = (proposalId) => {
    setSelectedProposalId(proposalId);
    setShowVoteModal(true);
  };

  const closeVoteModal = () => {
    setShowVoteModal(false);
    setSelectedProposalId(null);
    setVoteAmount(15);
  };

  const handleVote = async (proposalId, amount) => {
    console.log('Proposal ID', proposalId, 'Amount:', amount);
    if (!contractAddress || !tokenContract || !daoContract) {
      toast.error("Contract not initialized properly");
      return;
    }

    const support = true;
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

      // Refresh proposal details with proper parameters
      const ids = await daoContract.getAllProposalIds();
      await getProposalDetails(ids, daoContract);

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

  const handleVoteSubmit = () => {
    if (selectedProposalId && voteAmount > 0) {
      handleVote(selectedProposalId, voteAmount);
    } else {
      toast.error("Please enter a valid vote amount");
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

  const starttoVote = (proposalId) => {
    localStorage.setItem('proposalId', proposalId)

    window.location.href = '/investor-vote'

  }

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
                <h1 className="mt-4">Dashboard</h1>
                <ol className="breadcrumb mb-4">
                  <li className="breadcrumb-item active">Dashboard</li>
                </ol>



                {loading ? (
                  <div className="text-center my-5">
                    <div className="spinner-border text-primary" role="status" style={{ width: '4rem', height: '4rem' }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">Fetching proposals from blockchain...</p>
                  </div>
                ) : isNetworkSupported() ? (
                  <>
                    {/* Summary Cards */}
                    <div className="row">
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-primary text-white mb-4">
                          <div className="card-body">Total Proposals: {proposalDetails.length}</div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-warning text-white mb-4">
                          <div className="card-body">Executed: {proposalDetails.filter(p => p.executed).length}</div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-success text-white mb-4">
                          <div className="card-body">Votes For: {
                            proposalDetails.reduce((acc, p) => acc + parseInt(p.voteCountFor || '0'), 0)
                          }</div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-danger text-white mb-4">
                          <div className="card-body">Votes Against: {
                            proposalDetails.reduce((acc, p) => acc + parseInt(p.votersAgainst || '0'), 0)
                          }</div>
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
                                  <i className="fas fa-search me-2"></i>
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
                                    { value: 'funded', label: 'Funded', icon: 'fas fa-dollar-sign' }
                                  ].map(filter => (
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
                            <i className="fas fa-list-alt me-2 text-primary"></i>
                            Investment Proposals
                          </h4>
                          <div className="d-flex align-items-center">
                            <span className="badge badge-gradient me-2">
                              {getFilteredProposals().length} of {proposalDetails.length} proposals
                            </span>
                            {searchQuery && (
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setSearchQuery('')}
                              >
                                <i className="fas fa-times me-1"></i>
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
                                <i className="fas fa-search fa-3x text-muted"></i>
                              </div>
                              <h5 className="text-muted mb-2">
                                {searchQuery ? 'No matching proposals found' : 'No proposals found'}
                              </h5>
                              <p className="text-muted mb-0">
                                {searchQuery
                                  ? 'Try adjusting your search terms or filters'
                                  : 'There are currently no investment proposals available on this network.'
                                }
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
                        getFilteredProposals().map(p => (
                          <div className="col-xl-6 col-lg-6 col-md-12 mb-4" key={p.id}>
                            <div className="card proposal-card h-100 hover-card">
                              <div className="card-header proposal-header border-0 pb-0">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-2">
                                      <span className="badge badge-gradient me-2">
                                        <i className="fas fa-hashtag me-1"></i>
                                        #{p.id}
                                      </span>
                                      <span className={`badge ${p.executed ? 'bg-success' : 'bg-warning'} bg-opacity-90`}>
                                        <i className={`fas ${p.executed ? 'fa-check-circle' : 'fa-clock'} me-1`}></i>
                                        {p.executed ? 'Executed' : 'Active'}
                                      </span>
                                      {parseFloat(p.totalInvested || '0') >= parseFloat(p.fundingGoal || '0') && (
                                        <span className="badge bg-success bg-opacity-90 ms-2">
                                          <i className="fas fa-target me-1"></i>
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
                                    <i className="fas fa-user me-1"></i>
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
                                        <i className="fas fa-thumbs-up fa-lg mb-2"></i>
                                      </div>
                                      <div className="fw-bold text-success h5 mb-1">{p.voteCountFor}</div>
                                      <div className="small text-muted">Votes For</div>
                                    </div>
                                  </div>
                                  <div className="col-6">
                                    <div className="stats-card p-3 text-center">
                                      <div className="text-danger">
                                        <i className="fas fa-thumbs-down fa-lg mb-2"></i>
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
                                      <i className="fas fa-chart-line me-1 text-primary"></i>
                                      Funding Progress
                                    </span>
                                    <span className="badge bg-primary bg-opacity-10 text-primary">
                                      {(() => {
                                        const invested = parseFloat(p.totalInvested || '0');
                                        const goal = parseFloat(p.fundingGoal || '0');
                                        return goal > 0 ? ((invested / goal) * 100).toFixed(1) : '0';
                                      })()}%
                                    </span>
                                  </div>
                                  <div className="progress mb-2" style={{ height: '12px', borderRadius: '10px' }}>
                                    <div
                                      className="funding-progress-bar"
                                      role="progressbar"
                                      style={{
                                        width: `${(() => {
                                          const invested = parseFloat(p.totalInvested || '0');
                                          const goal = parseFloat(p.fundingGoal || '0');
                                          return goal > 0 ? Math.min((invested / goal) * 100, 100) : 0;
                                        })()}%`
                                      }}
                                    ></div>
                                  </div>
                                  <div className="row">
                                    <div className="col-6">
                                      <div className="small text-muted">Raised</div>
                                      <div className="fw-bold text-success">{parseFloat(p.totalInvested || '0').toFixed(2)} GNJ</div>
                                    </div>
                                    <div className="col-6 text-end">
                                      <div className="small text-muted">Goal</div>
                                      <div className="fw-bold text-primary">{parseFloat(p.fundingGoal || '0').toFixed(2)} GNJ</div>
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
                              </div>

                              <div className="card-footer bg-white border-0 pt-0">
                                <button
                                  onClick={() => starttoVote(p.id)}
                                  className="btn vote-button w-100 text-white"
                                  disabled={p.executed}
                                >
                                  <i className="fas fa-vote-yea me-2"></i>
                                  {p.executed ? 'Proposal Executed' : 'Vote & Invest'}
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
                        <p>The DAO contract is not deployed on <strong>{currentNetwork.chainName}</strong> yet.</p>
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
