import React, { useState } from 'react';
import Header from './component/Header';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import Auth from '../../Auth/Auth';
import { daoABI } from '../../Auth/Abi';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getContractAddress, getRpcUrl, isTestnet } from '../../utils/networks';

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

  };

  // Handle network change from Header component
  const handleNetworkChange = (network) => {
    setCurrentNetwork(network);
    if (network) {
      const address = getContractAddress(network.chainId);
      setContractAddress(address);

      const rpcUrl = getRpcUrl(network.chainId);

      // console.log(`RPC URL: ${rpcUrl}`); // Assuming you have a function to get RPC URL based on chain ID
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
      setWalletAddress(address);

      const contract = new ethers.Contract(contractAddr, daoABI, signer);

      setDaoContract(contract);

      // Try multiple methods to get proposals
      await getProposalDetails(contract, address);

    } catch (error) {
      console.error('❌ Contract initialization error:', error);
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


  // Fetch individual proposal details with enhanced error handling
  const getProposalDetails = async (contract, address) => {
    try {

      let ids = [];


      ids = await contract.getProposalsIDByProposer(address);


      // console.log('🔍 Fetching details for', ids.length, 'proposals...');

      const details = await Promise.all(
        ids.map(async (id, index) => {
          try {
            // console.log(`🔍 Fetching proposal ${index + 1}/${ids.length}: ID ${id.toString()}`);

            // Try different methods to get proposal data
            let proposal;
            try {
              // Method 1: getProposal function (preferred method from script)
              proposal = await contract.getProposal(id);
              // console.log(`✅ getProposal(${id}) successful`);
            } catch (error) {
              console.warn(`⚠️ getProposal(${id}) failed:`, error.message);
              try {
                // Method 2: proposals mapping (fallback)
                proposal = await contract.proposals(id);
                // console.log(`✅ proposals(${id}) successful (fallback)`);
              } catch (getError) {
                console.warn(`⚠️ proposals(${id}) failed:`, getError.message);
                return null;
              }
            }


            // Check if this proposal belongs to the current user
            if (proposal.proposer && proposal.proposer.toLowerCase() === address.toLowerCase()) {
              // console.log(`✅ Proposal ${id} belongs to user`);

              // Handle BigInt values properly
              const safeFormatEther = (value) => {
                try {
                  return value ? ethers.formatEther(value.toString()) : '0';
                } catch (error) {
                  console.warn('Error formatting ether value:', error);
                  return '0';
                }
              };

              const safeBigIntToString = (value) => {
                try {
                  return value ? value.toString() : '0';
                } catch (error) {
                  console.warn('Error converting BigInt:', error);
                  return '0';
                }
              };

              const currentTime = Math.floor(Date.now() / 1000);
              const timeRemaining = proposal.endTime ? Math.max(0, Number(proposal.endTime) - currentTime) : 0;

              // Calculate funding progress
              const fundingGoalNum = proposal.fundingGoal ? Number(ethers.formatEther(proposal.fundingGoal)) : 0;
              const totalInvestedNum = proposal.totalInvested ? Number(ethers.formatEther(proposal.totalInvested)) : 0;
              const fundingPercent = fundingGoalNum > 0 ? Math.min((totalInvestedNum / fundingGoalNum) * 100, 100) : 0;

              return {
                id: id.toString(),
                description: proposal.description || 'No description',
                projectName: proposal.projectName || 'Unnamed Project',
                projectUrl: proposal.projectUrl || '',
                fundingGoal: safeFormatEther(proposal.fundingGoal),
                proposer: proposal.proposer,
                // Use correct field names from contract
                voteCountFor: safeBigIntToString(proposal.votersFor), // Number of voters
                voteCountAgainst: safeBigIntToString(proposal.votersAgainst), // Number of voters
                totalVotesFor: safeFormatEther(proposal.totalVotesFor), // Vote weight
                totalVotesAgainst: safeFormatEther(proposal.totalVotesAgainst), // Vote weight
                deadline: proposal.endTime ? new Date(Number(proposal.endTime) * 1000).toLocaleString() : 'No deadline',
                endTime: proposal.endTime ? Number(proposal.endTime) : 0,
                timeRemaining,
                executed: Boolean(proposal.executed),
                passed: Boolean(proposal.passed),
                totalInvested: safeFormatEther(proposal.totalInvested),
                proposalDeposit: safeFormatEther(proposal.proposalDeposit),
                fundingPercent: fundingPercent.toFixed(1),
                fundingMet: proposal.totalInvested && proposal.fundingGoal ?
                  proposal.totalInvested >= proposal.fundingGoal : false,
                // Status calculation
                status: proposal.executed ?
                  (proposal.passed ? 'PASSED' : 'FAILED') :
                  (timeRemaining > 0 ? 'VOTING_ACTIVE' : 'PENDING_EXECUTION')
              };
            } else {
              // console.log(`❌ Proposal ${id} does not belong to user (${proposal.proposer} !== ${address})`);
              return null;
            }
          } catch (error) {
            console.error(`❌ Error fetching proposal ${id}:`, error.message);
            return null;
          }
        })
      );

      const filteredDetails = details.filter((detail) => detail !== null);
      // console.log(`✅ Successfully fetched ${filteredDetails.length} user proposals`);

      setProposalDetails(filteredDetails);

      setConsoleLogs((prev) => [
        ...prev,
        {
          timestamp: Math.floor(Date.now() / 1000),
          function: 'getProposalDetails',
          status: 'Success',
          result: `Found ${filteredDetails.length} proposals`,
        },
      ]);
    } catch (error) {

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

  // Removed redundant useEffect - initializeContract is called directly in handleNetworkChange

  const viewDetails = (proposalId) => {
    localStorage.setItem('proposalId', proposalId)
    window.location.href = "/proposal-details"
  };

  // Manual refresh function
  const refreshProposals = async () => {
    if (daoContract && walletAddress) {
      setLoading(true);
      try {
        await getProposalDetails(daoContract, walletAddress);
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setLoading(false);
      }
    } else {

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
                <h4 className="mt-4">Dashboard</h4>


                {/* Network Status & Controls */}
                <div className="row mb-4">
                  <div className="col-12">
                    {currentNetwork ? (
                      <div className="alert alert-info d-flex justify-content-between align-items-center">
                        <div>
                          <i className="fas fa-list me-2"></i>My Proposals
                          {walletAddress && (
                            <small className="d-block text-muted mt-1">
                              <i className="fas fa-wallet me-1"></i>
                              {walletAddress.substring(0, 10)}...{walletAddress.slice(-8)}
                            </small>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {isTestnet(currentNetwork.chainId) && (
                            <span className="badge bg-warning">Testnet</span>
                          )}
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={refreshProposals}
                            disabled={loading}
                            title="Refresh proposals"
                          >
                            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} me-1`}></i>
                            Refresh
                          </button>
                        </div>
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
                          <div className="card-body">
                            <div>Total Proposal: {proposalDetails.length || 0}</div>
                            <small className="opacity-75">
                              &nbsp;
                              {/* Weight: {proposalDetails.reduce((acc, p) => acc + Number(p.totalVotesFor || 0), 0).toFixed(2)} GNJ */}
                            </small>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-warning text-white mb-4">
                          <div className="card-body">
                            <div>Executed: {proposalDetails.filter((p) => p.executed).length}</div>
                            <small className="opacity-75">
                              &nbsp;

                              {/* Weight: {proposalDetails.reduce((acc, p) => acc + Number(p.totalVotesFor || 0), 0).toFixed(2)} GNJ */}
                            </small>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-success text-white mb-4">
                          <div className="card-body">
                            <div>Voters For: {proposalDetails.reduce((acc, p) => acc + Number(p.voteCountFor || 0), 0)}</div>
                            <small className="opacity-75">
                              Weight: {proposalDetails.reduce((acc, p) => acc + Number(p.totalVotesFor || 0), 0).toFixed(2)} GNJ
                            </small>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-3 col-md-6">
                        <div className="card bg-danger text-white mb-4">
                          <div className="card-body">
                            <div>Voters Against: {proposalDetails.reduce((acc, p) => acc + Number(p.voteCountAgainst || 0), 0)}</div>
                            <small className="opacity-75">
                              Weight: {proposalDetails.reduce((acc, p) => acc + Number(p.totalVotesAgainst || 0), 0).toFixed(2)} GNJ
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proposal List */}
                    <div className="mt-5">
                      <div className="row">
                        {proposalDetails.length === 0 ? (
                          <div className="text-center py-5">
                            <div className="mb-4">
                              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                              <h5 className="text-muted">No Proposals Found</h5>
                              <p className="text-muted">
                                You haven't created any proposals yet or they couldn't be loaded.
                              </p>
                              <div className="mt-3">
                                <button
                                  className="btn btn-primary me-2"
                                  onClick={() => window.location.href = '/create-proposal'}
                                >
                                  <i className="fas fa-plus me-1"></i>
                                  Create Your First Proposal
                                </button>
                                <button
                                  className="btn btn-outline-secondary"
                                  onClick={refreshProposals}
                                  disabled={loading}
                                >
                                  <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} me-1`}></i>
                                  Try Again
                                </button>
                              </div>
                            </div>
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
                                          className={`badge ${p.status === 'PASSED' ? 'bg-success' :
                                            p.status === 'FAILED' ? 'bg-danger' :
                                              p.status === 'VOTING_ACTIVE' ? 'bg-primary' :
                                                'bg-warning'
                                            } bg-opacity-90`}
                                        >
                                          <i
                                            className={`fas ${p.status === 'PASSED' ? 'fa-check-circle' :
                                              p.status === 'FAILED' ? 'fa-times-circle' :
                                                p.status === 'VOTING_ACTIVE' ? 'fa-vote-yea' :
                                                  'fa-clock'
                                              } me-1`}
                                          ></i>
                                          {p.status === 'PASSED' ? 'Passed' :
                                            p.status === 'FAILED' ? 'Failed' :
                                              p.status === 'VOTING_ACTIVE' ? 'Voting' :
                                                'Pending'}
                                        </span>
                                        {p.fundingMet && (
                                          <span className="badge bg-success bg-opacity-90 ms-2">
                                            <i className="fas fa-target me-1"></i>Funded
                                          </span>
                                        )}
                                        {p.timeRemaining > 0 && (
                                          <span className="badge bg-info bg-opacity-90 ms-2">
                                            <i className="fas fa-hourglass-half me-1"></i>
                                            {Math.floor(p.timeRemaining / 86400)}d {Math.floor((p.timeRemaining % 86400) / 3600)}h
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
                                        <div className="small text-muted">
                                          Voters For
                                          {p.totalVotesFor && (
                                            <div className="text-xs text-muted">
                                              {parseFloat(p.totalVotesFor).toFixed(2)} GNJ
                                            </div>
                                          )}
                                        </div>
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
                                        <div className="small text-muted">
                                          Voters Against
                                          {p.totalVotesAgainst && (
                                            <div className="text-xs text-muted">
                                              {parseFloat(p.totalVotesAgainst).toFixed(2)} GNJ
                                            </div>
                                          )}
                                        </div>
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
                                        {p.fundingPercent}%
                                      </span>
                                    </div>
                                    <div className="progress mb-2" style={{ height: '12px', borderRadius: '10px' }}>
                                      <div
                                        className="funding-progress-bar"
                                        role="progressbar"
                                        style={{
                                          width: `${p.fundingPercent}%`,
                                        }}
                                        aria-valuenow={p.fundingPercent}
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