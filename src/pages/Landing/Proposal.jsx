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
import { FaEye } from 'react-icons/fa';



function Proposal() {
    const [walletAddress, setWalletAddress] = useState(null);
    const [fundingGoal, setFundingGoal] = useState(0);
    const [totalInvested, setTotalInvested] = useState(0);
    const navigate = useNavigate();
    const [daoContract, setDaoContract] = useState(null);
    const [proposalDetails, setProposalDetails] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // For blockchain data
    const [contractAddress, setContractAddress] = useState("");
    const [currentNetwork, setCurrentNetwork] = useState(null);
    const pId = localStorage.getItem('proposalId');
    const [showVoteModal, setShowVoteModal] = useState(false);
    const [voteAmount, setVoteAmount] = useState(15);
    const tokenContract = process.env.REACT_APP_TOKEN_ADDRESS;
    const [loading, setLoading] = useState(false);
     const [signer, setSigner] = useState(null);
     const [support, setSupport] = useState(true);

     const tokenABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
];


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
         toast.warning("⚠️ Contract not deployed on this network yet!");
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
                    toast.error("Failed to refresh proposals!");
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
    return (
        <>
            {/* Navigation */}
            <Header onNetworkChange={handleNetworkChange} />
            <div className="container">
                {/* Stats Section */}
                <section className="py-5 mt-5">
                     {isLoading ? (
                  <div className="text-center my-5">
                    <div className="spinner-border text-primary" role="status" style={{ width: '4rem', height: '4rem' }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">Fetching proposals from blockchain...</p>
                  </div>
                ):(
                    <div className="container">
                        <div className="card card-body mt-5 mb-5">
                            <div className="row">
                                <div className="col-md-4 col-xl-4 col-12">
                                    <img className="w-100" src='assets/image/Landing/canabies-logo.avif' />
                                </div>
                                <div className="col-md-8 col-xl-8 col-12">
                                    <div className="mt-3">
                                        <h5 className="">Project : {proposalDetails.projectName}</h5>
                                    </div>
                                    <div className="mt-3">
                                        {proposalDetails.description}
                                    </div>
                                    <div className="mt-4">
                                        project url : <a className="btn btn-outline-success btn-sm" href={proposalDetails.projectUrl} traget="blank"><FaEye /> View</a>

                                    </div>
                                    <div className="mt-3">
                                        Status : <span className={`badge ${proposalDetails.executed ? 'bg-success' : 'bg-warning'}`}> {proposalDetails.executed ? 'Executed' : 'Pending'} </span>
                                    </div>
                                    <div className="mt-3">
                                        <span>  End on : {proposalDetails.endTime} </span>
                                    </div>
                                    <div className="mt-3">
                                        <h6>Voter For : <span className="badge bg-success rounded-pill px-3 py-2" style={{ fontSize: '0.85rem' }}>
                                        <i className="fas fa-thumbs-up me-1"></i>
                                        {proposalDetails.votersFor}
                                    </span> Voter Again : <span className="badge bg-danger rounded-pill px-3 py-2" style={{ fontSize: '0.85rem' }}>
                                        <i className="fas fa-thumbs-down me-1"></i>
                                        {proposalDetails.votersAgainst}
                                    </span>
                                        </h6>

                                    </div>

                                    <hr />
                                    <div className="row mt-0">
                                        <div className="col-1 text-end mt-3">
                                            <img src="assets/image/Landing/iconCanabies.webp" width={30} />
                                        </div>
                                        <div className="col-11">
                                            <span style={{ fontSize: "10px" }}>Proposer</span>
                                            <p style={{ fontSize: "12px" }}>{proposalDetails.proposer}</p>
                                        </div>
                                        <hr />

                                         <div className="row mt-3">
                                        <div className="col-6 ">
                                          <span>Funding Goal : GNJ {fundingGoal}</span>  
                                            
                                        </div>
                                        <div className="col-6">
                                            <span>Invested Amont : GNJ {totalInvested}</span> 
                                        </div>
                                        </div>

                                    </div>
                                </div>
                                <hr/>
                                <div className="col-12 text-end">
                                    Join the community and support this project. <button className="btn btn-success btn-sm" onClick={() => setShowVoteModal(true)}>Vote</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                </section>


            </div>





            {/* Footer */}
            <Footer />
            <ToastContainer position="top-right" autoClose={5000} />

            {showVoteModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-vote-yea text-primary me-2"></i>
                  Cast Your Vote
                </h5>
                <button type="button" className="btn-close" onClick={closeVoteModal}></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-4">
                  <div className="bg-light rounded p-3">
                    <h6 className="text-muted mb-2">Proposal ID</h6>
                    <h4 className="text-primary">#{pId}</h4>
                  </div>
                </div>
                <div className="mb-3">
                  <label htmlFor="voteAmount" className="form-label">
                    <i className="fas fa-coins text-warning me-2"></i>
                    Investment Amount (GNJ tokens)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="voteAmount"
                    value={voteAmount}
                    onChange={(e) => setVoteAmount(e.target.value)}
                    min="1"
                    placeholder="Enter amount to invest"
                  />
                  <small className="form-text text-muted">
                    Minimum: 1 GNJ token
                  </small>
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    <i className="fas fa-vote-yea text-primary me-2"></i>
                    Vote Preference
                  </label>
                  <div className="row">
                    <div className="col-6">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="voteFor"
                          checked={support}
                          onChange={() => setSupport(true)}
                        />
                        <label className="form-check-label" htmlFor="voteFor">
                          Vote For
                        </label>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="voteAgainst"
                          checked={!support}
                          onChange={() => setSupport(false)}
                        />
                        <label className="form-check-label" htmlFor="voteAgainst">
                          Vote Against
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Note:</strong> You are voting {support ? 'FOR' : 'AGAINST'} this proposal. Your investment will be used to support the project if the proposal passes.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeVoteModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleVoteSubmit}
                  disabled={loading || !voteAmount || voteAmount <= 0}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-2"></i>
                      Cast Vote
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
    );
}

export default Proposal;