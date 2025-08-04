import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { daoABI } from '../../Auth/Abi';  // adjust path if needed
import Header from './component/Header';
import Auth from '../../Auth/Auth';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import { toast } from 'react-toastify';
import { getContractAddress, getGasPrice, isTestnet } from '../../utils/networks';

// ERC20 ABI for token operations
const tokenABI = [{ "inputs": [{ "internalType": "address[]", "name": "_owners", "type": "address[]" }, { "internalType": "uint256", "name": "_requiredConfirmations", "type": "uint256" }], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Burn", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "string", "name": "action", "type": "string" }, { "indexed": true, "internalType": "address", "name": "executor", "type": "address" }], "name": "EmergencyAction", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }], "name": "OwnerAddition", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }], "name": "OwnerRemoval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "address", "name": "account", "type": "address" }], "name": "Paused", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "required", "type": "uint256" }], "name": "RequirementChange", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "transactionId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "owner", "type": "address" }], "name": "TransactionConfirmation", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "transactionId", "type": "uint256" }], "name": "TransactionExecution", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "transactionId", "type": "uint256" }], "name": "TransactionFailure", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "transactionId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "owner", "type": "address" }], "name": "TransactionRevocation", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "transactionId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "submitter", "type": "address" }, { "indexed": false, "internalType": "string", "name": "description", "type": "string" }], "name": "TransactionSubmission", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "address", "name": "account", "type": "address" }], "name": "Unpaused", "type": "event" }, { "inputs": [], "name": "FIXED_SUPPLY", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "TIMELOCK_DELAY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "burnFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "transactionId", "type": "uint256" }], "name": "canExecute", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "transactionId", "type": "uint256" }], "name": "confirmTransaction", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "address", "name": "", "type": "address" }], "name": "confirmations", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "createEmergencyPauseTransaction", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "createPauseTransaction", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "createUnpauseTransaction", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "pure", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "subtractedValue", "type": "uint256" }], "name": "decreaseAllowance", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "emergencyPause", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "emergencyWithdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "transactionId", "type": "uint256" }], "name": "executeTransaction", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "transactionId", "type": "uint256" }], "name": "getConfirmationCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getContractInfo", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "pure", "type": "function" }, { "inputs": [], "name": "getGovernanceInfo", "outputs": [{ "internalType": "uint256", "name": "totalOwners", "type": "uint256" }, { "internalType": "uint256", "name": "requiredSigs", "type": "uint256" }, { "internalType": "uint256", "name": "timelockDelay", "type": "uint256" }, { "internalType": "uint256", "name": "pendingTransactions", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getOwner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getOwners", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getTransactionCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "addedValue", "type": "uint256" }], "name": "increaseAllowance", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "transactionId", "type": "uint256" }], "name": "isConfirmed", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isOwner", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "pure", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "owners", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "pause", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "paused", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "requiredConfirmations", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "transactionId", "type": "uint256" }], "name": "revokeConfirmation", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "bytes", "name": "data", "type": "bytes" }, { "internalType": "string", "name": "description", "type": "string" }], "name": "submitTransaction", "outputs": [{ "internalType": "uint256", "name": "transactionId", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "pure", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "transactions", "outputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "bytes", "name": "data", "type": "bytes" }, { "internalType": "bool", "name": "executed", "type": "bool" }, { "internalType": "uint256", "name": "confirmations", "type": "uint256" }, { "internalType": "uint256", "name": "timestamp", "type": "uint256" }, { "internalType": "string", "name": "description", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "unpause", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];


function CreateProposal() {
    const [description, setDescription] = useState("");
    const [projectName, setProjectName] = useState("");
    const [projectUrl, setProjectUrl] = useState("");
    const [fundingGoal, setFundingGoal] = useState("");
    const [loading, setLoading] = useState(false);
    const [currentNetwork, setCurrentNetwork] = useState(null);
    const [contractAddress, setContractAddress] = useState("");
    const [isToggle, setIsToggle] = useState(false);
    const [minTokensForProposal, setMinTokensForProposal] = useState(null);
    const [userTokenBalance, setUserTokenBalance] = useState(null);
    const [tokenSymbol, setTokenSymbol] = useState("GNJ");
    const [tokenDecimals, setTokenDecimals] = useState(18);
    const [tokenContract, setTokenContract] = useState(null);
    const authToken = sessionStorage.getItem('authToken');
    const governanceTokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;

    // Handle network change from Header component
    const handleNetworkChange = (network) => {
        setCurrentNetwork(network);
        if (network) {
            const address = getContractAddress(network.chainId);
            setContractAddress(address);
            console.log(`Network changed to: ${network.chainName}`);
            console.log(`Contract address: ${address}`);
        } else {
            setContractAddress("");
        }
    };

    // Helper function to check if network is supported
    const isNetworkSupported = () => {
        return currentNetwork && contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';
    };

    const handleProfileDataFetched = (data) => {
        // Optional: Handle Auth result
    };

    // Function to fetch minimum tokens requirement and user's token balance
    const fetchTokenRequirements = async () => {
        try {
            if (!window.ethereum || !contractAddress || !governanceTokenAddress) return;

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const userAddress = await signer.getAddress();

            // Get DAO contract instance
            const contract = new ethers.Contract(contractAddress, daoABI, provider);

            // Get governance token contract instance
            const tokenContractInstance = new ethers.Contract(governanceTokenAddress, tokenABI, provider);
            setTokenContract(tokenContractInstance);

            // Fetch minimum tokens required for proposal
            const minTokens = await contract.MIN_TOKENS_FOR_PROPOSAL();
            setMinTokensForProposal(minTokens);

            // Fetch user's token balance
            const balance = await tokenContractInstance.balanceOf(userAddress);
            setUserTokenBalance(balance);

            // Fetch token symbol and decimals for display
            try {
                const symbol = await tokenContractInstance.symbol();
                setTokenSymbol(symbol);
                const decimals = await tokenContractInstance.decimals();
                setTokenDecimals(decimals);
            } catch (error) {
                console.warn("Could not fetch token details:", error);
            }

        } catch (error) {
            console.error("Error fetching token requirements:", error);
            toast.error("Failed to fetch token requirements");
        }
    };

    // Check if user has enough tokens for proposal creation
    const hasEnoughTokensForProposal = () => {
        return userTokenBalance && minTokensForProposal && userTokenBalance >= minTokensForProposal;
    };

    // Format token amount for display
    const formatTokenAmount = (amount) => {
        if (!amount) return "0";
        return ethers.formatUnits(amount, tokenDecimals);
    };

    // Effect to fetch token requirements when network/contract changes
    useEffect(() => {
        if (currentNetwork && contractAddress && governanceTokenAddress) {
            fetchTokenRequirements();
        }
    }, [currentNetwork, contractAddress, governanceTokenAddress]);

    const createProject = async (e) => {
        e.preventDefault(); // Prevent form submission refresh

        // Input validation

        if (!projectName || projectName.trim() === "") {
            toast.error("Project name cannot be empty!");
            return;
        }


        if (!description || description.trim() === "") {
            toast.error("Description cannot be empty!");
            return;
        }

        if (!projectUrl || projectUrl.trim() === "") {
            toast.error("Project URL cannot be empty!");
            return;
        }
        if (!fundingGoal || isNaN(fundingGoal) || Number(fundingGoal) <= 0) {
            toast.error("Funding goal must be a positive number!");
            return;
        }

        // Check if user has enough tokens for proposal creation
        if (!hasEnoughTokensForProposal()) {
            const requiredTokens = formatTokenAmount(minTokensForProposal);
            const currentBalance = formatTokenAmount(userTokenBalance);
            toast.error(
                `🪙 Insufficient ${tokenSymbol} tokens to create a proposal!\n` +
                `Required: ${requiredTokens} ${tokenSymbol}\n` +
                `Your Balance: ${currentBalance} ${tokenSymbol}`
            );
            return;
        }

        try {
            setLoading(true);

            // Check if wallet is connected
            if (!window.ethereum) {
                toast.error("Please install MetaMask or another Web3 wallet!");
                return;
            }

            // Check if network is supported
            if (!isNetworkSupported()) {
                toast.error(`⚠️ Please select a supported network with a deployed contract!`);
                return;
            }

            // Connect to wallet
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []); // Request wallet connection
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(contractAddress, daoABI, signer);

            // Convert fundingGoal to Wei (works for both ETH and BNB, both have 18 decimals)
            const fundingGoalInWei = ethers.parseEther(fundingGoal.toString());

            // Get network-specific gas settings
            const gasPrice = getGasPrice(currentNetwork.chainId);

            // Estimate gas for the transaction
            const gasEstimate = await contract.createProposal.estimateGas(
                description,
                projectName,
                projectUrl,
                fundingGoalInWei
            );

            // Call createProposal function with network-optimized gas settings
            const tx = await contract.createProposal(
                description,
                projectName,
                projectUrl,
                fundingGoalInWei,
                {
                    gasLimit: gasEstimate + (gasEstimate / 5n), // Add 20% buffer (gasEstimate * 1.2)
                    gasPrice: ethers.parseUnits(gasPrice, "gwei"), // Network-specific gas price
                }
            );

            // Wait for transaction confirmation
            toast.info(`🚀 Transaction sent! Hash: ${tx.hash}`);
            toast.info(`⏳ Waiting for confirmation on ${currentNetwork.chainName}...`);

            const receipt = await tx.wait();

            // Success notification with explorer link
            const explorerUrl = `${currentNetwork.blockExplorerUrls[0]}/tx/${tx.hash}`;
            toast.success(
                `🎉 Project created successfully! Gas used: ${receipt.gasUsed.toString()}`
            );
            toast.info(
                <div>
                    📄 <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>
                        View transaction on {currentNetwork.chainName}
                    </a>
                </div>
            );

            // Reset form
            setDescription("");
            setProjectName("");
            setProjectUrl("");
            setFundingGoal("");

            // Refresh token balance after successful proposal creation
            fetchTokenRequirements();
        } catch (error) {
            console.error("Error creating project:", error);
            // Handle specific network and general errors
            if (error.code === 4001) {
                toast.error("❌ Transaction rejected by user!");
            } else if (error.code === -32000) {
                const currency = currentNetwork?.nativeCurrency?.symbol || 'tokens';
                toast.error(`⛽ Insufficient ${currency} for gas fees. ${isTestnet(currentNetwork?.chainId) ? 'Get test tokens from faucet!' : 'Add more tokens to your wallet!'}`);
            } else if (error.message.includes("insufficient funds")) {
                const currency = currentNetwork?.nativeCurrency?.symbol || 'tokens';
                toast.error(`💰 Insufficient ${currency} balance for transaction fees!`);
            } else if (error.message.includes("Insufficient tokens to propose")) {
                toast.error("🪙 You don't have enough tokens to create a project!");
            } else if (error.message.includes("Funding goal must be greater than zero")) {
                toast.error("📊 Funding goal must be greater than zero!");
            } else if (error.message.includes("network")) {
                toast.error(`🌐 Network error. Please check your ${currentNetwork?.chainName} connection!`);
            } else {
                toast.error(`❌ Failed to create project: ${error.message || 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
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
                                <h1 className="mt-4">
                                    <i className="fas fa-vote-yea me-2"></i>
                                    Create Proposals
                                </h1>
                                <ol className="breadcrumb mb-4">
                                    <li className="breadcrumb-item active">Proposals Dashboard</li>
                                </ol>

                                <div className="card mb-4">
                                    <div className="card-body">
                                        <div className="row">
                                            <div className="col-12">
                                                <label>Project Name</label>
                                                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder='Enter Project Name' className="form-control mt-2" />
                                            </div>

                                            <div className="col-12 mt-3">
                                                <label>Project Description</label>
                                                <textarea
                                                    id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                                                    placeholder="Describe your project, its goals, and how funding will be used..."
                                                    style={{
                                                        width: "100%", height: "120px", padding: "12px",
                                                        borderRadius: "5px",
                                                        border: "2px solid #ddd",
                                                        fontSize: "16px",
                                                        resize: "vertical"
                                                    }}
                                                    required
                                                />
                                            </div>

                                            <div className="col-6 mt-3">
                                                <label>Project Official Link</label>
                                                <input
                                                    type="url"
                                                    value={projectUrl}
                                                    onChange={(e) => setProjectUrl(e.target.value)}
                                                    placeholder='https://your-project-website.com'
                                                    className="form-control mt-2"
                                                />
                                            </div>

                                            <div className="col-6 mt-3">
                                                <label htmlFor="fundingGoal">
                                                    💰 Funding Goal (in {currentNetwork?.nativeCurrency?.symbol || 'tokens'}):
                                                </label>
                                                <input
                                                    id="fundingGoal"
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={fundingGoal}
                                                    onChange={(e) => setFundingGoal(e.target.value)}
                                                    placeholder="e.g., 10.5"
                                                    style={{
                                                        width: "100%",
                                                        padding: "12px",
                                                        borderRadius: "5px",
                                                        border: "2px solid #ddd",
                                                        fontSize: "16px"
                                                    }}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Network Status */}
                                        <div className="row mt-3">
                                            <div className="col-12">
                                                {currentNetwork ? (
                                                    <div className="alert alert-success">
                                                        🌐 Connected to: <strong>{currentNetwork.chainName}</strong>
                                                        <br />
                                                        💰 Native Currency: <strong>{currentNetwork.nativeCurrency.symbol}</strong>
                                                        <br />
                                                        📄 Contract: <strong>{contractAddress || "Not deployed"}</strong>
                                                    </div>
                                                ) : (
                                                    <div className="alert alert-warning">
                                                        ⚠️ Please select a supported network from the header dropdown (BSC Testnet recommended)
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Token Requirements Section */}
                                        {currentNetwork && contractAddress && (
                                            <div className="row mt-3">
                                                <div className="col-12">
                                                    <div className="card">
                                                        <div className="card-header d-flex justify-content-between align-items-center">
                                                            <h5 className="card-title mb-0">
                                                                🪙 Token Requirements for Proposal Creation
                                                            </h5>
                                                            <button
                                                                type="button"
                                                                onClick={fetchTokenRequirements}
                                                                className="btn btn-sm btn-outline-primary"
                                                                title="Refresh token balance"
                                                            >
                                                                🔄 Refresh
                                                            </button>
                                                        </div>
                                                        <div className="card-body">
                                                            <div className="row">
                                                                <div className="col-md-6">
                                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                                        <span>📝 Required for Proposal:</span>
                                                                        <strong className="text-primary">
                                                                            {minTokensForProposal ?
                                                                                `${formatTokenAmount(minTokensForProposal)} ${tokenSymbol}` :
                                                                                "Loading..."
                                                                            }
                                                                        </strong>
                                                                    </div>
                                                                </div>
                                                                <div className="col-md-6">
                                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                                        <span>💰 Your Balance:</span>
                                                                        <strong className={hasEnoughTokensForProposal() ? "text-success" : "text-danger"}>
                                                                            {userTokenBalance ?
                                                                                `${formatTokenAmount(userTokenBalance)} ${tokenSymbol}` :
                                                                                "Loading..."
                                                                            }
                                                                        </strong>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Token Status Indicator */}
                                                            {minTokensForProposal && userTokenBalance && (
                                                                <div className="mt-3">
                                                                    {hasEnoughTokensForProposal() ? (
                                                                        <div className="alert alert-success mb-0">
                                                                            ✅ <strong>Eligibility Status:</strong> You have enough {tokenSymbol} tokens to create a proposal!
                                                                        </div>
                                                                    ) : (
                                                                        <div className="alert alert-danger mb-0">
                                                                            ❌ <strong>Insufficient Tokens:</strong> You need {formatTokenAmount(minTokensForProposal - userTokenBalance)} more {tokenSymbol} tokens to create a proposal.
                                                                            <br />
                                                                            <small className="text-muted">
                                                                                💡 <strong>Tip:</strong> {tokenSymbol} tokens are required for governance participation. You can earn them by contributing to the ecosystem or purchase them on supported exchanges.
                                                                            </small>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Additional Information */}
                                                            <div className="mt-3">
                                                                <small className="text-muted">
                                                                    📋 <strong>About Token Requirements:</strong><br />
                                                                    • Proposal Creation: Requires {tokenSymbol} tokens to prevent spam and ensure serious proposals<br />
                                                                    • Voting: Any {tokenSymbol} token holder can participate in voting<br />
                                                                    • Voting Power: Your voting power is proportional to your token balance
                                                                </small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Submit Button */}
                                        <div className="row mt-3">
                                            <div className="col-12">
                                                <button
                                                    type="button"
                                                    onClick={createProject}
                                                    disabled={loading || !currentNetwork || !contractAddress || !hasEnoughTokensForProposal()}
                                                    className={`btn ${loading ? 'btn-secondary' : hasEnoughTokensForProposal() ? 'btn-primary' : 'btn-danger'} btn-lg w-100`}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                            Creating Proposal...
                                                        </>
                                                    ) : !hasEnoughTokensForProposal() && userTokenBalance !== null ? (
                                                        <>
                                                            🚫 Insufficient {tokenSymbol} Tokens
                                                        </>
                                                    ) : (
                                                        <>
                                                            🚀 Create Proposal
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </main>
                        <Footer />
                    </div>
                </div>
            </div>
        </>
    );
}

export default CreateProposal
