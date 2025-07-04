import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import '../../styles/GalaxySlider.css';
import Header from './Inculde/Header';
import { getContractAddress, isTestnet } from '../../utils/networks';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Footer from './Inculde/Footer';
import { daoABI } from '../../Auth/Abi';



function MarketPlace() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const [daoContract, setDaoContract] = useState(null);
  const [proposalDetails, setProposalDetails] = useState([]);
  const [isSliderLoading, setIsSliderLoading] = useState(true); // For slider
  const [isLoading, setIsLoading] = useState(false); // For blockchain data
  const [contractAddress, setContractAddress] = useState("");
  const [currentNetwork, setCurrentNetwork] = useState(null);

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
      window.ethereum?.removeListener('accountsChanged', () => {});
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
      toast.warning("⚠️ Contract not deployed on this network yet!");
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
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddr, daoABI, provider); // Use provider for read-only
      setDaoContract(contract);

      // Fetch all proposal IDs
      const ids = await contract.getAllProposalIds();
      await fetchProposalDetails(ids, contract);

      toast.success(`✅ Connected to contract on ${currentNetwork?.chainName}`);
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

  // Fetch proposal details
  const fetchProposalDetails = async (ids, contract) => {
    try {
      setIsLoading(true);
      const proposalData = [];
      for (const id of ids) {
        const basic = await contract.getProposalBasicDetails(id);
        const voting = await contract.getProposalVotingDetails(id);
        proposalData.push({
          id: basic.id.toString(),
          projectName: basic.projectName,
          projectUrl: basic.projectUrl,
          description: basic.description,
          fundingGoal: ethers.formatEther(basic.fundingGoal),
          totalInvested: ethers.formatEther(voting.totalInvested),
          endTime: new Date(Number(basic.endTime) * 1000).toLocaleString(),
          passed: basic.passed,
        });
      }
      setProposalDetails(proposalData);
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
          await fetchProposalDetails(ids, daoContract);
        } catch (error) {
          console.error("Error fetching proposals on network change:", error);
          toast.error("Failed to refresh proposals!");
          setProposalDetails([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProposalsOnNetworkChange();
    }
  }, [daoContract, currentNetwork]);


  const proposalData = (pId)=>{
    console.log(pId,"id")
    localStorage.setItem("proposalId",pId)
    navigate(`/proposal`)
  }
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

      {/* Stats Section */}
      <section className="py-5">
        <div className="container">
          <div className="row text-center">
            <div className="col-md-3 mb-4">
              <div className="bg-white p-4 rounded shadow-sm h-100">
                <i className="fas fa-project-diagram fa-3x text-primary mb-3"></i>
                <h3 className="h4 fw-bold text-primary">{proposalDetails.length}</h3>
                <p className="text-muted mb-0">Projects Funded</p>
              </div>
            </div>
            <div className="col-md-3 mb-4">
              <div className="bg-white p-4 rounded shadow-sm h-100">
                <i className="fas fa-users fa-3x text-success mb-3"></i>
                <h3 className="h4 fw-bold text-success">10K+</h3>
                <p className="text-muted mb-0">Active Investors</p>
              </div>
            </div>
            <div className="col-md-3 mb-4">
              <div className="bg-white p-4 rounded shadow-sm h-100">
                <i className="fas fa-dollar-sign fa-3x text-warning mb-3"></i>
                <h3 className="h4 fw-bold text-warning">$50M+</h3>
                <p className="text-muted mb-0">Total Funded</p>
              </div>
            </div>
            <div className="col-md-3 mb-4">
              <div className="bg-white p-4 rounded shadow-sm h-100">
                <i className="fas fa-globe fa-3x text-info mb-3"></i>
                <h3 className="h4 fw-bold text-info">50+</h3>
                <p className="text-muted mb-0">Countries</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold">Powerful Features for Everyone</h2>
            <p className="lead text-muted">Whether you're an innovator or investor, Ganjes DAO has the tools you need</p>
          </div>
          {isLoading ? (
            <div className="text-center">
              <div className="loading-spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: 'auto' }}></div>
              <p className="mt-3">Fetching Proposals from Blockchain...</p>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : proposalDetails.length === 0 ? (
            <div className="text-center">
              <p className="text-muted">No proposals available on this network.</p>
            </div>
          ) : (
            <div className="row g-4">
              {proposalDetails.map((proposal) => (
                <div key={proposal.id} className="col-md-6 col-lg-4">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                      <div className="row">
                        <div className="col-9 align-self-center">
                          <h5 className="card-title mt-2">{proposal.projectName}</h5>
                        </div>
                        <div className="col-3 text-end">
                          <img
                            className="bg-warning bg-opacity-10 rounded-circle"
                            src="assets/image/logo/light-log.png"
                            width={30}
                            alt="Ganjes DAO"
                          />
                        </div>
                        <div className="col-12 mt-3">
                          <span>{proposal.description}</span>
                        </div>
                        <div className="col-8 mt-5">
                          <h6>
                             {proposal.passed ? "Passed" : "Pending"}
                          </h6>
                        </div>
                        <div className="col-4 mt-5 text-end">
                          <a
                            onClick={()=>proposalData(proposal.id)}
                            className="badge bg-warning bg-opacity-10 rounded-pill text-dark"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <i className="fa-solid fa-arrow-trend-up"></i>
                          </a>
                        </div>
                        {/* <div className="col-12 mt-3">
                          <p>Funding Goal: {proposal.fundingGoal} ETH</p>
                          <p>Total Invested: {proposal.totalInvested} ETH</p>
                          <p>Voting Ends: {proposal.endTime}</p>
                          <p>Status: {proposal.passed ? "Passed" : "Pending"}</p>
                        </div> */}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer/>
      <ToastContainer position="top-right" autoClose={5000} />
    </>
  );
}

export default MarketPlace;