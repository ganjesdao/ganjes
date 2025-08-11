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
    const [investorDetails, setInvestorDetails] = useState(null);
    const [loadingInvestors, setLoadingInvestors] = useState(false);
    const [extendingTime, setExtendingTime] = useState(false);
    const [reducingTime, setReducingTime] = useState(false);
    const [timeAdjustment, setTimeAdjustment] = useState('');
    const [showInvestors, setShowInvestors] = useState(false);
    const selectedId = localStorage.getItem('selectedProposalId');
    const [userAddress, setUserAddress] = useState('');

    // Custom styles
    useEffect(() => {
        const customStyles = `
      .admin-proposal-card {
        background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
        border: 2px solid transparent;
        background-clip: padding-box;
        position: relative;
        overflow: hidden;
      }
      
      .admin-proposal-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #8b5cf6, #3b82f6, #06b6d4, #10b981);
        background-size: 300% 300%;
        animation: gradientMove 3s ease infinite;
      }
      
      @keyframes gradientMove {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      
      .admin-proposal-card:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(139, 92, 246, 0.1) !important;
        border-color: rgba(139, 92, 246, 0.2);
      }
      
      .admin-progress-bar {
        transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        background: linear-gradient(90deg, #8b5cf6 0%, #3b82f6 50%, #06b6d4 100%);
        background-size: 200% 200%;
        animation: progressShimmer 2s ease-in-out infinite;
        border-radius: 4px;
      }
      
      @keyframes progressShimmer {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      
      .admin-btn {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      
      .admin-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s;
      }
      
      .admin-btn:hover::before {
        left: 100%;
      }
      
      .admin-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }
      
      .admin-card {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid #e5e7eb;
        backdrop-filter: blur(10px);
      }
      
      .admin-primary-btn {
        background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
        border: none;
        border-radius: 12px;
        padding: 12px 24px;
        font-weight: 600;
        color: white;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .admin-primary-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 30px rgba(139, 92, 246, 0.4);
        background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
      }
      
      .admin-secondary-btn {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        border: none;
        border-radius: 12px;
        padding: 12px 24px;
        font-weight: 600;
        color: white;
        transition: all 0.3s ease;
      }
      
      .admin-secondary-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 30px rgba(245, 158, 11, 0.4);
      }
      
      .admin-danger-btn {
        background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
        border: none;
        border-radius: 12px;
        padding: 12px 24px;
        font-weight: 600;
        color: white;
        transition: all 0.3s ease;
      }
      
      .admin-danger-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 30px rgba(220, 38, 38, 0.4);
      }
      
      .admin-success-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border: none;
        border-radius: 12px;
        padding: 12px 24px;
        font-weight: 600;
        color: white;
        transition: all 0.3s ease;
      }
      
      .admin-success-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 30px rgba(16, 185, 129, 0.4);
      }
      
      .admin-input {
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 14px;
        transition: all 0.3s ease;
        background: rgba(255, 255, 255, 0.8);
      }
      
      .admin-input:focus {
        outline: none;
        border-color: #8b5cf6;
        box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        background: white;
      }
      
      .investor-card {
        background: linear-gradient(145deg, #f8fafc 0%, #ffffff 100%);
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
        transition: all 0.3s ease;
        position: relative;
      }
      
      .investor-card:hover {
        transform: translateX(4px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.08);
        border-color: #8b5cf6;
      }
      
      .pulse-animation {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: .8; }
      }
      
      .glassmorphism {
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.18);
      }
      
      .btn-disabled {
        opacity: 0.6;
        cursor: not-allowed !important;
        transform: none !important;
        box-shadow: none !important;
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

    const initializeContract = async (network) => {


        const contractAddr = getContractAddress(network.chainId);
        setContractAddress(contractAddr);
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
            toast.error('Contract not initialized');
            return;
        }

        try {
            setExecuting(true);
            const tx = await daoContract.executeProposal(proposalId);
            toast.info('Transaction submitted. Please wait for confirmation...');
            await tx.wait();
            toast.success('Proposal executed successfully!');

            // Refresh proposal details
            await getProposalDetails(proposalId, daoContract);
        } catch (error) {
            console.error('Execute error:', error.message);
            toast.error(`Failed to execute proposal: ${error.message}`);
        } finally {
            setExecuting(false);
        }
    };

    const extendProposalTime = async (proposalId) => {
        if (!daoContract || !timeAdjustment) {
            toast.error('Please enter a valid time extension in hours');
            return;
        }

        try {
            setExtendingTime(true);
            const hours = parseInt(timeAdjustment);
            const seconds = hours * 3600; // Convert hours to seconds

            const tx = await daoContract.extendProposalVotingTime(proposalId, seconds);
            toast.info('Extending proposal time. Please wait for confirmation...');
            await tx.wait();
            toast.success(`Proposal time extended by ${hours} hours successfully!`);

            // Refresh proposal details
            await getProposalDetails(proposalId, daoContract);
            setTimeAdjustment('');
        } catch (error) {
            console.error('Extend time error:', error.message);
            toast.error(`Failed to extend time: ${error.message}`);
        } finally {
            setExtendingTime(false);
        }
    };

    const reduceProposalTime = async (proposalId) => {
        if (!daoContract || !timeAdjustment) {
            toast.error('Please enter a valid time reduction in hours');
            return;
        }

        try {
            setReducingTime(true);
            const hours = parseInt(timeAdjustment);
            const seconds = hours * 3600; // Convert hours to seconds

            const tx = await daoContract.reduceProposalVotingTime(proposalId, seconds);
            toast.info('Reducing proposal time. Please wait for confirmation...');
            await tx.wait();
            toast.success(`Proposal time reduced by ${hours} hours successfully!`);

            // Refresh proposal details
            await getProposalDetails(proposalId, daoContract);
            setTimeAdjustment('');
        } catch (error) {
            console.error('Reduce time error:', error.message);
            toast.error(`Failed to reduce time: ${error.message}`);
        } finally {
            setReducingTime(false);
        }
    };

    const fetchInvestorDetails = async (proposalId) => {
        if (!daoContract) {
            toast.error('Contract not initialized');
            return;
        }

        try {
            setLoadingInvestors(true);
            const result = await daoContract.getInvestorDetails(proposalId);

            const [investors, investments, voteSupports, timestamps, hasVotedFlags] = result;

            const formattedInvestors = investors.map((investor, index) => ({
                address: investor,
                investment: ethers.formatEther(investments[index] || '0'),
                voteSupport: voteSupports[index],
                timestamp: timestamps[index] ? new Date(Number(timestamps[index]) * 1000).toLocaleString() : 'Unknown',
                hasVoted: hasVotedFlags[index]
            }));

            setInvestorDetails(formattedInvestors);
            setShowInvestors(true);
            toast.success(`Loaded ${formattedInvestors.length} investor details`);
        } catch (error) {
            console.error('Fetch investors error:', error.message);
            toast.error(`Failed to fetch investor details: ${error.message}`);
        } finally {
            setLoadingInvestors(false);
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



    };

    return (
        <AdminPageLayout onNetworkChange={handleNetworkChange}>

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



                                    {/* Enhanced Admin Actions */}
                                    <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '1.5rem' }}>

                                        {/* Time Management Section */}
                                        <div style={{
                                            marginBottom: '1.5rem',
                                            padding: '1rem',
                                            backgroundColor: '#f8fafc',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            <h4 style={{
                                                fontSize: '1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: '#374151',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <i className="fas fa-clock" style={{ color: '#8b5cf6' }}></i>
                                                Proposal Time Management
                                            </h4>

                                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                                <input
                                                    type="number"
                                                    placeholder="Hours"
                                                    value={timeAdjustment}
                                                    onChange={(e) => setTimeAdjustment(e.target.value)}
                                                    className="admin-input"
                                                    style={{ flex: '1', minWidth: '100px' }}
                                                    min="1"
                                                    max="720"
                                                />
                                                <button
                                                    onClick={() => extendProposalTime(proposalDetails.id)}
                                                    disabled={extendingTime || !timeAdjustment || proposalDetails.executed}
                                                    className={`admin-success-btn admin-btn ${extendingTime ? 'btn-disabled' : ''}`}
                                                    style={{ minWidth: '100px' }}
                                                >
                                                    {extendingTime ? (
                                                        <>
                                                            <i className="fas fa-spinner fa-spin"></i> Extending...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-plus-circle"></i> Extend
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => reduceProposalTime(proposalDetails.id)}
                                                    disabled={reducingTime || !timeAdjustment || proposalDetails.executed}
                                                    className={`admin-secondary-btn admin-btn ${reducingTime ? 'btn-disabled' : ''}`}
                                                    style={{ minWidth: '100px' }}
                                                >
                                                    {reducingTime ? (
                                                        <>
                                                            <i className="fas fa-spinner fa-spin"></i> Reducing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-minus-circle"></i> Reduce
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                                ⏰ Enter hours to extend or reduce the proposal voting time
                                            </small>
                                        </div>

                                        {/* Investor Details Section */}
                                        <div style={{
                                            marginBottom: '1.5rem',
                                            padding: '1rem',
                                            backgroundColor: '#fefce8',
                                            borderRadius: '12px',
                                            border: '1px solid #fde047'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <h4 style={{
                                                    fontSize: '1rem',
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                    margin: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}>
                                                    <i className="fas fa-users" style={{ color: '#f59e0b' }}></i>
                                                    Investor Details
                                                </h4>
                                                <button
                                                    onClick={() => fetchInvestorDetails(proposalDetails.id)}
                                                    disabled={loadingInvestors}
                                                    className={`admin-primary-btn admin-btn ${loadingInvestors ? 'btn-disabled pulse-animation' : ''}`}
                                                    style={{ fontSize: '0.875rem', padding: '8px 16px' }}
                                                >
                                                    {loadingInvestors ? (
                                                        <>
                                                            <i className="fas fa-spinner fa-spin"></i> Loading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-eye"></i> View Investors
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {showInvestors && investorDetails && (
                                                <div style={{
                                                    maxHeight: '300px',
                                                    overflowY: 'auto',
                                                    marginTop: '1rem'
                                                }}>
                                                    <div style={{
                                                        fontSize: '0.875rem',
                                                        fontWeight: '600',
                                                        marginBottom: '0.5rem',
                                                        color: '#374151'
                                                    }}>
                                                        📊 Total Investors: {investorDetails.length}
                                                    </div>
                                                    {investorDetails.map((investor, index) => (
                                                        <div key={index} className="investor-card">
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{
                                                                        fontFamily: 'monospace',
                                                                        fontSize: '0.875rem',
                                                                        fontWeight: '600',
                                                                        color: '#1f2937',
                                                                        marginBottom: '0.25rem'
                                                                    }}>
                                                                        {investor.address.substring(0, 10)}...{investor.address.slice(-8)}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                                        💰 Investment: <strong>{parseFloat(investor.investment).toFixed(4)} GNJ</strong>
                                                                    </div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                                        🗓️ Date: {investor.timestamp}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                                                    <span style={{
                                                                        padding: '0.25rem 0.5rem',
                                                                        borderRadius: '8px',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: '600',
                                                                        backgroundColor: investor.hasVoted ? (investor.voteSupport ? '#dcfce7' : '#fef2f2') : '#f3f4f6',
                                                                        color: investor.hasVoted ? (investor.voteSupport ? '#166534' : '#dc2626') : '#6b7280'
                                                                    }}>
                                                                        {investor.hasVoted ? (investor.voteSupport ? '✅ For' : '❌ Against') : '⏳ No Vote'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Execution Status */}
                                        {!proposalDetails.executed &&
                                            parseFloat(proposalDetails.totalInvested) >= parseFloat(proposalDetails.fundingGoal) && (
                                                <div
                                                    className="glassmorphism pulse-animation"
                                                    style={{
                                                        marginBottom: '1rem',
                                                        padding: '1rem',
                                                        borderRadius: '12px',
                                                        textAlign: 'center',
                                                        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                                                        border: '2px solid #22c55e'
                                                    }}
                                                >
                                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎉</div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#166534' }}>
                                                        Ready for execution - Funding goal achieved!
                                                    </div>
                                                </div>
                                            )}

                                        {/* Action Buttons */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <button
                                                onClick={() => exploreProject(proposalDetails?.projectUrl)}
                                                disabled={!proposalDetails.projectUrl || !/^https?:\/\/\S+$/.test(proposalDetails.projectUrl)}
                                                className={`admin-primary-btn admin-btn ${(!proposalDetails.projectUrl || !/^https?:\/\/\S+$/.test(proposalDetails.projectUrl)) ? 'btn-disabled' : ''}`}
                                                style={{ width: '100%' }}
                                            >
                                                <i className="fas fa-external-link-alt" style={{ marginRight: '0.5rem' }}></i>
                                                View Project
                                            </button>

                                            <button
                                                onClick={() => executeProposal(proposalDetails.id)}
                                                disabled={proposalDetails.executed || executing}
                                                className={`admin-danger-btn admin-btn ${(proposalDetails.executed || executing) ? 'btn-disabled' : ''}`}
                                                style={{ width: '100%' }}
                                            >
                                                {executing ? (
                                                    <>
                                                        <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                                                        Processing...
                                                    </>
                                                ) : proposalDetails.executed ? (
                                                    <>
                                                        <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
                                                        Already Executed
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-play-circle" style={{ marginRight: '0.5rem' }}></i>
                                                        Execute Proposal
                                                    </>
                                                )}
                                            </button>
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