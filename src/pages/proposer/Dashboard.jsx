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
  const [contractAddress, setContractAddress] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const authToken = sessionStorage.getItem('authToken');

  // Handle profile data from Auth component
  const handleProfileDataFetched = (data) => {
    console.log('Profile Data:', data);
  };

  // Handle network change from Header component
  const handleNetworkChange = (network) => {
    setCurrentNetwork(network);
    if (network) {
      const address = getContractAddress(network.chainId);
      setContractAddress(address);
      console.log(`Network changed to: ${network.chainName}`);
      console.log(`Contract address: ${address}`);
      initializeContract(address);
    } else {
      setContractAddress('');
      setDaoContract(null);
      setProposalDetails([]);
      setWalletAddress('');
    }
  };

  // Initialize contract and fetch proposals
  const initializeContract = async (contractAddr) => {
    if (!contractAddr || contractAddr === '0x0000000000000000000000000000000000000000') {

      setDaoContract(null);
      setProposalDetails([]);
      setWalletAddress('');
      return;
    }

    if (typeof window.ethereum === 'undefined') {
      toast.error('Please install MetaMask!');
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      console.log('Signer Address:', address);
      setWalletAddress(address);

      const contract = new ethers.Contract(contractAddr, daoABI, signer);
      setDaoContract(contract);

      const ids = await contract.getProposalsByProposer(address);
      await getProposalDetails(ids, contract, address);

    } catch (error) {
      console.error('Init error:', error.message);
      if (error.message.includes('could not detect network')) {
        toast.error('❌ Failed to connect to the network. Please check your wallet connection.');
      } else if (error.message.includes('user rejected')) {
        toast.error('❌ Connection rejected by user.');
      }
      setDaoContract(null);
      setProposalDetails([]);
      setWalletAddress('');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if network is supported
  const isNetworkSupported = () => {
    return currentNetwork && contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';
  };

  // Fetch proposal details
  const getProposalDetails = async (ids, contract, address) => {
    try {
      const details = await Promise.all(
        ids.map(async (id) => {
          const proposal = await contract.proposals(id);
          console.log('Proposal:', proposal.proposer, address);
          if (proposal.proposer.toLowerCase() === address.toLowerCase()) {
            console.log('Matching proposal:', proposal);
            return {
              id: id.toString(),
              description: proposal.description || 'No description',
              fundingGoal: ethers.formatUnits(proposal.fundingGoal || 0, 18),
              proposer: proposal.proposer,
              voteCountFor: proposal.votersFor?.toString() || '0',
              voteCountAgainst: proposal.votersAgainst?.toString() || '0',
              deadline: new Date((proposal.endTime?.toString() || 0) * 1000).toLocaleString(),
              executed: proposal.executed || false,
              totalInvested: proposal.totalInvested ? ethers.formatUnits(proposal.totalInvested, 18) : '0', // Add totalInvested if available
            };
          }
          return null;
        })
      );

      const filteredDetails = details.filter((detail) => detail !== null);
      setProposalDetails(filteredDetails);

      setConsoleLogs((prev) => [
        ...prev,
        {
          timestamp: Math.floor(Date.now() / 1000),
          function: 'getProposalDetails',
          status: 'Success',
          result: filteredDetails,
        },
      ]);
    } catch (error) {
      console.error('Error fetching proposal details:', error);
      toast.error('❌ Failed to fetch proposal details.');
      setProposalDetails([]);
      setConsoleLogs((prev) => [
        ...prev,
        {
          timestamp: Math.floor(Date.now() / 1000),
          function: 'getProposalDetails',
          status: 'Error',
          result: error.message,
        },
      ]);
    }
  };

  // useEffect cleanup for contract initialization
  useEffect(() => {
    let isMounted = true;

    if (contractAddress) {
      initializeContract(contractAddress);
    }

    return () => {
      isMounted = false;
    };
  }, [contractAddress]);

  const viewDetails = (proposalId) => {
    localStorage.setItem('proposalId', proposalId)
    window.location.href = "/proposal-details"
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
                <h4 className="mt-4">Dashboard</h4>


                {/* Network Status */}
                <div className="row mb-4">
                  <div className="col-12">
                    {currentNetwork ? (
                      <div className="alert alert-info d-flex justify-content-between align-items-center">
                        <div>
                          My Proposals
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
                          <div className="card-body">
                            Executed: {proposalDetails.filter((p) => p.executed).length}
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-success text-white mb-4">
                          <div className="card-body">
                            Votes For:{' '}
                            {proposalDetails.reduce((acc, p) => acc + Number(p.voteCountFor || 0), 0)}
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-danger text-white mb-4">
                          <div className="card-body">
                            Votes Against:{' '}
                            {proposalDetails.reduce((acc, p) => acc + Number(p.voteCountAgainst || 0), 0)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proposal List */}
                    <div className="mt-5">
                      <div className="row">
                        {proposalDetails.length === 0 ? (
                          <div className="text-center">
                            <p>No proposals found.</p>
                          </div>
                        ) : (
                          proposalDetails.map((p) => (
                            <div className="col-xl-6 col-lg-6 col-md-12 mb-4" key={p.id}>
                              <div className="card proposal-card h-100 hover-card">
                                <div className="card-header proposal-header border-0 pb-0">
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div className="flex-grow-1">
                                      <div className="d-flex align-items-center mb-2">
                                        <span className="badge badge-gradient me-2 text-dark">
                                          <i className="fas fa-hashtag me-1"></i>#{p.id}
                                        </span>
                                        <span
                                          className={`badge ${p.executed ? 'bg-success' : 'bg-warning'} bg-opacity-90`}
                                        >
                                          <i
                                            className={`fas ${p.executed ? 'fa-check-circle' : 'fa-clock'} me-1`}
                                          ></i>
                                          {p.executed ? 'Executed' : 'Active'}
                                        </span>
                                        {parseFloat(p.totalInvested || '0') >= parseFloat(p.fundingGoal || '0') && (
                                          <span className="badge bg-success bg-opacity-90 ms-2">
                                            <i className="fas fa-target me-1"></i>Funded
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
                                      <i className="fas fa-user me-1"></i>Proposer
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
                                        <div className="fw-bold text-success h5 mb-1">
                                          {p.voteCountFor || '0'}
                                        </div>
                                        <div className="small text-muted">Votes For</div>
                                      </div>
                                    </div>
                                    <div className="col-6">
                                      <div className="stats-card p-3 text-center">
                                        <div className="text-danger">
                                          <i className="fas fa-thumbs-down fa-lg mb-2"></i>
                                        </div>
                                        <div className="fw-bold text-danger h5 mb-1">
                                          {p.voteCountAgainst || '0'}
                                        </div>
                                        <div className="small text-muted">Votes Against</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Funding Progress */}
                                  <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                      <span className="fw-semibold">
                                        <i className="fas fa-chart-line me-1 text-primary"></i>Funding Progress
                                      </span>
                                      <span className="badge bg-primary bg-opacity-10 text-primary">
                                        {(() => {
                                          const invested = parseFloat(p.totalInvested || '0');
                                          const goal = parseFloat(p.fundingGoal || '0');
                                          return goal > 0 ? ((invested / goal) * 100).toFixed(1) : '0';
                                        })()}
                                        %
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
                                          })()}%`,
                                        }}
                                        aria-valuenow={(() => {
                                          const invested = parseFloat(p.totalInvested || '0');
                                          const goal = parseFloat(p.fundingGoal || '0');
                                          return goal > 0 ? Math.min((invested / goal) * 100, 100) : 0;
                                        })()}
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                      ></div>
                                    </div>
                                    <div className="row">
                                      <div className="col-6">
                                        <div className="small text-muted">Raised</div>
                                        <div className="fw-bold text-success">
                                          {parseFloat(p.totalInvested || '0').toFixed(2)} GNJ
                                        </div>
                                      </div>
                                      <div className="col-6 text-end">
                                        <div className="small text-muted">Goal</div>
                                        <div className="fw-bold text-primary">
                                          {parseFloat(p.fundingGoal || '0').toFixed(2)} GNJ
                                        </div>
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

                                  <div className="mb-3 p-3 ">
                                    <div className="text-end">
                                      <button className="btn btn-outline-success" onClick={() => viewDetails(p.id)}>View Details</button>
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
                        <p>
                          The DAO contract is not deployed on <strong>{currentNetwork.chainName}</strong>{' '}
                          yet.
                        </p>
                        <p>Please switch to <strong>BSC Testnet</strong> to view and create proposals.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center my-5">
                      <div className="alert alert-info">
                        <h4>🌐 Select Network</h4>
                        <p>Please select a network from the header dropdown to get started.</p>
                        <small className="text-muted">
                          Recommended: BSC Testnet for development and testing
                        </small>
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