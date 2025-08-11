import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import '../../styles/GalaxySlider.css';
import Header from './Inculde/Header';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Footer from './Inculde/Footer';
import { getContractAddress, getRpcUrl, NETWORKS } from '../../utils/networks';
import { daoABI } from '../../Auth/Abi';

function MarketPlace() {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentNetwork, setCurrentNetwork] = useState(NETWORKS.BSC_TESTNET);
  const [contractAddress, setContractAddress] = useState('');
  const [contract, setContract] = useState(null);
  const [proposalDetails, setProposalDetails] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSliderLoading, setIsSliderLoading] = useState(true);

  // Slider data (unchanged)
  const sliderData = [
    {
      id: 1,
      title: "Blockchain Galaxy",
      subtitle: "Explore the Universe of Decentralized Innovation",
      description: "Journey through the cosmos of blockchain technology where infinite possibilities await",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      icon: "fas fa-rocket",
      particles: "galaxy",
    },
    {
      id: 2,
      title: "DeFi Constellation",
      subtitle: "Navigate the Stars of Decentralized Finance",
      description: "Connect with stellar opportunities in the ever-expanding DeFi ecosystem",
      background: "linear-gradient(135deg, #2c1810 0%, #3d1a78 50%, #1a1a2e 100%)",
      icon: "fas fa-coins",
      particles: "network",
    },
    {
      id: 3,
      title: "NFT Nebula",
      subtitle: "Create and Trade in the Digital Art Universe",
      description: "Mint your creativity in the cosmic marketplace of unique digital assets",
      background: "linear-gradient(135deg, #0c0c54 0%, #1a1a2e 50%, #000051 100%)",
      icon: "fas fa-gem",
      particles: "stars",
    },
    {
      id: 4,
      title: "Smart Contract Solar System",
      subtitle: "Automated Governance Across the Blockchain Universe",
      description: "Self-executing contracts that power the future of decentralized organizations",
      background: "linear-gradient(135deg, #0f1419 0%, #1e3a8a 50%, #1e40af 100%)",
      icon: "fas fa-cogs",
      particles: "blockchain",
    },
  ];

  // Slider navigation functions
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % sliderData.length);
    setProgress(0);
  }, [sliderData.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + sliderData.length) % sliderData.length);
    setProgress(0);
  }, [sliderData.length]);

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
    setProgress(0);
  }, []);

  // Slider progress and pause
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isPaused || isHovered) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((current) => (current + 1) % sliderData.length);
          return 0;
        }
        return prev + 2; // Increase by 2% every 100ms for 5-second duration
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [sliderData.length, isPaused, isHovered]);

  // Reset progress on slide change
  useEffect(() => {
    setProgress(0);
  }, [currentSlide]);

  // Initialize slider
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSliderLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event) => {
      switch (event.key) {
        case 'ArrowLeft':
          prevSlide();
          break;
        case 'ArrowRight':
          nextSlide();
          break;
        case ' ':
          event.preventDefault();
          setIsPaused((prev) => !prev);
          break;
        case 'Escape':
          setIsPaused(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [nextSlide, prevSlide]);

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
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      setWalletAddress(accounts[0]);
    } catch (err) {
      console.error("Wallet connection failed:", err);
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

  // Particle background component
  const ParticleBackground = useCallback(({ type }) => {
    const getParticleStyle = () => {
      switch (type) {
        case 'galaxy':
          return { filter: 'blur(1px)', opacity: 0.8 };
        case 'network':
          return { filter: 'brightness(1.2)', opacity: 0.6 };
        case 'stars':
          return { filter: 'brightness(1.5)', opacity: 0.9 };
        case 'blockchain':
          return { filter: 'saturate(1.3)', opacity: 0.7 };
        default:
          return { opacity: 0.5 };
      }
    };

    const isMobile = window.innerWidth <= 768;
    const particleCount = isMobile ? 25 : 50;

    return (
      <div className="particle-container" style={getParticleStyle()}>
        {[...Array(particleCount)].map((_, i) => (
          <div
            key={i}
            className={`particle particle-${type || 'default'}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
    );
  }, []);

  const handleNetworkChange = useCallback((network) => {
    console.log(`Network changed to: ${network.chainName}`);
    setCurrentNetwork(network);
    
    // Clear current data
    setContract(null);
    setProposalDetails([]);
    
    // Initialize contract for new network
    initializeContract(network);
  }, []);

  // Initialize contract for reading data
  const initializeContract = useCallback(async (network = currentNetwork) => {
    const contractAddr = getContractAddress(network.chainId);
    if (!contractAddr || contractAddr === '0x0000000000000000000000000000000000000000') {
      console.warn(`No contract deployed on ${network.chainName}`);
      setContract(null);
      setContractAddress('');
      return;
    }

    try {
      // Use network RPC URL for read-only operations (no wallet needed)
      const rpcUrl = getRpcUrl(network.chainId);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contractInstance = new ethers.Contract(contractAddr, daoABI, provider);
      
      setContract(contractInstance);
      setContractAddress(contractAddr);
      
      console.log(`📄 Contract initialized on ${network.chainName}: ${contractAddr}`);
      
      // Fetch initial data
      await fetchProposals(contractInstance);
    } catch (error) {
      console.error('❌ Error initializing contract:', error);
      setContract(null);
    }
  }, [currentNetwork]);

  // Fetch proposal data from contract
  const fetchProposals = useCallback(async (contractInstance = contract) => {
    if (!contractInstance) return;

    try {
      setIsDataLoading(true);
      console.log('📋 Fetching proposals from contract...');
      
      const proposalIds = await contractInstance.getAllProposalIds();
      console.log('📋 Found proposal IDs:', proposalIds.length);
      
      if (!proposalIds.length) {
        setProposalDetails([]);
        return;
      }

      // Fetch ALL proposals for marketplace page (not limited like Landing)
      const proposals = [];
      
      for (let i = 0; i < proposalIds.length; i++) {
        try {
          const id = proposalIds[i];
          const proposal = await contractInstance.getProposal(id);
          
          proposals.push({
            id: Number(id),
            proposer: proposal.proposer,
            description: proposal.description || `Proposal #${id}`,
            projectName: proposal.projectName || proposal.description?.slice(0, 50) + '...' || `Proposal #${id}`,
            fundingGoal: ethers.formatEther(proposal.fundingGoal || '0'),
            totalInvested: ethers.formatEther(proposal.totalInvested || '0'),
            votersFor: Number(proposal.votersFor || 0),
            votersAgainst: Number(proposal.votersAgainst || 0),
            endTime: Number(proposal.endTime) || 0,
            executed: Boolean(proposal.executed),
            passed: Boolean(proposal.passed),
            rejected: Boolean(proposal.rejected)
          });
        } catch (error) {
          console.warn(`⚠️ Failed to fetch proposal ${proposalIds[i]}:`, error.message);
        }
      }
      
      setProposalDetails(proposals);
      console.log(`📋 Loaded ${proposals.length} proposals for marketplace`);
    } catch (error) {
      console.error('❌ Error fetching proposals:', error);
      setProposalDetails([]);
    } finally {
      setIsDataLoading(false);
    }
  }, [contract]);

  // Refresh data handler
  const handleRefreshData = useCallback(async () => {
    if (currentNetwork && contractAddress) {
      console.log('🔄 Refreshing proposal data from Marketplace...');
      await fetchProposals();
      console.log('📋 After refresh, proposals count:', proposalDetails.length);
    }
  }, [currentNetwork, contractAddress, fetchProposals, proposalDetails.length]);

  // Navigation function for proposal details
  const proposalData = (pId) => {
    console.log(pId, "id");
    localStorage.setItem("proposalId", pId);
    navigate(`/proposal`);
  };

  // Initialize contract on component mount
  useEffect(() => {
    initializeContract();
  }, [initializeContract]);

  return (
    <>
      {/* Navigation */}
      <Header onNetworkChange={handleNetworkChange} />

      {/* Animated Galaxy Slider */}
      <section
        className="galaxy-slider"
        style={{ marginTop: '76px' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isSliderLoading && (
          <div className="slider-loading">
            <div className="loading-spinner"></div>
            <p className="text-white mt-3">Loading Galaxy Experience...</p>
          </div>
        )}

        <div className={`slider-container ${isSliderLoading ? 'hidden' : ''}`}>
          {sliderData.map((slide, index) => (
            <div
              key={slide.id}
              className={`slide ${index === currentSlide ? 'active' : ''}`}
              style={{ background: slide.background }}
            >
              <ParticleBackground type={slide.particles} />
              <div className="slide-overlay"></div>
              <div className="container h-100">
                <div className="row align-items-center h-100">
                  <div className="col-lg-6">
                    <div className="slide-content">
                      <div className="slide-icon mb-4">
                        <i className={`${slide.icon} fa-4x text-white`}></i>
                      </div>
                      <h1 className="slide-title display-3 fw-bold text-white mb-3">
                        {slide.title}
                      </h1>
                      <h2 className="slide-subtitle h4 text-white-50 mb-4">
                        {slide.subtitle}
                      </h2>
                      <p className="slide-description lead text-white mb-5">
                        {slide.description}
                      </p>
                      <div className="slide-actions d-flex flex-column flex-sm-row gap-3">
                        <button
                          onClick={navigateToDashboard}
                          className="btn btn-light btn-lg px-5 shadow-lg"
                        >
                          <i className="fas fa-rocket me-2"></i>
                          {walletAddress ? 'Enter DAO' : 'Connect Wallet'}
                        </button>
                        <a href="#about" className="btn btn-outline-light btn-lg px-5">
                          <i className="fas fa-info-circle me-2"></i>
                          Explore Features
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="slide-visual text-center">
                      <div className="cosmic-circle">
                        <div className="inner-circle">
                          <i className={`${slide.icon} fa-6x text-white`}></i>
                        </div>
                        <div className="orbit orbit-1">
                          <div className="orbit-item">
                            <i className="fas fa-cube text-white"></i>
                          </div>
                        </div>
                        <div className="orbit orbit-2">
                          <div className="orbit-item">
                            <i className="fas fa-link text-white"></i>
                          </div>
                        </div>
                        <div className="orbit orbit-3">
                          <div className="orbit-item">
                            <i className="fas fa-shield-alt text-white"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {/* Slider Controls */}
          <div className="slider-controls">
            <button className="slider-btn prev-btn" onClick={prevSlide} aria-label="Previous slide">
              <i className="fas fa-chevron-left"></i>
            </button>
            <button className="slider-btn next-btn" onClick={nextSlide} aria-label="Next slide">
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
          {/* Progress Bar */}
          <div className="slider-progress">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
          {/* Slider Indicators */}
          <div className="slider-indicators">
            {sliderData.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              >
                <span className="indicator-label">{index + 1}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Active Proposals Section */}
      <section id="proposals" className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold">Active Proposals</h2>
            <p className="lead text-muted">Discover innovative projects seeking funding through our DAO</p>
            <small className="text-muted d-block">
              <i className="fas fa-network-wired me-1"></i>
              Connected to {currentNetwork.chainName}
            </small>
            <div className="mt-2">
              {proposalDetails.length > 0 && (
                <small className="badge bg-primary me-2">
                  {proposalDetails.length} Proposals Available
                </small>
              )}
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={handleRefreshData}
                disabled={isDataLoading}
                title="Refresh proposals"
              >
                <i className={`fas fa-sync-alt ${isDataLoading ? 'fa-spin' : ''} me-1`}></i>
                Refresh
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isDataLoading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading proposals...</span>
              </div>
              <p className="mt-3 text-muted">Loading proposals from blockchain...</p>
            </div>
          )}

          {/* No Proposals Found */}
          {!isDataLoading && proposalDetails.length === 0 && (
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
                  onClick={() => initializeContract()}
                  className="btn btn-outline-secondary"
                >
                  <i className="fas fa-refresh me-2"></i>
                  Refresh
                </button>
              </div>
            </div>
          )}

          {/* Proposals Grid */}
          {!isDataLoading && proposalDetails.length > 0 && (
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
                              <strong className="text-primary">{proposal.fundingGoal} GNJS</strong>
                            </div>
                            <div className="col-6">
                              <small className="text-muted d-block">Invested</small>
                              <strong className="text-success">{proposal.totalInvested} GNJS</strong>
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
          {!isDataLoading && proposalDetails.length > 0 && (
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

      {/* Footer */}
      <Footer />
      <ToastContainer position="top-right" autoClose={5000} />
    </>
  );
}

export default MarketPlace;