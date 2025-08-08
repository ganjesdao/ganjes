import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import Header from './Inculde/Header';
import { getContractAddress, isTestnet, getRpcUrl } from '../../utils/networks';
import { daoABI } from '../../Auth/Abi';
import { ToastContainer, toast } from 'react-toastify';

function Landing() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [daoContract, setDaoContract] = useState(null);
  const [proposalDetails, setProposalDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  // contractAddress removed - managed directly in handleNetworkChange
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [totalProposals, setTotalProposals] = useState("0")
  const [activePrposal, setActivePrposal] = useState(0)
  const [activeInvestors, setActiveInvestors] = useState(0)
  const [totalFunded, setTotalFunded] = useState("0")
  const [rpcUrl, setRpcUrl] = useState("")
  const [contractStats, setContractStats] = useState({
    totalFundingRequested: "0",
    totalFundsRaised: "0",
    activeProposals: 0,
    executedProposals: 0,
    totalVoters: 0
  })



  // Check if wallet is already connected on component mount
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

    // Cleanup listener on unmount
    return () => {
      window.ethereum?.removeListener('accountsChanged', () => { });
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not found. Please install it.");
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
    }
  };

  const navigateToDashboard = () => {
    if (walletAddress) {
      navigate('/dashboard');
    } else {
      connectWallet();
    }
  };

  const handleNetworkChange = (network) => {
    setCurrentNetwork(network);
    if (network) {
      const address = getContractAddress(network.chainId);
      const rpcUrl = getRpcUrl(network.chainId);

      console.log(`Network changed to: ${network.chainName}`);
      console.log(`Contract address: ${address}`);
      console.log(`🌐 RPC URL for ${network.chainName}: ${rpcUrl}`);

      setRpcUrl(rpcUrl);

      // Initialize contract with new network
      initializeContract(network);
    } else {
      setDaoContract(null);
      setProposalDetails([]);
      setRpcUrl("");
    }
  };


  // Optimized DAO stats fetching with contract parameter
  const fetchDAOStatsWithContract = async (contract) => {
    if (!contract) {
      console.warn('⚠️ Contract not provided for DAO stats');
      return;
    }

    try {

      // Get basic DAO stats first
      const daoStatsData = await contract.getDAOStats();
      // Extract and set individual stats for UI display
      if (daoStatsData) {
        // Update stats from DAO contract
        setTotalProposals(daoStatsData.totalProposals ? daoStatsData.totalProposals.toString() : '0');
        setActivePrposal(daoStatsData.activeProposals ? Number(daoStatsData.activeProposals) : 0);
        setActiveInvestors(daoStatsData.activeInvestorsCount ? Number(daoStatsData.activeInvestorsCount) : 0);
        setTotalFunded(daoStatsData.totalFunded ? ethers.formatEther(daoStatsData.totalFunded) : '0');
      } else {
        setTotalProposals('0');
        setActivePrposal(0);
        setActiveInvestors(0);
        setTotalFunded('0');
      }


    } catch (error) {
      // console.error('❌ Error fetching DAO statistics:', error);
      //  toast.error('Failed to fetch DAO statistics');

    }
  };

  // Optimized recent proposals fetching with contract parameter
  const fetchRecentProposalsWithContract = async (contract) => {
    if (!contract) {
      console.warn('⚠️ Contract not provided for proposals');
      return;
    }

    try {
      console.log('📋 Fetching recent proposals for landing page...');

      const proposalCount = await contract.getTotalProposals();

      const totalCount = Number(proposalCount);
      console.log('📊 Total proposals available:', totalCount);

      if (totalCount === 0) {
        console.log('📋 No proposals found');
        setProposalDetails([]);
        return;
      }

      // Fetch the most recent proposals (limit to 6 for landing page)
      const recentLimit = Math.min(6, totalCount);
      const startIndex = Math.max(0, totalCount - recentLimit);

      console.log(`🔍 Fetching ${recentLimit} most recent proposals (starting from ${startIndex})...`);

      const recentProposals = [];

      for (let i = totalCount - 1; i >= startIndex && recentProposals.length < recentLimit; i--) {
        try {
          const proposal = await contract.getProposal(i);

          if (proposal) {
            // Format proposal data for display
            const currentTime = Math.floor(Date.now() / 1000);
            const timeRemaining = proposal.endTime ? Math.max(0, Number(proposal.endTime) - currentTime) : 0;

            const formattedProposal = {
              id: i.toString(),
              projectName: proposal.projectName || `Proposal #${i}`,
              description: proposal.description || 'No description available',
              fundingGoal: proposal.fundingGoal ? ethers.formatEther(proposal.fundingGoal) : '0',
              totalInvested: proposal.totalInvested ? ethers.formatEther(proposal.totalInvested) : '0',
              proposer: proposal.proposer || '0x0000000000000000000000000000000000000000',
              executed: Boolean(proposal.executed),
              passed: Boolean(proposal.passed),
              endTime: proposal.endTime ? Number(proposal.endTime) : 0,
              timeRemaining,
              deadline: proposal.endTime ? new Date(Number(proposal.endTime) * 1000).toLocaleString() : 'No deadline',
              // Status for display
              status: proposal.executed ?
                (proposal.passed ? 'PASSED' : 'FAILED') :
                (timeRemaining > 0 ? 'ACTIVE' : 'PENDING')
            };

            recentProposals.push(formattedProposal);
            console.log(`✅ Loaded proposal ${i}: ${formattedProposal.projectName}`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not fetch proposal ${i}:`, error.message);
        }
      }

      console.log(`📋 Loaded ${recentProposals.length} recent proposals for display`);
      setProposalDetails(recentProposals);

    } catch (error) {
      //  console.error('❌ Error fetching recent proposals:', error);
      //  toast.error('Failed to fetch recent proposals');
      setProposalDetails([]);
    }
  };

  // Legacy function removed - using optimized fetchRecentProposalsWithContract instead

  // Initialize contract
  const initializeContract = async (network) => {

    const contractAddr = getContractAddress(network.chainId);
    if (!contractAddr || contractAddr === '0x0000000000000000000000000000000000000000') {

      setDaoContract(null);
      setProposalDetails([]);
      setIsLoading(false);
      return;
    }

    if (typeof window.ethereum === 'undefined') {
      toast.error("Please install MetaMask!");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get the appropriate RPC URL for the current network
      const networkRpcUrl = getRpcUrl(network?.chainId);
      console.log(`🔗 Using RPC URL: ${networkRpcUrl}`);

      // Create a provider using the network's RPC URL
      const provider = new ethers.JsonRpcProvider(networkRpcUrl);
      const contract = new ethers.Contract(contractAddr, daoABI, provider);
      setDaoContract(contract);

      // Fetch DAO statistics immediately after contract initialization
      console.log('📊 Fetching DAO statistics after contract initialization...');
      await fetchDAOStatsWithContract(contract);
      await fetchRecentProposalsWithContract(contract);

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
      setIsLoading(false);
    }
  };




  // Removed redundant useEffect - data is now fetched directly in initializeContract

  // Navigate to proposal details
  const proposalData = (proposalId) => {
    console.log('Navigating to proposal:', proposalId);
    localStorage.setItem("proposalId", proposalId);
    navigate('/proposal');
  };

  return (
    <>
      {/* Navigation */}
      <Header onNetworkChange={handleNetworkChange} />

      {/* Enhanced Hero Section with Gradient Background */}
      <section className="position-relative text-white py-5 overflow-hidden" style={{
        marginTop: '76px',
        background: 'linear-gradient(135deg,rgb(0, 90, 39) 0%,rgb(2, 49, 6) 50%,rgb(5, 5, 5) 100%)',
        minHeight: '100vh'
      }}>
        {/* Animated Background Elements */}
        <div className="position-absolute top-0 start-0 w-100 h-100" style={{
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          animation: 'float 20s ease-in-out infinite'
        }}></div>

        {/* Floating Elements */}
        <div className="position-absolute" style={{
          top: '20%',
          left: '10%',
          animation: 'float 6s ease-in-out infinite'
        }}>
          <div className="bg-white bg-opacity-10 rounded-circle p-3">
            <i className="fas fa-rocket fa-2x text-warning"></i>
          </div>
        </div>

        <div className="position-absolute" style={{
          top: '60%',
          right: '15%',
          animation: 'float 8s ease-in-out infinite reverse'
        }}>
          <div className="bg-white bg-opacity-10 rounded-circle p-3">
            <i className="fas fa-coins fa-2x text-success"></i>
          </div>
        </div>

        <div className="position-absolute" style={{
          bottom: '20%',
          left: '20%',
          animation: 'float 7s ease-in-out infinite'
        }}>
          <div className="bg-white bg-opacity-10 rounded-circle p-2">
            <i className="fas fa-users fa-lg text-info"></i>
          </div>
        </div>

        <div className="container position-relative" style={{ zIndex: 2 }}>
          <div className="row align-items-center min-vh-100">
            <div className="col-lg-6">
              <div className="pe-lg-5">
                {/* Animated Welcome Badge */}
                <div className="d-inline-block mb-4">
                  <span className="badge px-4 py-2 rounded-pill" style={{
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    fontSize: '0.9rem',
                    animation: 'pulse 2s infinite'
                  }}>
                    🚀 Welcome to the Future of Funding
                  </span>
                </div>

                <h1 className="display-3 fw-bold mb-4" style={{
                  background: 'linear-gradient(45deg, #fff, #ffd700, #fff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundSize: '200% 200%',
                  animation: 'gradient 3s ease infinite'
                }}>
                  Shape Tomorrow with{' '}
                  <span className="d-block">
                    <span style={{ color: '#ffd700' }}>Ganjes DAO</span>
                  </span>
                </h1>

                <p className="lead mb-5 opacity-90" style={{
                  fontSize: '1.4rem',
                  lineHeight: '1.6',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                }}>
                  🌟 The revolutionary decentralized platform where <strong>innovative projects</strong> meet <strong>visionary investors</strong>.
                  Democratize funding, empower creators, and build the future together through transparent blockchain governance.
                </p>

                {/* Enhanced Feature Pills */}
                <div className="d-flex flex-wrap gap-2 mb-5">
                  <span className="badge px-3 py-2 rounded-pill" style={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff'
                  }}>
                    <i className="fas fa-shield-alt me-1"></i>
                    Secure & Transparent
                  </span>
                  <span className="badge px-3 py-2 rounded-pill" style={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff'
                  }}>
                    <i className="fas fa-vote-yea me-1"></i>
                    Democratic Governance
                  </span>
                  <span className="badge px-3 py-2 rounded-pill" style={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff'
                  }}>
                    <i className="fas fa-globe me-1"></i>
                    Global Community
                  </span>
                </div>

                {/* CTA Buttons */}
                <div className="d-flex flex-column flex-sm-row gap-3 mb-4">
                  <button
                    onClick={navigateToDashboard}
                    className="btn btn-lg px-5 py-3 position-relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(45deg, #ff6b6b, #feca57, #ff9ff3)',
                      border: 'none',
                      borderRadius: '50px',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 8px 25px rgba(255,107,107,0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-3px)';
                      e.target.style.boxShadow = '0 12px 35px rgba(255,107,107,0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 8px 25px rgba(255,107,107,0.3)';
                    }}
                  >
                    <i className="fas fa-rocket me-2"></i>
                    🚀 Launch DAO Now
                  </button>

                  <a href="/join" className="btn btn-lg px-5 py-3" style={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    borderRadius: '50px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255,255,255,0.2)';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255,255,255,0.1)';
                      e.target.style.transform = 'translateY(0)';
                    }}>
                    <i className="fas fa-handshake me-2"></i>
                    Join Ganjes
                  </a>
                </div>

              </div>
            </div>

            {/* Enhanced Visual Section */}
            <div className="col-lg-6">
              <div className="text-center position-relative">
                <div className="position-relative d-inline-block">
                  {/* Main Central Element */}
                  <div className="position-relative" style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    padding: '4rem',
                    animation: 'float 4s ease-in-out infinite'
                  }}>
                    <i className="fas fa-handshake fa-6x" style={{
                      background: 'linear-gradient(45deg, #ff6b6b, #feca57)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}></i>
                  </div>

                  {/* Orbiting Elements */}
                  <div className="position-absolute" style={{
                    top: '-20px',
                    left: '-20px',
                    background: 'linear-gradient(135deg, #feca57, #ff9ff3)',
                    borderRadius: '50%',
                    padding: '1rem',
                    animation: 'orbit 8s linear infinite'
                  }}>
                    <i className="fas fa-lightbulb fa-lg text-white"></i>
                  </div>

                  <div className="position-absolute" style={{
                    bottom: '-20px',
                    right: '-20px',
                    background: 'linear-gradient(135deg, #54a0ff, #5f27cd)',
                    borderRadius: '50%',
                    padding: '1rem',
                    animation: 'orbit 10s linear infinite reverse'
                  }}>
                    <i className="fas fa-coins fa-lg text-white"></i>
                  </div>

                  <div className="position-absolute" style={{
                    top: '50%',
                    right: '-40px',
                    background: 'linear-gradient(135deg, #00d2d3, #54a0ff)',
                    borderRadius: '50%',
                    padding: '0.8rem',
                    animation: 'orbit 6s linear infinite',
                    transform: 'translateY(-50%)'
                  }}>
                    <i className="fas fa-users fa-sm text-white"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom CSS Animations */}
        <style >{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          
          @keyframes orbit {
            from { transform: rotate(0deg) translateX(60px) rotate(0deg); }
            to { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          
          @keyframes slideInUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </section>

      {/* Enhanced Stats Section */}
      <section className="py-5 position-relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
      }}>
        {/* Background Pattern */}
        <div className="position-absolute top-0 start-0 w-100 h-100" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(108, 117, 125, 0.05) 0%, transparent 50%)',
          opacity: 0.5
        }}></div>

        <div className="container position-relative">
          {/* Section Header */}
          <div className="text-center mb-5">
            <div className="d-inline-block mb-3">
              <span className="badge px-4 py-2 rounded-pill" style={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                color: 'white',
                fontSize: '0.9rem'
              }}>
                🚀 Our Impact
              </span>
            </div>
            <h2 className="display-6 fw-bold mb-3">
              Transforming the Future of{' '}
              <span style={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Decentralized Funding
              </span>
            </h2>
            <p className="lead text-muted">Real numbers, real impact, real innovation</p>
          </div>

          <div className="row text-center g-4">
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="h-100 p-4 rounded-3 border-0 shadow position-relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                transition: 'all 0.3s ease'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(102, 126, 234, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}>
                <div className="position-absolute top-0 start-0 w-100 h-100" style={{
                  background: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M20 20c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8 8 3.6 8 8zm0 0c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8-8 3.6-8 8z"/%3E%3C/g%3E%3C/svg%3E")'
                }}></div>
                <div className="position-relative">
                  <div className="mb-3">
                    <i className="fas fa-project-diagram fa-3x opacity-75"></i>
                  </div>
                  <h3 className="display-5 fw-bold mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                    {totalProposals || '0'}+
                  </h3>
                  <p className="mb-0 opacity-90 fw-semibold">Total Projects</p>
                  <small className="opacity-75">💡 Innovation Unleashed</small>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <div className="h-100 p-4 rounded-3 border-0 shadow position-relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                transition: 'all 0.3s ease'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(79, 172, 254, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}>
                <div className="position-absolute top-0 start-0 w-100 h-100" style={{
                  background: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M20 20c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8 8 3.6 8 8zm0 0c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8-8 3.6-8 8z"/%3E%3C/g%3E%3C/svg%3E")'
                }}></div>
                <div className="position-relative">
                  <div className="mb-3">
                    <i className="fas fa-globe fa-3x opacity-75"></i>
                  </div>
                  <h3 className="display-5 fw-bold mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                    {activePrposal}+
                  </h3>
                  <p className="mb-0 opacity-90 fw-semibold">💡 Active Unleashed</p>
                  <small className="opacity-75">🌍 Global Reach</small>
                </div>
              </div>
            </div>


            <div className="col-lg-3 col-md-6 mb-4">
              <div className="h-100 p-4 rounded-3 border-0 shadow position-relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                color: 'white',
                transition: 'all 0.3s ease'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(17, 153, 142, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}>
                <div className="position-absolute top-0 start-0 w-100 h-100" style={{
                  background: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M20 20c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8 8 3.6 8 8zm0 0c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8-8 3.6-8 8z"/%3E%3C/g%3E%3C/svg%3E")'
                }}></div>
                <div className="position-relative">
                  <div className="mb-3">
                    <i className="fas fa-users fa-3x opacity-75"></i>
                  </div>
                  <h3 className="display-5 fw-bold mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                    {activeInvestors}+
                  </h3>
                  <p className="mb-0 opacity-90 fw-semibold">Active Investors</p>
                  <small className="opacity-75">🌟 Visionary Community</small>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <div className="h-100 p-4 rounded-3 border-0 shadow position-relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                transition: 'all 0.3s ease'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(240, 147, 251, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}>
                <div className="position-absolute top-0 start-0 w-100 h-100" style={{
                  background: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M20 20c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8 8 3.6 8 8zm0 0c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8-8 3.6-8 8z"/%3E%3C/g%3E%3C/svg%3E")'
                }}></div>
                <div className="position-relative">
                  <div className="mb-3">
                    <i className="fas fa-dollar-sign fa-3x opacity-75"></i>
                  </div>
                  <h3 className="display-5 fw-bold mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                    G {totalFunded}+
                  </h3>
                  <p className="mb-0 opacity-90 fw-semibold">Total Funded</p>
                  <small className="opacity-75">💰 Capital Deployed</small>
                </div>
              </div>
            </div>


          </div>

          {/* Call to Action */}
          <div className="text-center mt-5">
            <p className="lead text-muted mb-4">
              Join thousands of innovators and investors shaping the future together
            </p>
            <button
              onClick={navigateToDashboard}
              className="btn btn-lg px-5 py-3"
              style={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                border: 'none',
                borderRadius: '50px',
                color: 'white',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 30px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
              }}
            >
              <i className="fas fa-arrow-right me-2"></i>
              Get Started Today
            </button>
          </div>
        </div>
      </section>

      {/* Active Proposals Section */}
      <section id="proposals" className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold">Active Proposals</h2>
            <p className="lead text-muted">Discover innovative projects seeking funding through our DAO</p>
            {currentNetwork && (
              <small className="text-muted">
                <i className="fas fa-network-wired me-1"></i>
                Connected to {currentNetwork.chainName}
              </small>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading proposals...</span>
              </div>
              <p className="mt-3 text-muted">Loading proposals from blockchain...</p>
            </div>
          )}

          {/* No Network Connected */}
          {!currentNetwork && !isLoading && (
            <div className="text-center py-5">
              <div className="mb-4">
                <i className="fas fa-plug fa-4x text-muted opacity-50"></i>
              </div>
              <h4 className="text-muted">No Network Connected</h4>
              <p className="text-muted mb-4">Please connect to a network to view proposals</p>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-outline-primary"
              >
                <i className="fas fa-refresh me-2"></i>
                Refresh Page
              </button>
            </div>
          )}

          {/* No Proposals Found */}
          {currentNetwork && !isLoading && proposalDetails.length === 0 && (
            <div className="text-center py-5">
              <div className="mb-4">
                <i className="fas fa-inbox fa-4x text-muted opacity-50"></i>
              </div>
              <h4 className="text-muted">No Proposals Found</h4>
              <p className="text-muted mb-4">
                No proposals found on <strong>{currentNetwork.chainName}</strong> network.
                <br />
                Be the first to submit a proposal or try switching to a different network.
              </p>
              <div className="d-flex justify-content-center gap-3">
                <button
                  onClick={navigateToDashboard}
                  className="btn btn-primary"
                >
                  <i className="fas fa-plus me-2"></i>
                  Submit Proposal
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-outline-secondary"
                >
                  <i className="fas fa-refresh me-2"></i>
                  Refresh
                </button>
              </div>
            </div>
          )}

          {/* Proposals Grid */}
          {!isLoading && proposalDetails.length > 0 && (
            <div className="row g-4">
              {proposalDetails.map((proposal) => (
                <div key={proposal.id} className="col-md-6 col-lg-4">
                  <div className="card h-100 shadow-sm border-0 hover-card" style={{
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                    }}>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-9 align-self-center">
                          <h5 className="card-title mt-2 fw-bold text-dark">
                            {proposal.projectName}
                          </h5>
                        </div>
                        <div className="col-3 text-end">
                          <img
                            className="bg-warning bg-opacity-10 rounded-circle p-1"
                            src="assets/image/logo/light-log.png"
                            width={35}
                            height={35}
                            alt="Ganjes DAO"
                            style={{ objectFit: 'contain' }}
                          />
                        </div>
                        <div className="col-12 mt-3">
                          <p className="text-muted small mb-3" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {proposal.description}
                          </p>
                        </div>

                        {/* Proposal Stats */}
                        <div className="col-12 mb-3">
                          <div className="row g-2">
                            <div className="col-6">
                              <small className="text-muted d-block">Funding Goal</small>
                              <strong className="text-primary">{proposal.fundingGoal} ETH</strong>
                            </div>
                            <div className="col-6">
                              <small className="text-muted d-block">Invested</small>
                              <strong className="text-success">{proposal.totalInvested} ETH</strong>
                            </div>
                          </div>
                        </div>

                        <div className="col-8 mt-3">
                          <span className={`badge ${proposal.passed ? 'bg-success' : 'bg-warning'} bg-opacity-10 ${proposal.passed ? 'text-success' : 'text-warning'} px-3 py-2`}>
                            <i className={`fas ${proposal.passed ? 'fa-check-circle' : 'fa-clock'} me-1`}></i>
                            {proposal.passed ? "Approved" : "Pending"}
                          </span>
                        </div>
                        <div className="col-4 mt-3 text-end">
                          <button
                            onClick={() => proposalData(proposal.id)}
                            className="btn btn-outline-primary btn-sm rounded-pill"
                            title="View Details"
                          >
                            <i className="fas fa-arrow-right"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show More Button */}
          {!isLoading && proposalDetails.length > 0 && (
            <div className="text-center mt-5">
              <button
                onClick={navigateToDashboard}
                className="btn btn-outline-primary btn-lg"
              >
                <i className="fas fa-eye me-2"></i>
                View All Proposals
              </button>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-5 mb-lg-0">
              <div className="pe-lg-5">
                <h2 className="display-5 fw-bold mb-4">
                  Bridging the Gap Between <span className="text-primary">Innovation</span> and <span className="text-success">Investment</span>
                </h2>
                <p className="lead mb-4">
                  Ganjes DAO is more than just a funding platform—it's a complete ecosystem where groundbreaking projects
                  connect with forward-thinking investors through transparent, decentralized governance.
                </p>
                <div className="row g-4">
                  <div className="col-sm-6">
                    <div className="d-flex align-items-start">
                      <i className="fas fa-shield-alt text-primary fa-2x me-3 mt-1"></i>
                      <div>
                        <h6 className="fw-bold">Secure & Transparent</h6>
                        <small className="text-muted">Blockchain-powered transparency ensures every transaction and vote is recorded immutably.</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="d-flex align-items-start">
                      <i className="fas fa-vote-yea text-success fa-2x me-3 mt-1"></i>
                      <div>
                        <h6 className="fw-bold">Democratic Governance</h6>
                        <small className="text-muted">Every token holder has a voice in funding decisions through our advanced voting mechanisms.</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="bg-light p-5 rounded">
                <div className="text-center mb-4">
                  <i className="fas fa-network-wired fa-4x text-primary"></i>
                </div>
                <h4 className="text-center mb-4">The Ganjes Ecosystem</h4>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="bg-white p-3 rounded text-center">
                      <i className="fas fa-lightbulb text-warning mb-2"></i>
                      <small className="d-block fw-bold">Innovators</small>
                      <small className="text-muted">Submit Projects</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-white p-3 rounded text-center">
                      <i className="fas fa-search-dollar text-success mb-2"></i>
                      <small className="d-block fw-bold">Investors</small>
                      <small className="text-muted">Discover Opportunities</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-white p-3 rounded text-center">
                      <i className="fas fa-vote-yea text-primary mb-2"></i>
                      <small className="d-block fw-bold">Community</small>
                      <small className="text-muted">Vote & Govern</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-white p-3 rounded text-center">
                      <i className="fas fa-rocket text-info mb-2"></i>
                      <small className="d-block fw-bold">Projects</small>
                      <small className="text-muted">Get Funded</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-5 position-relative overflow-hidden">
        {/* Background with gradient and pattern */}
        <div className="position-absolute top-0 start-0 w-100 h-100" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          opacity: 0.03
        }}></div>

        <div className="container position-relative">
          {/* Section Header */}
          <div className="text-center mb-5">
            <div className="d-inline-block mb-3">
              <span className="badge px-4 py-2 rounded-pill" style={{
                background: 'linear-gradient(45deg, #ff6b6b, #feca57)',
                color: 'white',
                fontSize: '0.9rem'
              }}>
                ✨ Powerful Features
              </span>
            </div>
            <h2 className="display-5 fw-bold mb-3">
              Everything You Need to{' '}
              <span style={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Succeed
              </span>
            </h2>
            <p className="lead text-muted">Whether you're an innovator or investor, Ganjes DAO provides cutting-edge tools for success</p>
          </div>

          <div className="row g-4">
            {/* Smart Proposals */}
            <div className="col-md-6 col-lg-4">
              <div className="card h-100 border-0 shadow position-relative overflow-hidden" style={{
                transition: 'all 0.3s ease',
                borderRadius: '20px'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(102, 126, 234, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}>
                <div className="position-absolute top-0 start-0 w-100 h-1" style={{
                  background: 'linear-gradient(90deg, #667eea, #764ba2)'
                }}></div>
                <div className="card-body text-center p-4">
                  <div className="mb-4">
                    <div className="d-inline-block p-3 rounded-circle" style={{
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white'
                    }}>
                      <i className="fas fa-file-contract fa-2x"></i>
                    </div>
                  </div>
                  <h5 className="card-title fw-bold mb-3">🚀 Smart Proposals</h5>
                  <p className="card-text text-muted">
                    Create detailed funding proposals with built-in smart contracts for automatic execution and transparent governance.
                  </p>
                  <div className="mt-3">
                    <small className="text-primary fw-semibold">
                      <i className="fas fa-check-circle me-1"></i>
                      Automated & Secure
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Investment Tracking */}
            <div className="col-md-6 col-lg-4">
              <div className="card h-100 border-0 shadow position-relative overflow-hidden" style={{
                transition: 'all 0.3s ease',
                borderRadius: '20px'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(17, 153, 142, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}>
                <div className="position-absolute top-0 start-0 w-100 h-1" style={{
                  background: 'linear-gradient(90deg, #11998e, #38ef7d)'
                }}></div>
                <div className="card-body text-center p-4">
                  <div className="mb-4">
                    <div className="d-inline-block p-3 rounded-circle" style={{
                      background: 'linear-gradient(135deg, #11998e, #38ef7d)',
                      color: 'white'
                    }}>
                      <i className="fas fa-chart-line fa-2x"></i>
                    </div>
                  </div>
                  <h5 className="card-title fw-bold mb-3">📊 Investment Tracking</h5>
                  <p className="card-text text-muted">
                    Monitor your investments and project performance with real-time analytics, detailed reporting, and insights.
                  </p>
                  <div className="mt-3">
                    <small className="text-success fw-semibold">
                      <i className="fas fa-chart-bar me-1"></i>
                      Real-time Analytics
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Community Governance */}
            <div className="col-md-6 col-lg-4">
              <div className="card h-100 border-0 shadow position-relative overflow-hidden" style={{
                transition: 'all 0.3s ease',
                borderRadius: '20px'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(255, 193, 7, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}>
                <div className="position-absolute top-0 start-0 w-100 h-1" style={{
                  background: 'linear-gradient(90deg, #feca57, #ff9ff3)'
                }}></div>
                <div className="card-body text-center p-4">
                  <div className="mb-4">
                    <div className="d-inline-block p-3 rounded-circle" style={{
                      background: 'linear-gradient(135deg, #feca57, #ff9ff3)',
                      color: 'white'
                    }}>
                      <i className="fas fa-users fa-2x"></i>
                    </div>
                  </div>
                  <h5 className="card-title fw-bold mb-3">🗳️ Community Governance</h5>
                  <p className="card-text text-muted">
                    Participate in DAO governance with token-based voting on proposals and platform decisions that shape the future.
                  </p>
                  <div className="mt-3">
                    <small className="text-warning fw-semibold">
                      <i className="fas fa-vote-yea me-1"></i>
                      Democratic Power
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Secure Multisig */}
            <div className="col-md-6 col-lg-4">
              <div className="card h-100 border-0 shadow position-relative overflow-hidden" style={{
                transition: 'all 0.3s ease',
                borderRadius: '20px'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(79, 172, 254, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}>
                <div className="position-absolute top-0 start-0 w-100 h-1" style={{
                  background: 'linear-gradient(90deg, #4facfe, #00f2fe)'
                }}></div>
                <div className="card-body text-center p-4">
                  <div className="mb-4">
                    <div className="d-inline-block p-3 rounded-circle" style={{
                      background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                      color: 'white'
                    }}>
                      <i className="fas fa-shield-alt fa-2x"></i>
                    </div>
                  </div>
                  <h5 className="card-title fw-bold mb-3">🔒 Secure Multisig</h5>
                  <p className="card-text text-muted">
                    Advanced multi-signature wallets ensure funds are released only when predetermined conditions are met.
                  </p>
                  <div className="mt-3">
                    <small className="text-info fw-semibold">
                      <i className="fas fa-lock me-1"></i>
                      Bank-level Security
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Economics */}
            <div className="col-md-6 col-lg-4">
              <div className="card h-100 border-0 shadow position-relative overflow-hidden" style={{
                transition: 'all 0.3s ease',
                borderRadius: '20px'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(240, 147, 251, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}>
                <div className="position-absolute top-0 start-0 w-100 h-1" style={{
                  background: 'linear-gradient(90deg, #f093fb, #f5576c)'
                }}></div>
                <div className="card-body text-center p-4">
                  <div className="mb-4">
                    <div className="d-inline-block p-3 rounded-circle" style={{
                      background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                      color: 'white'
                    }}>
                      <i className="fas fa-coins fa-2x"></i>
                    </div>
                  </div>
                  <h5 className="card-title fw-bold mb-3">💰 Token Economics</h5>
                  <p className="card-text text-muted">
                    Earn GNJ tokens through participation and use them for voting, staking, and governance in our ecosystem.
                  </p>
                  <div className="mt-3">
                    <small className="text-danger fw-semibold">
                      <i className="fas fa-gem me-1"></i>
                      Earn & Govern
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Project Discovery */}
            <div className="col-md-6 col-lg-4">
              <div className="card h-100 border-0 shadow position-relative overflow-hidden" style={{
                transition: 'all 0.3s ease',
                borderRadius: '20px'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(108, 117, 125, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}>
                <div className="position-absolute top-0 start-0 w-100 h-1" style={{
                  background: 'linear-gradient(90deg, #6c757d, #495057)'
                }}></div>
                <div className="card-body text-center p-4">
                  <div className="mb-4">
                    <div className="d-inline-block p-3 rounded-circle" style={{
                      background: 'linear-gradient(135deg, #6c757d, #495057)',
                      color: 'white'
                    }}>
                      <i className="fas fa-search fa-2x"></i>
                    </div>
                  </div>
                  <h5 className="card-title fw-bold mb-3">🔍 Project Discovery</h5>
                  <p className="card-text text-muted">
                    Advanced filtering and search tools help investors find projects matching their interests and investment goals.
                  </p>
                  <div className="mt-3">
                    <small className="text-secondary fw-semibold">
                      <i className="fas fa-filter me-1"></i>
                      Smart Matching
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-5 pt-4">
            <p className="lead text-muted mb-4">
              Ready to experience the future of decentralized funding?
            </p>
            <button
              onClick={navigateToDashboard}
              className="btn btn-lg px-5 py-3"
              style={{
                background: 'linear-gradient(45deg, #ff6b6b, #feca57)',
                border: 'none',
                borderRadius: '50px',
                color: 'white',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 30px rgba(255, 107, 107, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.3)';
              }}
            >
              <i className="fas fa-rocket me-2"></i>
              🚀 Launch Your Journey
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold">How Ganjes DAO Works</h2>
            <p className="lead text-muted">Simple steps to connect projects with investors</p>
          </div>

          <div className="row">
            <div className="col-lg-6 mb-5">
              <h3 className="h4 mb-4 text-primary">
                <i className="fas fa-lightbulb me-2"></i>For Project Creators
              </h3>
              <div className="row g-4">
                <div className="col-12">
                  <div className="d-flex align-items-start">
                    <div className="bg-primary text-white rounded-circle p-2 me-3 flex-shrink-0">
                      <span className="fw-bold">1</span>
                    </div>
                    <div>
                      <h6 className="fw-bold">Submit Your Project</h6>
                      <p className="text-muted mb-0">Create a detailed proposal with project description, funding goals, and milestones.</p>
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex align-items-start">
                    <div className="bg-primary text-white rounded-circle p-2 me-3 flex-shrink-0">
                      <span className="fw-bold">2</span>
                    </div>
                    <div>
                      <h6 className="fw-bold">Community Review</h6>
                      <p className="text-muted mb-0">DAO members review and discuss your project proposal.</p>
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex align-items-start">
                    <div className="bg-primary text-white rounded-circle p-2 me-3 flex-shrink-0">
                      <span className="fw-bold">3</span>
                    </div>
                    <div>
                      <h6 className="fw-bold">Get Funded</h6>
                      <p className="text-muted mb-0">Receive funding if your proposal gets approved through democratic voting.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6 mb-5">
              <h3 className="h4 mb-4 text-success">
                <i className="fas fa-search-dollar me-2"></i>For Investors
              </h3>
              <div className="row g-4">
                <div className="col-12">
                  <div className="d-flex align-items-start">
                    <div className="bg-success text-white rounded-circle p-2 me-3 flex-shrink-0">
                      <span className="fw-bold">1</span>
                    </div>
                    <div>
                      <h6 className="fw-bold">Connect Your Wallet</h6>
                      <p className="text-muted mb-0">Connect your Web3 wallet and acquire GNJ tokens to participate.</p>
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex align-items-start">
                    <div className="bg-success text-white rounded-circle p-2 me-3 flex-shrink-0">
                      <span className="fw-bold">2</span>
                    </div>
                    <div>
                      <h6 className="fw-bold">Discover Projects</h6>
                      <p className="text-muted mb-0">Browse and analyze project proposals using our advanced filtering tools.</p>
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex align-items-start">
                    <div className="bg-success text-white rounded-circle p-2 me-3 flex-shrink-0">
                      <span className="fw-bold">3</span>
                    </div>
                    <div>
                      <h6 className="fw-bold">Vote & Invest</h6>
                      <p className="text-muted mb-0">Use your tokens to vote on proposals and automatically invest in approved projects.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-5 bg-primary text-white">
        <div className="container text-center">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <h2 className="display-5 fw-bold mb-4">Ready to Join the Future of Funding?</h2>
              <p className="lead mb-5">
                Whether you're an innovative project creator or a visionary investor,
                Ganjes DAO provides the platform to make your mark on the future.
              </p>
              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                <button
                  onClick={navigateToDashboard}
                  className="btn btn-light btn-lg px-5"
                >
                  <i className="fas fa-rocket me-2"></i>
                  Launch DAO Now
                </button>
                <a href="#contact" className="btn btn-outline-light btn-lg px-5">
                  <i className="fas fa-envelope me-2"></i>
                  Get in Touch
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold">Get In Touch</h2>
            <p className="lead text-muted">Have questions? We're here to help you get started</p>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="row g-4">
                <div className="col-md-4 text-center">
                  <div className="bg-white p-4 rounded shadow-sm h-100">
                    <i className="fas fa-envelope fa-2x text-primary mb-3"></i>
                    <h6 className="fw-bold">Email</h6>
                    <p className="text-muted mb-0">hello@ganjesdao.org</p>
                  </div>
                </div>
                <div className="col-md-4 text-center">
                  <div className="bg-white p-4 rounded shadow-sm h-100">
                    <i className="fab fa-discord fa-2x text-primary mb-3"></i>
                    <h6 className="fw-bold">Discord</h6>
                    <p className="text-muted mb-0">Join our community</p>
                  </div>
                </div>
                <div className="col-md-4 text-center">
                  <div className="bg-white p-4 rounded shadow-sm h-100">
                    <i className="fab fa-twitter fa-2x text-primary mb-3"></i>
                    <h6 className="fw-bold">Twitter</h6>
                    <p className="text-muted mb-0">@GanjesDAO</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-white py-4">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="d-flex align-items-center">
                <img src="assets/image/logo/logo-desktop.png" width={120} alt="Ganjes DAO" className="me-3" />
                <div>
                  <small>&copy; 2024 Ganjes DAO. All rights reserved.</small>
                  <br />
                  <small className="text-muted">Empowering the future of decentralized funding</small>
                </div>
              </div>
            </div>
            <div className="col-md-6 text-md-end">
              <div className="d-flex justify-content-md-end justify-content-center gap-3 mt-3 mt-md-0">
                <a href="#" className="text-white">
                  <i className="fab fa-twitter fa-lg"></i>
                </a>
                <a href="#" className="text-white">
                  <i className="fab fa-discord fa-lg"></i>
                </a>
                <a href="#" className="text-white">
                  <i className="fab fa-github fa-lg"></i>
                </a>
                <a href="#" className="text-white">
                  <i className="fab fa-telegram fa-lg"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Landing;


