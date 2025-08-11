/**
 * Executed Proposals Component
 * Display and manage executed DAO proposals - Admin interface for completed proposals
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectAuth } from '../../store/slices/authSlice';
import AdminPageLayout from '../common/AdminPageLayout';
import PageHeader from '../common/PageHeader';
import { daoABI } from '../../../Auth/Abi';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getContractAddress, getRpcUrl, NETWORKS } from '../../../utils/networks';
import axios from 'axios';

const Executed = () => {
  const auth = useSelector(selectAuth);
  const [proposalDetails, setProposalDetails] = useState([]);
  const [daoContract, setDaoContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [isNetworkSupported, setIsCurrentNetwork] = useState(true);


  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSort, setFilterSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Network switching states
  const [availableNetworks] = useState([
    NETWORKS.BSC_MAINNET,
    NETWORKS.BSC_TESTNET,
    NETWORKS.ETH_MAINNET,
    NETWORKS.ETH_SEPOLIA
  ]);

  // Custom styles
  useEffect(() => {
    const customStyles = `
      .admin-proposal-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
      }
      
      .admin-progress-bar {
        transition: width 0.8s ease;
        background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
      }
      
      .admin-btn:hover {
        transform: translateY(-1px);
      }
      
      .admin-card {
        transition: all 0.3s ease;
        border: 1px solid #e5e7eb;
      }
      
      .admin-network-card {
        background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
        border: none;
        color: white;
      }
      
      .admin-execute-btn {
        background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
        border: none;
        border-radius: 25px;
        padding: 12px 30px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: all 0.3s ease;
      }
      
      .admin-execute-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(220, 38, 38, 0.3);
      }

      .admin-execute-btn:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = customStyles;
    styleSheet.id = "admin-proposal-styles";

    const existingStyles = document.getElementById("admin-proposal-styles");
    if (!existingStyles) {
      document.head.appendChild(styleSheet);
    }

    return () => {
      const styleElement = document.getElementById("admin-proposal-styles");
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  // Initialize on component mount
  useEffect(() => {
    if (auth.isAuthenticated) {
      checkWalletConnection();
    }
  }, [auth.isAuthenticated]);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);


        console.log('provider', provider);

      } catch (error) {
        toast.info("Please connect your wallet and select a network");
      }
    }
  };




  const initializeContract = async (network) => {

    const contractAddr = getContractAddress(network.chainId);
    setContractAddress(contractAddr);

    console.log('Current Network', network)
    console.log('Contract Address', contractAddr);
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
      // const provider = new ethers.BrowserProvider(window.ethereum);
      // await provider.send("eth_requestAccounts", []);
      // const signer = await provider.getSigner();

      const rpcUrl = getRpcUrl(network.chainId);
      console.log('RPC Url', rpcUrl);



      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const contract = new ethers.Contract(contractAddr, daoABI, provider);
      setDaoContract(contract);

      const ids = await contract.getAllProposalIds();
      await getProposalDetails(ids, contract);

      // toast.success(`✅ Connected to DAO contract on ${currentNetwork?.chainName}`);
    } catch (error) {
      console.error("Init error:", error.message);
      //  toast.error(`❌ Failed to initialize contract: ${error.message}`);
      setDaoContract(null);
      setProposalDetails([]);
    } finally {
      setLoading(false);
    }
  };

  const getProposalDetails = async (ids, contract) => {
    try {
      const details = await Promise.all(ids.map(async (id) => {
        const proposal = await contract.proposals(id);

        // Only process executed proposals
        if (!Boolean(proposal.executed)) {
          return null;
        }

        const endTimeStr = proposal.endTime ? proposal.endTime.toString() : '0';
        const fundingGoalStr = proposal.fundingGoal ? proposal.fundingGoal.toString() : '0';
        const totalInvestedStr = proposal.totalInvested ? proposal.totalInvested.toString() : '0';
        const votersForStr = proposal.votersFor ? proposal.votersFor.toString() : '0';
        const totalVotesForStr = proposal.totalVotesFor ? proposal.totalVotesFor.toString() : '0';
        const totalVotesAgainstStr = proposal.totalVotesAgainst ? proposal.totalVotesAgainst.toString() : '0';
        const votersAgainst = proposal.votersAgainst ? proposal.votersAgainst.toString() : '0';
        const executionTimeStr = proposal.executionTime ? proposal.executionTime.toString() : '0';

        return {
          id: id.toString(),
          description: proposal.description || "",
          projectName: proposal.projectName || "",
          fundingGoal: ethers.formatUnits(fundingGoalStr, 18),
          proposer: proposal.proposer || "",
          voteCountFor: votersForStr,
          votersAgainst: votersAgainst,
          totalVotesFor: totalVotesForStr,
          totalInvested: ethers.formatUnits(totalInvestedStr, 18),
          totalVotesAgainst: totalVotesAgainstStr,
          deadline: parseInt(endTimeStr) > 0 ? new Date(parseInt(endTimeStr) * 1000).toLocaleString() : "No deadline",
          executed: Boolean(proposal.executed),
          passed: Boolean(proposal.passed),
          rejected: Boolean(proposal.rejected),
          executionTime: parseInt(executionTimeStr) > 0 ? new Date(parseInt(executionTimeStr) * 1000).toLocaleString() : "Unknown"
        };
      }));
      
      // Filter out null values (non-executed proposals)
      const executedProposals = details.filter(proposal => proposal !== null);
      setProposalDetails(executedProposals);
    } catch (error) {
      console.error("Error fetching proposal details:", error);
      setProposalDetails([]);
    }
  };



  // Filter and sort executed proposals
  const getFilteredProposals = () => {
    let filtered = [...proposalDetails]; // All proposals here are already executed

    // Filter by execution result
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => {
        switch (filterStatus) {
          case 'passed':
            return p.passed;
          case 'rejected':
            return p.rejected;
          case 'successful':
            const totalInvested = parseFloat(p.totalInvested || '0');
            const fundingGoal = parseFloat(p.fundingGoal || '0');
            return totalInvested >= fundingGoal && p.passed;
          default:
            return true;
        }
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(p =>
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.proposer || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

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



  if (!auth.isAuthenticated) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <h2>Please log in to access Executed Proposals</h2>
        </div>
      </div>
    );
  }


  const handleExecuteProposal = async (proposalId) => {
    localStorage.setItem('selectedProposalId', proposalId);
    window.location.href = "proposal-details";
  };

  // Dummy handlers for UI components
  const handleNetworkChange = async (network) => {
    const contractAddress = getContractAddress(network.chainId);
    setContractAddress(contractAddress);


    if (!window.ethereum) {
      console.error("Please install MetaMask or another Web3 wallet!");
      return;
    }
    // Connect to wallet
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    await browserProvider.send("eth_requestAccounts", []); // Request wallet connection
    const signer = await browserProvider.getSigner();
    setUserAddress(signer.address);
    console.log('User Address:', signer.address);
    initializeContract(network);

    // fetchedProposal(network)

  };


  return (
    <AdminPageLayout
      onNetworkChange={handleNetworkChange}
    >
      {({ isMobile }) => (
        <>




          {loading ? (
            <div style={{ textAlign: 'center', padding: isMobile ? '2rem' : '3rem' }}>
              <div style={{
                width: isMobile ? '3rem' : '4rem',
                height: isMobile ? '3rem' : '4rem',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                margin: '0 auto 1rem',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>Loading proposals from blockchain...</p>
            </div>
          ) : isNetworkSupported ? (
            <>
              {/* Page Header */}
              <div style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '16px',
                color: 'white',
                textAlign: 'center'
              }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '700' }}>
                  ✅ Executed Proposals Dashboard
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', opacity: '0.9', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                  View and manage all executed DAO proposals with detailed execution results
                </p>
              </div>

              {/* Executed Proposals Summary Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: isMobile ? '1rem' : '1.5rem',
                marginBottom: '2rem'
              }}>
                <div className="admin-card" style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Total Executed</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{proposalDetails.length}</div>
                </div>
                <div className="admin-card" style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ color: '#059669', marginBottom: '0.5rem' }}>Passed</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    {proposalDetails.filter(p => p.passed).length}
                  </div>
                </div>
                <div className="admin-card" style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Rejected</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    {proposalDetails.filter(p => p.rejected).length}
                  </div>
                </div>
                <div className="admin-card" style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem' }}>Total Funding</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    {proposalDetails.reduce((acc, p) => acc + parseFloat(p.totalInvested || '0'), 0).toFixed(1)} GNJ
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="admin-card" style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: isMobile ? '1rem' : '1.5rem',
                marginBottom: '2rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: isMobile ? '1rem' : '1.5rem',
                  alignItems: 'end'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Search Executed Proposals
                    </label>
                    <input
                      type="text"
                      placeholder="Search by project name, description or proposer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Filter by Result
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="all">All Executed</option>
                      <option value="passed">Passed</option>
                      <option value="rejected">Rejected</option>
                      <option value="successful">Successful (Funded + Passed)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Sort by
                    </label>
                    <select
                      value={filterSort}
                      onChange={(e) => setFilterSort(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="mostFunded">Most Funded</option>
                      <option value="mostVotes">Most Votes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Proposals List */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: isMobile ? '1rem' : '1.5rem'
              }}>
                {getFilteredProposals().length === 0 ? (
                  <div className="admin-card" style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '3rem',
                    textAlign: 'center',
                    gridColumn: '1 / -1'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <h3>No executed proposals found</h3>
                    <p style={{ color: '#6b7280' }}>
                      {searchQuery ? 'Try adjusting your search terms or filters' : 'No executed proposals available on this network yet'}
                    </p>
                  </div>
                ) : (
                  getFilteredProposals().map(proposal => (
                    <div key={proposal.id} className="admin-card admin-proposal-card" style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {/* Proposal Header */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            #{proposal.id}
                          </span>
                          <span style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            ✅ Executed
                          </span>
                        </div>
                        {proposal.projectName && (
                          <h3 style={{ margin: 0, color: '#1f2937', marginBottom: '0.5rem' }}>
                            {proposal.projectName.length > 60 ?
                              proposal.projectName.slice(0, 60) + '...' :
                              proposal.projectName
                            }
                          </h3>
                        )}
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.4' }}>
                          {proposal.description.length > 120 ?
                            proposal.description.slice(0, 120) + '...' :
                            proposal.description
                          }
                        </p>
                      </div>

                      {/* Proposer */}
                      <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Proposer</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: '600' }}>
                          {proposal.proposer.substring(0, 10)}...{proposal.proposer.slice(-8)}
                        </div>
                      </div>

                      {/* Voting Stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: '8px' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                            {proposal.voteCountFor}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#059669' }}>Votes For</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                            {proposal.votersAgainst}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>Votes Against</div>
                        </div>
                      </div>

                      {/* Funding Progress */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Funding Progress</span>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {(() => {
                              const invested = parseFloat(proposal.totalInvested || '0');
                              const goal = parseFloat(proposal.fundingGoal || '0');
                              return goal > 0 ? ((invested / goal) * 100).toFixed(1) : '0';
                            })()}%
                          </span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div
                            className="admin-progress-bar"
                            style={{
                              height: '100%',
                              width: `${(() => {
                                const invested = parseFloat(proposal.totalInvested || '0');
                                const goal = parseFloat(proposal.fundingGoal || '0');
                                return goal > 0 ? Math.min((invested / goal) * 100, 100) : 0;
                              })()}%`
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                          <span>Raised: <strong>{parseFloat(proposal.totalInvested || '0').toFixed(2)} GNJ</strong></span>
                          <span>Goal: <strong>{parseFloat(proposal.fundingGoal || '0').toFixed(2)} GNJ</strong></span>
                        </div>
                      </div>

                      {/* Execution Details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '0.25rem' }}>Original Deadline</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e' }}>
                            {proposal.deadline}
                          </div>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.25rem' }}>Executed On</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0369a1' }}>
                            {proposal.executionTime}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                        <span><strong>Proposal Status:</strong></span>
                        <span>

                          {proposal.rejected ?
                            <span style={{ backgroundColor: '#f50b0bff', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
                              {'Rejected'}
                            </span>
                            :
                            proposal.passed ?
                              <span style={{ backgroundColor: '#10b981ff', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
                                {'Passed'}
                              </span>
                              :
                              <span style={{
                                backgroundColor: '#fd9c1dff',
                                color: 'white',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                {'Pending'}
                              </span>
                          }


                        </span>
                      </div>

                      {/* Admin Actions */}
                      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                        <button
                          onClick={() => handleExecuteProposal(proposal.id)}
                          style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '0.8rem 1rem',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}>
                          <span>View Details</span>
                          <span style={{ fontSize: '0.8rem' }}>→</span>
                        </button>
                        
                        {/* Execution Result Banner */}
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: proposal.passed ? '#dcfce7' : '#fef2f2',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: proposal.passed ? '#166534' : '#dc2626',
                          textAlign: 'center',
                          border: `2px solid ${proposal.passed ? '#22c55e' : '#ef4444'}`
                        }}>
                          {proposal.passed ? 
                            '🎉 Proposal Successfully Executed & Passed' : 
                            '❌ Proposal Executed but Rejected'
                          }
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="admin-card" style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌐</div>
              <h3>Select a Network</h3>
              <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                Please connect your wallet and select a network to view proposals
              </p>
            </div>
          )}

          {/* Spinner Animation */}
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </>
      )
      }
    </AdminPageLayout >
  );
};

export default Executed;