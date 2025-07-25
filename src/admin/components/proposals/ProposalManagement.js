/**
 * Proposal Management Component
 * Manage DAO proposals and voting - Admin interface similar to investor dashboard
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectAuth } from '../../store/slices/authSlice';
import { daoABI } from '../../../Auth/Abi';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getContractAddress, NETWORKS } from '../../../utils/networks';

const ProposalManagement = () => {
  const auth = useSelector(selectAuth);
  const [proposalDetails, setProposalDetails] = useState([]);
  const [daoContract, setDaoContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState("");
  
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
        const network = await provider.getNetwork();
        const chainId = '0x' + network.chainId.toString(16);
        
        const networkConfig = Object.values(NETWORKS).find(n => n.chainId === chainId);
        if (networkConfig) {
          setCurrentNetwork(networkConfig);
          const address = getContractAddress(chainId);
          setContractAddress(address);
          await initializeContract(address);
        }
      } catch (error) {
        toast.info("Please connect your wallet and select a network");
      }
    }
  };

  const switchNetwork = async (network) => {
    if (typeof window.ethereum === 'undefined') {
      toast.error("Please install MetaMask!");
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }],
      });
      
      setCurrentNetwork(network);
      const address = getContractAddress(network.chainId);
      setContractAddress(address);
      await initializeContract(address);
      
      toast.success(`Switched to ${network.chainName}`);
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: network.chainId,
              chainName: network.chainName,
              nativeCurrency: network.nativeCurrency,
              rpcUrls: network.rpcUrls,
              blockExplorerUrls: network.blockExplorerUrls,
            }],
          });
          setCurrentNetwork(network);
          const address = getContractAddress(network.chainId);
          setContractAddress(address);
          await initializeContract(address);
        } catch (addError) {
          toast.error("Failed to add network");
        }
      } else {
        toast.error("Failed to switch network");
      }
    }
  };

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

      const ids = await contract.getAllProposalIds();
      await getProposalDetails(ids, contract);
      
      toast.success(`✅ Connected to DAO contract on ${currentNetwork?.chainName}`);
    } catch (error) {
      console.error("Init error:", error.message);
      toast.error(`❌ Failed to initialize contract: ${error.message}`);
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
        
        const endTimeStr = proposal.endTime ? proposal.endTime.toString() : '0';
        const fundingGoalStr = proposal.fundingGoal ? proposal.fundingGoal.toString() : '0';
        const totalInvestedStr = proposal.totalInvested ? proposal.totalInvested.toString() : '0';
        const votersForStr = proposal.votersFor ? proposal.votersFor.toString() : '0';
        const totalVotesForStr = proposal.totalVotesFor ? proposal.totalVotesFor.toString() : '0';
        const totalVotesAgainstStr = proposal.totalVotesAgainst ? proposal.totalVotesAgainst.toString() : '0';
        const votersAgainst = proposal.votersAgainst ? proposal.votersAgainst.toString() : '0';
        
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
          executed: Boolean(proposal.executed),
          passed: Boolean(proposal.passed)
        };
      }));
      setProposalDetails(details);
    } catch (error) {
      console.error("Error fetching proposal details:", error);
      setProposalDetails([]);
    }
  };

  const executeProposal = async (proposalId) => {
    if (!daoContract) {
      toast.error("Contract not initialized");
      return;
    }

    try {
      setLoading(true);
      toast.info("Executing proposal...");
      
      const tx = await daoContract.executeProposal(proposalId);
      await tx.wait();
      
      toast.success('Proposal executed successfully!');
      
      // Refresh proposal details
      const ids = await daoContract.getAllProposalIds();
      await getProposalDetails(ids, daoContract);
      
    } catch (error) {
      console.error('Error executing proposal:', error);
      if (error.message.includes("user rejected")) {
        toast.error('Transaction rejected by user.');
      } else if (error.message.includes("Proposal already executed")) {
        toast.error('Proposal has already been executed.');
      } else if (error.message.includes("Voting period not ended")) {
        toast.error('Voting period has not ended yet.');
      } else {
        toast.error('Failed to execute proposal. Check console for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort proposals (same logic as investor dashboard)
  const getFilteredProposals = () => {
    let filtered = [...proposalDetails];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => {
        switch (filterStatus) {
          case 'active':
            return !p.executed;
          case 'executed':
            return p.executed;
          case 'funded':
            const totalInvested = parseFloat(p.totalInvested || '0');
            const fundingGoal = parseFloat(p.fundingGoal || '0');
            return totalInvested >= fundingGoal;
          default:
            return true;
        }
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(p => 
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        default:
          return 0;
      }
    });

    return filtered;
  };

  const isNetworkSupported = () => {
    return currentNetwork && contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';
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
          <h2>Please log in to access Proposal Management</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '0.5rem'
        }}>
          Admin Proposal Management
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
          Manage DAO proposals, execute decisions, and monitor voting activity
        </p>
      </div>

      {/* Network Selection */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="admin-card admin-network-card" style={{
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h3 style={{ marginBottom: '1rem', color: 'white' }}>
            <i className="fas fa-network-wired" style={{ marginRight: '0.5rem' }}></i>
            Network Selection
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {availableNetworks.map(network => (
              <button
                key={network.chainId}
                onClick={() => switchNetwork(network)}
                style={{
                  padding: '1rem',
                  backgroundColor: currentNetwork?.chainId === network.chainId ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  border: currentNetwork?.chainId === network.chainId ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                disabled={loading}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                  {network.icon}
                </div>
                <div style={{ fontWeight: '600' }}>{network.chainName}</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                  {network.nativeCurrency.symbol}
                </div>
              </button>
            ))}
          </div>
          {currentNetwork && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '8px'
            }}>
              <div style={{ color: 'white', fontSize: '0.875rem' }}>
                Connected to: <strong>{currentNetwork.chainName}</strong>
              </div>
              <div style={{ color: 'white', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Contract: {contractAddress ? `${contractAddress.substring(0, 8)}...${contractAddress.slice(-6)}` : 'Not deployed'}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Loading proposals from blockchain...</p>
        </div>
      ) : isNetworkSupported() ? (
        <>
          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div className="admin-card" style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '0.5rem' }}>Total Proposals</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{proposalDetails.length}</div>
            </div>
            <div className="admin-card" style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Executed</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {proposalDetails.filter(p => p.executed).length}
              </div>
            </div>
            <div className="admin-card" style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>Pending Execution</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {proposalDetails.filter(p => !p.executed && parseFloat(p.totalInvested) >= parseFloat(p.fundingGoal)).length}
              </div>
            </div>
            <div className="admin-card" style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem' }}>Total Votes</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {proposalDetails.reduce((acc, p) => acc + parseInt(p.voteCountFor || '0'), 0)}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="admin-card" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              alignItems: 'end'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Search Proposals
                </label>
                <input
                  type="text"
                  placeholder="Search by description or proposer..."
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
                  Filter by Status
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
                  <option value="all">All Proposals</option>
                  <option value="active">Active</option>
                  <option value="executed">Executed</option>
                  <option value="funded">Fully Funded</option>
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
                </select>
              </div>
            </div>
          </div>

          {/* Proposals List */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem'
          }}>
            {getFilteredProposals().length === 0 ? (
              <div className="admin-card" style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '3rem',
                textAlign: 'center',
                gridColumn: '1 / -1'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <h3>No proposals found</h3>
                <p style={{ color: '#6b7280' }}>
                  {searchQuery ? 'Try adjusting your search terms' : 'No proposals available on this network'}
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
                        backgroundColor: proposal.executed ? '#10b981' : '#f59e0b',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {proposal.executed ? 'Executed' : 'Active'}
                      </span>
                    </div>
                    <h3 style={{ margin: 0, color: '#1f2937' }}>
                      {proposal.description.length > 80 ? 
                        proposal.description.slice(0, 80) + '...' : 
                        proposal.description
                      }
                    </h3>
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

                  {/* Deadline */}
                  <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '0.25rem' }}>Deadline</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e' }}>
                      {proposal.deadline}
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                    <button
                      onClick={() => executeProposal(proposal.id)}
                      disabled={proposal.executed || loading}
                      className="admin-execute-btn"
                      style={{
                        width: '100%',
                        color: 'white',
                        cursor: proposal.executed || loading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {loading ? 'Processing...' : 
                       proposal.executed ? 'Already Executed' : 
                       'Execute Proposal'}
                    </button>
                    {!proposal.executed && parseFloat(proposal.totalInvested) >= parseFloat(proposal.fundingGoal) && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#dcfce7',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#166534',
                        textAlign: 'center'
                      }}>
                        ✅ Ready for execution - Funding goal met
                      </div>
                    )}
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
    </div>
  );
};

export default ProposalManagement;