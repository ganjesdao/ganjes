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

  const handleProfileDataFetched = (data) => {
    // Optional: Handle Auth result
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

      // Fetch all proposal IDs
      const ids = await contract.getAllProposalIds();
      await getProposalDetails(ids, contract);
      
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
        return {
          id,
          description: proposal.description,
          fundingGoal: ethers.formatUnits(proposal.fundingGoal, 18),
          proposer: proposal.proposer,
          voteCountFor: proposal.votersFor.toString(),
          voteCountAgainst: proposal.totalVotesAgainst.toString(),
          totalVotesFor: proposal.totalVotesFor.toString(),
          totalInvested : ethers.formatUnits(proposal.totalInvested, 18),
          totalVotesAgainst: proposal.totalVotesAgainst.toString(),
          deadline: new Date(proposal.endTime.toString() * 1000).toLocaleString(),
          executed: proposal.executed
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
      console.error("Error fetching proposal details:", error);
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

                {/* Network Status */}
                <div className="row mb-4">
                  <div className="col-12">
                    {currentNetwork ? (
                      <div className="alert alert-info d-flex justify-content-between align-items-center">
                        <div>
                          🌐 <strong>Network:</strong> {currentNetwork.chainName} | 
                          💰 <strong>Currency:</strong> {currentNetwork.nativeCurrency.symbol} | 
                          📄 <strong>Contract:</strong> {contractAddress ? 
                            `${contractAddress.substring(0, 6)}...${contractAddress.slice(-4)}` : 
                            "Not deployed"
                          }
                        </div>
                        {isTestnet(currentNetwork.chainId) && (
                          <span className="badge bg-warning">Testnet</span>
                        )}
                      </div>
                    ) : (
                      <div className="alert alert-warning">
                        ⚠️ Please select a network from the header dropdown to view proposals
                      </div>
                    )}
                  </div>
                </div>

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
                            proposalDetails.reduce((acc, p) => acc + Number(p.voteCountFor), 0)
                          }</div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-danger text-white mb-4">
                          <div className="card-body">Votes Against: {
                            proposalDetails.reduce((acc, p) => acc + Number(p.voteCountAgainst), 0)
                          }</div>
                        </div>
                      </div>
                    </div>

                    {/* Proposal List Table */}
                    <div className="mt-5">
                      <div className="row">
                        {proposalDetails.length === 0 ? (
                              <tr><td colSpan="8">No proposals found.</td></tr>
                            ) : (
                             
                              proposalDetails.map(p => (
                        <div className="col-6 mb-4" key={p.id}>
                          <div className="card card-body">
                            <div>
                              <span>Project Details</span>
                              <h6>{p.description.length > 50 ? p.description.slice(0, 50) + '...' : p.description} </h6>
                            </div>
                            <div className="row mt-2">
                              <div className="col-6"> Votes For : {p.voteCountFor}</div>
                              <div className="col-6 text-end">Votes Against : {p.totalVotesAgainst}</div>
                              <hr className="mt-3"/>

                              <div className="col-6 mt-2">Deadline</div>
                              <div className="col-6 text-end mt-2">{p.deadline}</div>
                              <div className="mt-2">
                                <span>Proposer : {p.proposer}</span>
                              </div>
                            </div>
                            <div className="mt-3">
                              <hr />
                              <div className="row">
                                <div className="col-8">
                                  <span>Funding Goal</span>
                                  <h5>{p.fundingGoal} GNJ </h5>
                                  <h5>{p.totalInvested} GNJ </h5>
                                </div>
                                <div className="col-4 text-end">
                                  <button onClick={()=>openVoteModal(p.id)} className="btn btn-sm btn-primary">Vote</button>
                                </div>

                                <div className="col-8 mt-2">
                                  <span>Status</span>
                                </div>
                                <div className="col-4 mt-2 text-end">
                                  <span className={`badge ${p.executed ? 'bg-success' : 'bg-warning'}`}>
                                      {p.executed ? 'Executed' : 'Pending'}
                                    </span>
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

      {/* Vote Modal */}
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
                    <h4 className="text-primary">#{selectedProposalId}</h4>
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
                    onChange={(e) => setVoteAmount(Number(e.target.value))}
                    min="1"
                    placeholder="Enter amount to invest"
                  />
                  <small className="form-text text-muted">
                    Minimum: 1 GNJ token
                  </small>
                </div>

                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Note:</strong> You are voting FOR this proposal. Your investment will be used to support the project if the proposal passes.
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
                  disabled={loading || voteAmount <= 0}
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

export default InvestorDashboard;
