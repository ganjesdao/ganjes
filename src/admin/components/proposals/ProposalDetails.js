/**
 * Proposal Management Component
 * Display details of a single DAO proposal based on selectedId and allow actions
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectAuth } from '../../store/slices/authSlice';
import AdminPageLayout from '../common/AdminPageLayout';
import { daoABI } from '../../../Auth/Abi';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getContractAddress, NETWORKS } from '../../../utils/networks';

const ProposalDetails = () => {
    const auth = useSelector(selectAuth);
    const [proposalDetails, setProposalDetails] = useState(null); // Single proposal object
    const [daoContract, setDaoContract] = useState(null);
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false); // Loading state for execute action
    const [currentNetwork, setCurrentNetwork] = useState(null);
    const [contractAddress, setContractAddress] = useState('');
    const selectedId = localStorage.getItem('selectedProposalId');

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

        const styleSheet = document.createElement('style');
        styleSheet.innerText = customStyles;
        styleSheet.id = 'admin-proposal-styles';

        const existingStyles = document.getElementById('admin-proposal-styles');
        if (!existingStyles) {
            document.head.appendChild(styleSheet);
        }

        return () => {
            const styleElement = document.getElementById('admin-proposal-styles');
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

                const networkConfig = Object.values(NETWORKS).find((n) => n.chainId === chainId);
                if (networkConfig) {
                    setCurrentNetwork(networkConfig);
                    const address = getContractAddress(chainId);
                    setContractAddress(address);
                    await initializeContract(address);
                } else {
                    // toast.info('Please connect to a supported network');
                }
            } catch (error) {
                // toast.info('Please connect your wallet and select a network');
            }
        } else {
            // toast.error('Please install MetaMask!');
        }
    };

    const switchNetwork = async (network) => {
        if (typeof window.ethereum === 'undefined') {
            //   toast.error('Please install MetaMask!');
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

            //  toast.success(`Switched to ${network.chainName}`);
        } catch (error) {
            if (error.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: network.chainId,
                                chainName: network.chainName,
                                nativeCurrency: network.nativeCurrency,
                                rpcUrls: network.rpcUrls,
                                blockExplorerUrls: network.blockExplorerUrls,
                            },
                        ],
                    });
                    setCurrentNetwork(network);
                    const address = getContractAddress(network.chainId);
                    setContractAddress(address);
                    await initializeContract(address);
                } catch (addError) {
                    // toast.error('Failed to add network');
                }
            } else {
                // toast.error('Failed to switch network');
            }
        }
    };

    const initializeContract = async (contractAddr) => {
        if (!contractAddr || contractAddr === '0x0000000000000000000000000000000000000000') {
            setDaoContract(null);
            setProposalDetails(null);

            return;
        }

        if (typeof window.ethereum === 'undefined') {

            return;
        }

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send('eth_requestAccounts', []);
            const signer = await provider.getSigner();

            const contract = new ethers.Contract(contractAddr, daoABI, signer);
            setDaoContract(contract);

            if (selectedId) {
                await getProposalDetails(selectedId, contract);
            } else {

                setProposalDetails(null);
            }


        } catch (error) {
            console.error('Init error:', error.message);

            setDaoContract(null);
            setProposalDetails(null);
        } finally {
            setLoading(false);
        }
    };

    const getProposalDetails = async (id, contract) => {
        try {
            const proposal = await contract.proposals(id);
            const title = proposal?.projectName?.toString() || '0';
            const endTimeStr = proposal?.endTime?.toString() || '0';
            const fundingGoalStr = proposal?.fundingGoal?.toString() || '0';
            const totalInvestedStr = proposal?.totalInvested?.toString() || '0';
            const votersForStr = proposal?.votersFor?.toString() || '0';
            const totalVotesForStr = proposal?.totalVotesFor?.toString() || '0';
            const totalVotesAgainstStr = proposal?.totalVotesAgainst?.toString() || '0';
            const votersAgainstStr = proposal?.votersAgainst?.toString() || '0';
            const projectUrl = proposal?.projectUrl.toString() || '';

            setProposalDetails({
                id: id.toString(),
                title: title || '',
                description: proposal?.description || '',
                fundingGoal: ethers.formatUnits(fundingGoalStr, 18),
                proposer: proposal?.proposer || '',
                voteCountFor: votersForStr,
                votersAgainst: votersAgainstStr,
                totalVotesFor: totalVotesForStr,
                totalInvested: ethers.formatUnits(totalInvestedStr, 18),
                totalVotesAgainst: totalVotesAgainstStr,
                deadline: parseInt(endTimeStr) > 0 ? new Date(parseInt(endTimeStr) * 1000).toLocaleString() : 'No deadline',
                executed: Boolean(proposal?.executed),
                passed: Boolean(proposal?.passed),
                projectUrl: projectUrl,
            });
        } catch (error) {
            console.error('Error fetching proposal details:', error);

            setProposalDetails(null);
        }
    };

    const executeProposal = async (proposalId) => {
        if (!daoContract) {

            return;
        }

        try {
            setExecuting(true);
            const tx = await daoContract.executeProposal(proposalId);
            await tx.wait();



            // Refresh proposal details
            await getProposalDetails(proposalId, daoContract);
        } catch (error) {
            console.error('Execute error:', error.message);

        } finally {
            setExecuting(false);
        }
    };

    const isNetworkSupported = () => {
        return (
            currentNetwork &&
            contractAddress &&
            contractAddress !== '0x0000000000000000000000000000000000000000'
        );
    };

    if (!auth.isAuthenticated) {
        return (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        textAlign: 'center',
                    }}
                >
                    <h2>Please log in to access Proposal Management</h2>
                </div>
            </div>
        );
    }

    const exploreProject = async (url) => {
        window.open(url, '_blank'); // Open URL in a new tab/window
    }

    return (
        <AdminPageLayout>
            {({ isMobile }) => (
                <>
                    {/* Network Selection */}
                    {!isNetworkSupported() && (
                        <div
                            className="admin-card"
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                padding: '3rem',
                                textAlign: 'center',
                                marginBottom: '2rem',
                            }}
                        >
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌐</div>
                            <h3>Select a Network</h3>
                            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                                Please connect your wallet and select a network to view the proposal
                            </p>
                            <select
                                onChange={(e) => {
                                    const selectedNetwork = Object.values(NETWORKS).find(
                                        (n) => n.chainId === e.target.value
                                    );
                                    if (selectedNetwork) {
                                        switchNetwork(selectedNetwork);
                                    }
                                }}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    fontSize: '1rem',
                                }}
                            >
                                <option value="">Select a network</option>
                                {Object.values(NETWORKS).map((network) => (
                                    <option key={network.chainId} value={network.chainId}>
                                        {network.chainName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: isMobile ? '2rem' : '3rem' }}>
                            <div
                                style={{
                                    width: isMobile ? '3rem' : '4rem',
                                    height: isMobile ? '3rem' : '4rem',
                                    border: '4px solid #e5e7eb',
                                    borderTop: '4px solid #3b82f6',
                                    borderRadius: '50%',
                                    margin: '0 auto 1rem',
                                    animation: 'spin 1s linear infinite',
                                }}
                            ></div>
                            <p style={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>
                                Loading proposal from blockchain...
                            </p>
                        </div>
                    ) : isNetworkSupported() ? (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
                                gap: isMobile ? '1rem' : '1.5rem',
                            }}
                        >
                            {!selectedId || !proposalDetails ? (
                                <div
                                    className="admin-card"
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        padding: '3rem',
                                        textAlign: 'center',
                                        gridColumn: '1 / -1',
                                    }}
                                >
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                                    <h3>No Proposal Selected</h3>
                                    <p style={{ color: '#6b7280' }}>
                                        Please select a proposal to view its details
                                    </p>
                                </div>
                            ) : (
                                <div
                                    className="admin-card admin-proposal-card"
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        padding: '1.5rem',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    {/* Proposal Header */}
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span
                                                style={{
                                                    backgroundColor: '#3b82f6',
                                                    color: 'white',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                #{proposalDetails.id}
                                            </span>
                                            <span
                                                style={{
                                                    backgroundColor: proposalDetails.executed ? '#10b981' : '#f59e0b',
                                                    color: 'white',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                {proposalDetails.executed ? 'Executed' : 'Active'}
                                            </span>
                                        </div>
                                        <h2 style={{ margin: 0, color: '#1f2937' }}>
                                            {proposalDetails.title.length > 80
                                                ? proposalDetails.title.slice(0, 80) + '...'
                                                : proposalDetails.title}
                                        </h2>

                                        <h3 style={{ marginTop: '5px', margin: 0, color: '#1f2937' }}>
                                            {proposalDetails.description.length > 80
                                                ? proposalDetails.description.slice(0, 80) + '...'
                                                : proposalDetails.description}
                                        </h3>
                                    </div>

                                    {/* Proposer */}
                                    <div
                                        style={{
                                            marginBottom: '1rem',
                                            padding: '0.75rem',
                                            backgroundColor: '#f9fafb',
                                            borderRadius: '8px',
                                        }}
                                    >
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                            Proposer
                                        </div>
                                        <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: '600' }}>
                                            {proposalDetails.proposer.substring(0, 10)}...{proposalDetails.proposer.slice(-8)}
                                        </div>
                                    </div>

                                    {/* Voting Stats */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', }}>
                                        <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: '8px', }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                                                {proposalDetails.voteCountFor}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#059669' }}>Votes For</div>
                                        </div>
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                padding: '0.75rem',
                                                backgroundColor: '#fef2f2',
                                                borderRadius: '8px',
                                            }}
                                        >
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                                                {proposalDetails.votersAgainst}
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
                                                    const invested = parseFloat(proposalDetails.totalInvested || '0');
                                                    const goal = parseFloat(proposalDetails.fundingGoal || '0');
                                                    return goal > 0 ? ((invested / goal) * 100).toFixed(1) : '0';
                                                })()}
                                                %
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                width: '100%',
                                                height: '8px',
                                                backgroundColor: '#e5e7eb',
                                                borderRadius: '4px',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                className="admin-progress-bar"
                                                style={{
                                                    height: '100%',
                                                    width: `${(() => {
                                                        const invested = parseFloat(proposalDetails.totalInvested || '0');
                                                        const goal = parseFloat(proposalDetails.fundingGoal || '0');
                                                        return goal > 0 ? Math.min((invested / goal) * 100, 100) : 0;
                                                    })()}%`,
                                                }}
                                            />
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginTop: '0.5rem',
                                                fontSize: '0.875rem',
                                            }}
                                        >
                                            <span>
                                                Raised: <strong>{parseFloat(proposalDetails.totalInvested).toFixed(2)} GNJ</strong>
                                            </span>
                                            <span>
                                                Goal: <strong>{parseFloat(proposalDetails.fundingGoal).toFixed(2)} GNJ</strong>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Deadline */}
                                    <div
                                        style={{
                                            marginBottom: '1.5rem',
                                            padding: '0.75rem',
                                            backgroundColor: '#fffbeb',
                                            borderRadius: '8px',
                                        }}
                                    >
                                        <div style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '0.25rem' }}>
                                            Deadline
                                        </div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e' }}>
                                            {proposalDetails.deadline}
                                        </div>
                                    </div>



                                    {/* Admin Actions */}
                                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>



                                        {!proposalDetails.executed &&
                                            parseFloat(proposalDetails.totalInvested) >= parseFloat(proposalDetails.fundingGoal) && (
                                                <div
                                                    style={{
                                                        marginTop: '0.5rem',
                                                        padding: '0.5rem',
                                                        backgroundColor: '#dcfce7',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        color: '#166534',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    ✅ Ready for execution - Funding goal met
                                                </div>
                                            )}

                                        {/* Voting Stats */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', }}>
                                            <div >

                                                <div>
                                                    <button
                                                        onClick={() => exploreProject(proposalDetails?.projectUrl)}
                                                        disabled={!proposalDetails.projectUrl || !/^https?:\/\/\S+$/.test(proposalDetails.projectUrl)}
                                                        className="admin-execute-btn"

                                                        style={{

                                                            width: '100%',
                                                            color: 'white',

                                                            cursor:
                                                                !proposalDetails.projectUrl || !/^https?:\/\/\S+$/.test(proposalDetails.projectUrl)
                                                                    ? 'not-allowed'
                                                                    : 'pointer',
                                                        }}
                                                    >
                                                        View Project
                                                    </button>
                                                </div>
                                            </div>
                                            <div>

                                                <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                                                    <button
                                                        onClick={() => executeProposal(proposalDetails.id)}
                                                        disabled={proposalDetails.executed || executing}
                                                        className="admin-execute-btn"
                                                        style={{
                                                            width: '100%',
                                                            color: 'white',
                                                            cursor: proposalDetails.executed || executing ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        {executing
                                                            ? 'Processing...'
                                                            : proposalDetails.executed
                                                                ? 'Already Executed'
                                                                : 'Execute Proposal'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}

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
            )}
        </AdminPageLayout>
    );
};

export default ProposalDetails;