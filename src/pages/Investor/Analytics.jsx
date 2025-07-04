import React, { useState, useEffect } from 'react';
import Header from './component/Header';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import Auth from './auth/Auth';
import { daoABI } from '../../Auth/Abi';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getContractAddress, isTestnet } from '../../utils/networks';
import { FaEye } from 'react-icons/fa';

function Analytics() {
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
                                <ol className="breadcrumb mb-4 mt-4">
                                    <li className="breadcrumb-item active">Analytics</li>
                                </ol>

                                {/* Network Status */}


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
                                                <div className="card bg-success text-white mb-4">
                                                    <div className="card-body">
                                                        <div className="row">
                                                            <div className="col-8 mt-2">
                                                                <span>Total Project</span>
                                                            </div>
                                                            <div className="col-4 mt-2 text-end">
                                                                <h5 className=""><FaEye /></h5>
                                                            </div>
                                                            <div className="col-8 mt-2">
                                                                <h2>152</h2>
                                                            </div>
                                                            <div className="col-4 mt-3 text-end">
                                                                <span>+52.7%</span>
                                                            </div>
                                                            <div>

                                                            </div>
                                                        </div>
                                                        </div>
                                                </div>
                                            </div>

                                            <div className="col-xl-3 col-md-6">
                                                <div className="card bg-success text-white mb-4">
                                                    <div className="card-body">
                                                        <div className="row">
                                                            <div className="col-8 mt-2">
                                                                <span>Invested Project</span>
                                                            </div>
                                                            <div className="col-4 mt-2 text-end">
                                                                <h5 className=""><FaEye /></h5>
                                                            </div>
                                                            <div className="col-8 mt-2">
                                                                <h2>152</h2>
                                                            </div>
                                                            <div className="col-4 mt-3 text-end">
                                                                <span>+52.7%</span>
                                                            </div>
                                                            <div>

                                                            </div>
                                                        </div>
                                                        </div>
                                                </div>
                                            </div>

                                            <div className="col-xl-3 col-md-6">
                                                <div className="card bg-success text-white mb-4">
                                                    <div className="card-body">
                                                        <div className="row">
                                                            <div className="col-8 mt-2">
                                                                <span>Total Funding</span>
                                                            </div>
                                                            <div className="col-4 mt-2 text-end">
                                                                <h5 className=""><FaEye /></h5>
                                                            </div>
                                                            <div className="col-8 mt-2">
                                                                <h2>$1492</h2>
                                                            </div>
                                                            <div className="col-4 mt-3 text-end">
                                                                <span>+12.7%</span>
                                                            </div>
                                                            <div>

                                                            </div>
                                                        </div>
                                                        </div>
                                                </div>
                                            </div>

                                            <div className="col-xl-3 col-md-6">
                                                <div className="card bg-success text-white mb-4">
                                                    <div className="card-body">
                                                        <div className="row">
                                                            <div className="col-8 mt-2">
                                                                <span>Total Profit</span>
                                                            </div>
                                                            <div className="col-4 mt-2 text-end">
                                                                <h5 className=""><FaEye /></h5>
                                                            </div>
                                                            <div className="col-8 mt-2">
                                                                <h2>$6624</h2>
                                                            </div>
                                                            <div className="col-4 mt-3 text-end">
                                                                <span>+18.7%</span>
                                                            </div>
                                                            <div>

                                                            </div>
                                                        </div>
                                                        </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Proposal List Table */}
                                        <div className="mt-5">
                                            <div className="card shadow-lg border-0">
                                                <div className="card-header bg-gradient-primary text-white py-3">
                                                    <h5 className="mb-0 text-dark">
                                                        <i className="fas fa-chart-line me-2"></i>
                                                        Proposal Analytics Dashboard
                                                    </h5>
                                                </div>
                                                <div className="card-body p-0">
                                                    {proposalDetails.length === 0 ? (
                                                        <div className="text-center py-5">
                                                            <div className="d-flex flex-column align-items-center">
                                                                <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                                                                <h5 className="text-muted">No proposals found</h5>
                                                                <p className="text-muted">Create your first proposal to get started!</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="table-responsive">
                                                            <table className="table table-hover mb-0">
                                                                <thead className="table-dark">
                                                                    <tr>
                                                                        <th scope="col" className="border-0 text-uppercase" style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                                                            <i className="fas fa-hashtag me-1"></i>ID
                                                                        </th>
                                                                        <th scope="col" className="border-0 text-uppercase" style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                                                            <i className="fas fa-file-alt me-1"></i>Description
                                                                        </th>
                                                                        <th scope="col" className="border-0 text-uppercase text-center" style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                                                            <i className="fas fa-coins me-1"></i>Funding Goal
                                                                        </th>
                                                                        <th scope="col" className="border-0 text-uppercase text-center" style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                                                            <i className="fas fa-thumbs-up me-1"></i>Votes For
                                                                        </th>
                                                                        <th scope="col" className="border-0 text-uppercase text-center" style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                                                            <i className="fas fa-thumbs-down me-1"></i>Votes Against
                                                                        </th>
                                                                        <th scope="col" className="border-0 text-uppercase text-center" style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                                                            <i className="fas fa-clock me-1"></i>Deadline
                                                                        </th>
                                                                        <th scope="col" className="border-0 text-uppercase text-center" style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                                                            <i className="fas fa-info-circle me-1"></i>Status
                                                                        </th>
                                                                        <th scope="col" className="border-0 text-uppercase text-center" style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                                                            <i className="fas fa-cog me-1"></i>Actions
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {proposalDetails.map((proposal, index) => (
                                                                        <tr key={proposal.id} className={index % 2 === 0 ? 'bg-light' : 'bg-white'} style={{ transition: 'all 0.3s ease' }}>
                                                                            <td className="align-middle fw-bold text-primary" style={{ fontSize: '0.95rem' }}>
                                                                                #{proposal.id}
                                                                            </td>
                                                                            <td className="align-middle" style={{ maxWidth: '200px' }}>
                                                                                <div className="d-flex align-items-center">
                                                                                    <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                                                                                        <i className="fas fa-lightbulb text-white"></i>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>
                                                                                            {proposal.description.length > 60 ? proposal.description.slice(0, 60) + '...' : proposal.description}
                                                                                        </div>
                                                                                        <small className="text-muted">
                                                                                            Proposer: {proposal.proposer.slice(0, 8)}...{proposal.proposer.slice(-6)}
                                                                                        </small>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                            <td className="align-middle text-center">
                                                                                <div className="d-flex flex-column align-items-center">
                                                                                    <span className="fw-bold text-success" style={{ fontSize: '1rem' }}>
                                                                                        {parseFloat(proposal.fundingGoal).toFixed(2)}
                                                                                    </span>
                                                                                    <small className="text-muted">GNJ</small>
                                                                                </div>
                                                                            </td>
                                                                            <td className="align-middle text-center">
                                                                                <div className="d-flex flex-column align-items-center">
                                                                                    <span className="badge bg-success rounded-pill px-3 py-2" style={{ fontSize: '0.85rem' }}>
                                                                                        <i className="fas fa-thumbs-up me-1"></i>
                                                                                        {proposal.voteCountFor}
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="align-middle text-center">
                                                                                <div className="d-flex flex-column align-items-center">
                                                                                    <span className="badge bg-danger rounded-pill px-3 py-2" style={{ fontSize: '0.85rem' }}>
                                                                                        <i className="fas fa-thumbs-down me-1"></i>
                                                                                        {proposal.voteCountAgainst}
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="align-middle text-center">
                                                                                <div className="d-flex flex-column align-items-center">
                                                                                    <small className="text-muted fw-semibold">
                                                                                        {new Date(proposal.deadline).toLocaleDateString()}
                                                                                    </small>
                                                                                    <small className="text-muted">
                                                                                        {new Date(proposal.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                    </small>
                                                                                </div>
                                                                            </td>
                                                                            <td className="align-middle text-center">
                                                                                <span className={`badge ${proposal.executed ? 'bg-success' : 'bg-warning'} rounded-pill px-3 py-2`} style={{ fontSize: '0.85rem' }}>
                                                                                    <i className={`fas ${proposal.executed ? 'fa-check-circle' : 'fa-hourglass-half'} me-1`}></i>
                                                                                    {proposal.executed ? 'Executed' : 'Pending'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="align-middle text-center">
                                                                                <div className="btn-group" role="group">
                                                                                    <button 
                                                                                        className="btn btn-sm btn-outline-primary"
                                                                                        style={{ borderRadius: '20px 0 0 20px' }}
                                                                                        title="Vote"
                                                                                    >
                                                                                        <i className="fas fa-vote-yea"></i>
                                                                                    </button>
                                                                                    <button 
                                                                                        className="btn btn-sm btn-outline-info"
                                                                                        style={{ borderRadius: '0' }}
                                                                                        title="View Details"
                                                                                    >
                                                                                        <i className="fas fa-eye"></i>
                                                                                    </button>
                                                                                    <button 
                                                                                        className="btn btn-sm btn-outline-secondary"
                                                                                        style={{ borderRadius: '0 20px 20px 0' }}
                                                                                        title="More Options"
                                                                                    >
                                                                                        <i className="fas fa-ellipsis-v"></i>
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                                {proposalDetails.length > 0 && (
                                                    <div className="card-footer bg-light py-3">
                                                        <div className="row align-items-center">
                                                            <div className="col-md-6">
                                                                <small className="text-muted">
                                                                    Showing {proposalDetails.length} proposal{proposalDetails.length !== 1 ? 's' : ''} 
                                                                    from {currentNetwork?.chainName || 'Unknown Network'}
                                                                </small>
                                                            </div>
                                                            <div className="col-md-6 text-md-end">
                                                                <div className="d-flex justify-content-md-end align-items-center">
                                                                    <small className="text-muted me-2">Last updated:</small>
                                                                    <small className="text-primary fw-semibold">
                                                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
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

export default Analytics;
