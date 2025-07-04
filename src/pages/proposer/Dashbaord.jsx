import React, { useState, useEffect } from 'react';
import Header from './component/Header';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import Auth from '../../Auth/Auth';
import { daoABI } from '../../Auth/Abi';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getContractAddress, isTestnet } from '../../utils/networks';

function Dashboard() {
  const [isToggle, setIsToggle] = useState(false);
  const [proposalDetails, setProposalDetails] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [daoContract, setDaoContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState("");
  const authToken = sessionStorage.getItem('authToken');

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
          voteCountFor: proposal.totalVotesFor.toString(),
          voteCountAgainst: proposal.totalVotesAgainst.toString(),
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
                              <div className="col-6"> Votes For : {p.totalVotesFor}</div>
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
                                </div>
                                <div className="col-4 text-end">
                                  <button className="btn btn-sm btn-primary">Vote</button>
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
    </>
  );
}

export default Dashboard;
