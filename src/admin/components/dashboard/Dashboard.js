/**
 * Admin Dashboard Component - UI Only
 * Static dashboard with sample data for UI display
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { selectUser, selectIsAuthenticated } from '../../store/slices/authSlice';
import AdminHeader from '../common/AdminHeader';
import AdminSidebar from '../common/AdminSidebar';
import AdminFooter from '../common/AdminFooter';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ethers } from 'ethers';
import { getContractAddress, isTestnet, getRpcUrl } from '../../../utils/networks';
import { daoABI } from '../../../Auth/Abi';
import { tokenABI } from '../../../utils/Tokenabi';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  // Layout state only
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const governanceTokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;
  const [userAddress, setUserAddress] = useState("");
  const [contractAddress, setContractAddress] = useState("")
  const [currentNetwork, setCurrentNetwork] = useState("")
  const [daoStatics, setDaoStatistics] = useState([])
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenDecimals, setTokenDecimals] = useState(0);
  const [totalFunded, setTotalFunded] = useState(0);
  const [allowingFundings, setAllowingFundings] = useState(0);
  const [depositLocked, setDepositLocked] = useState(0);
  const [contractBalance, setContractBalance] = useState(0);
  const [proposalDetails, setProposalDetails] = useState([]);

  // Filter states for proposals
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');



  const stats = {
    totalProposals: '25',
    approvedProposals: '18',
    runningProposals: '7',
    totalFunded: '15,427.85',
    activeInvestors: '143'
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: '📊',
      description: 'Overview & Analytics'
    },
    {
      name: 'Proposers',
      path: '/admin/proposers',
      icon: '👨‍💼',
      description: 'Manage Proposers'
    },
    {
      name: 'Investors',
      path: '/admin/investors',
      icon: '👥',
      description: 'Manage Investors'
    },
    {
      name: 'Executed',
      path: '/admin/executed',
      icon: '✅',
      description: 'Executed Proposals'
    }
  ];

  // Handle mobile state change from sidebar
  const handleMobileChange = (mobile) => {
    setIsMobile(mobile);
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
    initializeContract(network);

    // fetchedProposal(network)

  };

  const handleMetaMaskConnected = () => {
    console.log(`MetaMask connected  `);
  };

  // Get current page info
  const currentPath = location.pathname;
  const currentPage = navigationItems.find(item => currentPath.startsWith(item.path));

  // Authentication check
  if (!isAuthenticated) {
    return null;
  }


  const initializeContract = async (network) => {
    try {
      setCurrentNetwork(network);

      const rpcUrl = getRpcUrl(network.chainId);
      const contractAddress = getContractAddress(network.chainId);
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const daoContract = new ethers.Contract(contractAddress, daoABI, provider);
      const tokenContractInstance = new ethers.Contract(governanceTokenAddress, tokenABI, provider);

      const symbol = await tokenContractInstance.symbol();
      setTokenSymbol(symbol);

      const decimals = await tokenContractInstance.decimals();
      setTokenDecimals(decimals);

      const daoStatics = await daoContract.getDAOStats();
      setDaoStatistics(daoStatics);

      if (daoStatics?.totalFunded) {
        setTotalFunded(ethers.formatUnits(daoStatics.totalFunded, decimals));
      }

      if (daoStatics?.allowedFunding) {
        setAllowingFundings(ethers.formatUnits(daoStatics.allowedFunding, decimals));
      }

      if (daoStatics?.totalDepositsLocked) {
        setDepositLocked(ethers.formatUnits(daoStatics.totalDepositsLocked, decimals));
      }

      if (daoStatics?.contractBalance) {
        setContractBalance(ethers.formatUnits(daoStatics.contractBalance, decimals));
      }

      // Fetch all proposal IDs
      const ids = await daoContract.getAllProposalIds();
      await getProposalDetails(ids, daoContract);

      console.log('DAO Status:', daoStatics);

    } catch (error) {
      setDaoStatistics([]);
      console.error('Error initializing contract:', error);
    }
  };

  const getProposalDetails = async (ids, contract) => {
    try {
      const details = await Promise.all(ids.map(async (id) => {
        const proposal = await contract.proposals(id);

        const proposaldata = await proposal
        console.log('Proposal Data', proposaldata);

        // Safely convert BigInt values to strings first, then to numbers where needed
        const projectName = proposaldata.projectName ? proposaldata.projectName.toString() : "";
        const endTimeStr = proposal.endTime ? proposal.endTime.toString() : '0';
        const fundingGoalStr = proposal.fundingGoal ? proposal.fundingGoal.toString() : '0';
        const totalInvestedStr = proposal.totalInvested ? proposal.totalInvested.toString() : '0';
        const votersForStr = proposal.votersFor ? proposal.votersFor.toString() : '0';
        const totalVotesForStr = proposal.totalVotesFor ? proposal.totalVotesFor.toString() : '0';
        const totalVotesAgainstStr = proposal.totalVotesAgainst ? proposal.totalVotesAgainst.toString() : '0';
        const votersAgainst = proposaldata.votersAgainst ? proposal.votersAgainst.toString() : '0';

        return {
          id: id.toString(),
          projectName: projectName,
          description: proposal.description || "",
          fundingGoal: ethers.formatUnits(fundingGoalStr, 18),
          proposer: proposal.proposer || "",
          voteCountFor: votersForStr,
          votersAgainst: votersAgainst,
          totalVotesFor: totalVotesForStr,
          totalInvested: ethers.formatUnits(totalInvestedStr, 18),
          totalVotesAgainst: totalVotesAgainstStr,
          deadline: parseInt(endTimeStr) > 0 ? new Date(parseInt(endTimeStr) * 1000).toLocaleString() : "No deadline",
          executed: Boolean(proposal.executed)
        };
      }));
      setProposalDetails(details);
      // setConsoleLogs(prev => [...prev, {
      //   timestamp: new Date().toLocaleString(),
      //   function: "getProposalDetails",
      //   status: "Success",
      //   result: details
      // }]);
    } catch (error) {

      setProposalDetails([]);
    }
  };

  // Filter and sort proposals
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
        (p.proposer || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.projectName || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by newest first
    filtered.sort((a, b) => {
      return parseInt(b.id || '0') - parseInt(a.id || '0');
    });

    return filtered;
  };

  const filteredProposals = getFilteredProposals();

  const handleExecuteProposal = async (proposalId) => {
    localStorage.setItem('selectedProposalId', proposalId);
    window.location.href = "proposal-details";
  };


  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Admin Sidebar */}
      <AdminSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onMobileChange={handleMobileChange}
      />

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: isMobile ? '0' : (sidebarOpen ? '280px' : '80px'),
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        {/* Admin Header */}
        <AdminHeader
          currentPage={currentPage}
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}

          handleMetaMaskConnected={handleMetaMaskConnected}
          onNetworkChange={handleNetworkChange}
        />

        {/* Page Content */}
        <div style={{
          flex: 1,
          padding: isMobile ? '1rem' : '2rem',
          overflow: 'auto'
        }}>
          {/* Network Status Banner */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: isMobile ? '0.875rem' : '1rem',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🟢</span>
              <span style={{
                color: '#0369a1',
                fontSize: isMobile ? '0.85rem' : '0.875rem',
                fontWeight: '500'
              }}>
                Connected to {currentNetwork.chainName} • Contract: {contractAddress?.slice(0, 6)}...{contractAddress?.slice(-4)}
              </span>
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.8rem' : '0.875rem',
                fontWeight: '500'
              }}
            >
              Refresh
            </button>
          </div>

          {/* Welcome Section */}
          <div style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
            <h2 style={{
              fontSize: isMobile ? '1.5rem' : '1.875rem',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '0.5rem',
              lineHeight: isMobile ? '1.4' : '1.2'
            }}>
              Dashboard 🚀
            </h2>
          </div>


          {/* Live DAO Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem',
            marginBottom: isMobile ? '1.5rem' : '2rem'
          }}>
            {/* Total Proposals */}
            <SimpleCard
              title="Innovation Projects"
              value={`${daoStatics.totalProposals || '0'}+`}
              icon="🚀"
              color="#3b82f6"
              isMobile={isMobile}
            />

            {/* Active Proposals */}
            <SimpleCard
              title="Active Proposal"
              value={`${daoStatics.activeProposals || '0'}+`}
              icon="⚡"
              color="#10b981"
              isMobile={isMobile}
            />

            <SimpleCard
              title="Approved Proposal"
              value={`${daoStatics.passedProposals || '0'}+`}
              icon="⚡"
              color="#10b981"
              isMobile={isMobile}
            />


            <SimpleCard
              title="Rejected Proposal"
              value={`${daoStatics.rejectedProposals || '0'}+`}
              icon="⚡"
              color="#10b981"
              isMobile={isMobile}
            />

            {/* Total Community */}
            <SimpleCard
              title="Active Investors"
              value={`${daoStatics.activeInvestorsCount || '0'}+`}
              icon="👥"
              color="#8b5cf6"
              isMobile={isMobile}
            />

            {/* Total Funded */}
            <SimpleCard
              title="Total Funded"
              value={`${totalFunded || '0'}  ${tokenSymbol}`}
              icon="💎"
              color="#f59e0b"
              isMobile={isMobile}
            />

            <SimpleCard
              title="Allowing Funding"
              value={`${allowingFundings || '0'} ${tokenSymbol}`}
              icon="💎"
              color="#f59e0b"
              isMobile={isMobile}
            />

            <SimpleCard
              title="Deposit Locked"
              value={`${depositLocked || '0'} ${tokenSymbol}`}
              icon="💎"
              color="#f59e0b"
              isMobile={isMobile}
            />


            <SimpleCard
              title="Escrow Amount"
              value={`${contractBalance || '0'} ${tokenSymbol}`}
              icon="💎"
              color="#f59e0b"
              isMobile={isMobile}
            />
          </div>

          {/* Recent Proposals Overview */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '24px',
            padding: '0',
            boxShadow: '0 20px 40px rgba(102, 126, 234, 0.15)',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Floating Background Elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(40px)'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '50%',
              filter: 'blur(30px)'
            }}></div>

            {/* Header Section */}
            <div style={{
              padding: isMobile ? '2rem 1.5rem 1rem' : '2.5rem 2rem 1.5rem',
              position: 'relative',
              zIndex: 2
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <h3 style={{
                  fontSize: isMobile ? '1.4rem' : '1.6rem',
                  fontWeight: '700',
                  color: 'white',
                  margin: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{
                    fontSize: '1.8rem',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                  }}>📊</span>
                  Recent Proposals Overview
                </h3>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '0.5rem 1rem',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <span style={{
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                    {filteredProposals.length} {filterStatus === 'all' ? 'Total' : filterStatus === 'active' ? 'Active' : filterStatus === 'executed' ? 'Executed' : 'Funded'}
                  </span>
                </div>
              </div>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                margin: '0',
                fontSize: '1rem'
              }}>
                Monitor and manage DAO proposals in real-time
              </p>
            </div>

            {/* Content Section */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px 20px 0 0',
              padding: isMobile ? '1.5rem' : '2rem',
              minHeight: '300px',
              position: 'relative',
              zIndex: 2
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem'
              }}>
                {filteredProposals.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: '#6b7280',
                    gridColumn: '1 / -1'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                    <h3>No proposals found</h3>
                    <p>
                      {searchQuery
                        ? 'Try adjusting your search terms or filters'
                        : proposalDetails.length === 0
                          ? 'Connect to a network and load blockchain data to view proposals'
                          : 'No proposals match the selected filters'
                      }
                    </p>
                  </div>
                ) : (
                  filteredProposals.map((proposal, index) => (
                    <div key={proposal.id} style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      border: '1px solid rgba(102, 126, 234, 0.1)',
                      transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      animation: `slideInUp 0.6s ease-out ${index * 0.1}s both`
                    }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(102, 126, 234, 0.15)';
                        e.currentTarget.style.borderColor = '#667eea';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.1)';
                      }}>

                      {/* Proposal Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '700',
                          fontSize: '1.1rem',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                        }}>
                          #{proposal.id}
                        </div>
                        <div style={{
                          background: proposal.executed
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : parseFloat(proposal.totalInvested || '0') >= parseFloat(proposal.fundingGoal || '0')
                              ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                              : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          <span style={{ fontSize: '0.8rem' }}>
                            {proposal.executed ? '✅' : parseFloat(proposal.totalInvested || '0') >= parseFloat(proposal.fundingGoal || '0') ? '💰' : '⏳'}
                          </span>
                          {proposal.executed ? 'Executed' : parseFloat(proposal.totalInvested || '0') >= parseFloat(proposal.fundingGoal || '0') ? 'Funded' : 'Active'}
                        </div>
                      </div>

                      {/* Project Title */}
                      <h5 style={{
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        color: '#1f2937',
                        marginBottom: '0.8rem',
                        lineHeight: '1.3',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {proposal.projectName || proposal.description?.slice(0, 60) + '...' || 'Untitled Proposal'}
                      </h5>

                      {/* Description */}
                      <p style={{
                        color: '#6b7280',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        marginBottom: '1.2rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {proposal.description}
                      </p>

                      {/* Funding Information */}
                      <div style={{
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '1rem'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '0.3rem'
                            }}>
                              Goal
                            </div>
                            <div style={{
                              fontSize: '1.1rem',
                              fontWeight: '700',
                              color: '#667eea'
                            }}>
                              {proposal.fundingGoal} GNJ
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '0.3rem'
                            }}>
                              Invested
                            </div>
                            <div style={{
                              fontSize: '1.1rem',
                              fontWeight: '700',
                              color: '#10b981'
                            }}>
                              {proposal.totalInvested} GNJ
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button onClick={() => handleExecuteProposal(proposal.id)} style={{
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
                    </div>
                  ))
                )}
              </div>

              {/* View All Button */}
              {/* <div style={{
                textAlign: 'center',
                marginTop: '2rem',
                paddingTop: '2rem',
                borderTop: '1px solid rgba(102, 126, 234, 0.1)'
              }}>
                <button
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onClick={() => window.location.href = '/admin/proposals'}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  <span>View All {proposalDetails.length} Proposals</span>
                  <span style={{ fontSize: '1.2rem' }}>🚀</span>
                </button>
              </div> */}
            </div>
          </div>

          <style>{`
            @keyframes slideInUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>

          {/* Blockchain Information */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: isMobile ? '1.5rem' : '2rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            marginBottom: isMobile ? '1.5rem' : '2rem'
          }}>
            <h3 style={{
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: isMobile ? '1rem' : '1.5rem',
              lineHeight: '1.3'
            }}>
              ⛓️ Blockchain Information
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              fontSize: '0.875rem'
            }}>
              <InfoItem
                label="Current Network"
                value={`${currentNetwork.icon} ${currentNetwork.chainName}`}
                isMobile={isMobile}
              />
              <InfoItem
                label="Network Type"
                value="🧪 Testnet"
                isMobile={isMobile}
              />
              <InfoItem
                label="Chain ID"
                value={`${currentNetwork.chainId}`}
                isMobile={isMobile}
              />
              <InfoItem
                label="Native Currency"
                value={currentNetwork.nativeCurrency?.symbol}
                isMobile={isMobile}
              />
              <InfoItem
                label="DAO Contract"
                value={`${contractAddress.slice(0, 10)}...${contractAddress.slice(-8)}`}
                isMobile={isMobile}
              />
              <InfoItem
                label="Block Explorer"
                value="🔗 Available"
                isMobile={isMobile}
              />
            </div>
          </div>

          {/* System Information */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: isMobile ? '1.5rem' : '2rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: isMobile ? '1rem' : '1.5rem',
              lineHeight: '1.3'
            }}>
              ℹ️ System Information
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              fontSize: '0.875rem'
            }}>
              <InfoItem label="Platform" value="Ganjes NFT DAO" isMobile={isMobile} />
              <InfoItem label="Admin Version" value="v1.0.0" isMobile={isMobile} />
              <InfoItem label="Login Status" value="Authenticated" isMobile={isMobile} />
              <InfoItem label="Session" value="Active" isMobile={isMobile} />
              <InfoItem label="Role" value={user?.role || 'Admin'} isMobile={isMobile} />
              <InfoItem label="Last Login" value={new Date().toLocaleDateString()} isMobile={isMobile} />
            </div>
          </div>
        </div>

        {/* Admin Footer */}
        <AdminFooter isMobile={isMobile} />
      </main>

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

// Simple Card Component
const SimpleCard = ({ title, value, icon, color, isMobile }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: isMobile ? '8px' : '12px',
    padding: isMobile ? '1rem' : '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '0.75rem' : '1rem',
    minHeight: isMobile ? '80px' : 'auto',
    border: isMobile ? '1px solid #f3f4f6' : 'none'
  }}>
    <div style={{
      width: isMobile ? '40px' : '48px',
      height: isMobile ? '40px' : '48px',
      backgroundColor: `${color}20`,
      borderRadius: isMobile ? '8px' : '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      flexShrink: 0
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: isMobile ? '1.25rem' : '1.5rem',
        fontWeight: 'bold',
        color: '#1f2937',
        lineHeight: '1.2',
        marginBottom: isMobile ? '0.125rem' : '0.25rem'
      }}>
        {value}
      </div>
      <div style={{
        fontSize: isMobile ? '0.8rem' : '0.875rem',
        color: '#6b7280',
        lineHeight: '1.3'
      }}>
        {title}
      </div>
    </div>
  </div>
);

// Info Item Component
const InfoItem = ({ label, value, isMobile }) => (
  <div style={{
    padding: isMobile ? '0.625rem' : '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: isMobile ? '1px solid #f3f4f6' : 'none'
  }}>
    <div style={{
      fontSize: isMobile ? '0.7rem' : '0.75rem',
      color: '#6b7280',
      marginBottom: '0.25rem',
      textTransform: 'uppercase',
      fontWeight: '500',
      letterSpacing: '0.025em'
    }}>
      {label}
    </div>
    <div style={{
      fontSize: isMobile ? '0.8rem' : '0.875rem',
      fontWeight: '500',
      color: '#1f2937',
      lineHeight: '1.3',
      wordBreak: 'break-word'
    }}>
      {value}
    </div>
  </div>
);

export default Dashboard;