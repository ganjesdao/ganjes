import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { daoABI } from '../../Auth/Abi';  // adjust path if needed
import Header from './component/Header';
import Auth from '../../Auth/Auth';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import { toast } from 'react-toastify';
import { getContractAddress, getRpcUrl, isTestnet } from '../../utils/networks';
import { tokenABI } from '../../utils/Tokenabi';

// ERC20 ABI for token operations

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
    const [proposalDeposit, setProposalDeposit] = useState(null);
    const [requirements, setRequirements] = useState(null);
    const [validationErrors, setValidationErrors] = useState([]);
    const [userAddress, setUserAddress] = useState("");
    const authToken = sessionStorage.getItem('authToken');
    const governanceTokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;

    // Handle network change from Header component
    const handleNetworkChange = (network) => {
        setCurrentNetwork(network);
        if (network) {
            const address = getContractAddress(network.chainId);
            setContractAddress(address);

            // console.log(`Contract address: ${address}`);
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

    // Enhanced validation function based on Node.js script
    const validateInputs = (description, projectName, projectUrl, fundingGoal) => {
        const errors = [];

        if (!description || description.trim().length < 10) {
            errors.push("Description must be at least 10 characters long");
        }

        if (!projectName || projectName.trim().length < 2) {
            errors.push("Project name must be at least 2 characters long");
        }

        if (!projectUrl || !projectUrl.includes('.')) {
            errors.push("Project URL must be a valid URL");
        }

        const fundingGoalNum = parseFloat(fundingGoal);
        if (isNaN(fundingGoalNum) || fundingGoalNum <= 0) {
            errors.push("Funding goal must be a positive number");
        }

        if (fundingGoalNum < 10) {
            errors.push("Funding goal must be at least 10 tokens");
        }

        if (fundingGoalNum > 1000000) {
            errors.push("Funding goal cannot exceed 1,000,000 tokens");
        }

        return errors;
    };

    // Function to fetch comprehensive proposal requirements
    const fetchTokenRequirements = async () => {
        try {
            console.log("Fetching token requirements...", contractAddress);
            if (!window.ethereum || !contractAddress || !governanceTokenAddress) return;


            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            setUserAddress(address);

            console.log("Connected to address:", address);


            // Get DAO contract instance
            const contract = new ethers.Contract(contractAddress, daoABI, provider);


            console.log("✅ Connected to DAO contract", contract);


            // Get governance token contract instance
            const tokenContractInstance = new ethers.Contract(governanceTokenAddress, tokenABI, provider);
            setTokenContract(tokenContractInstance);

            // Fetch comprehensive requirements
            const minTokens = await contract.MIN_TOKENS_FOR_PROPOSAL();
            setMinTokensForProposal(minTokens);

            console.log(`Proposal Token fee: ${ethers.formatEther(minTokens)} tokens`);

            const deposit = await contract.PROPOSAL_CREATION_FEE();

            console.log(`Proposal Creation Fee: ${ethers.formatEther(deposit)} tokens`);
            setProposalDeposit(deposit);

            const balance = await tokenContractInstance.balanceOf(address);

            console.log(`User's token balance: ${formatTokenAmount(balance)} ${tokenSymbol}`);

            setUserTokenBalance(balance);

            // Check proposal requirements (if method exists)
            try {
                const reqCheck = await contract.checkProposalRequirements(address);
                setRequirements(reqCheck);
            } catch (error) {
                console.warn("checkProposalRequirements method not available:", error);
                // Fallback: create basic requirements check
                const allowance = await tokenContractInstance.allowance(address, contractAddress);
                const requirementsObj = {
                    canCreateProposal: balance >= minTokens && allowance >= deposit,
                    hasMinTokens: balance >= minTokens,
                    hasDepositTokens: balance >= deposit,
                    hasAllowance: allowance >= deposit,
                    cooldownPassed: true, // Assume true if we can't check
                    belowMaxProposals: true, // Assume true if we can't check
                    statusMessage: balance >= minTokens ? (allowance >= deposit ? "Ready to create proposal" : "Need token approval") : "Insufficient tokens"
                };

                setRequirements(requirementsObj);
            }

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
            // toast.error("Failed to fetch token requirements");
        }
    };

    // Check if user has enough tokens for proposal creation (enhanced with requirements check)
    const hasEnoughTokensForProposal = () => {
        return requirements?.hasMinTokens || (userTokenBalance && minTokensForProposal && userTokenBalance >= minTokensForProposal);
    };

    // Format token amount for display
    const formatTokenAmount = (amount) => {
        if (!amount) return "0";
        return ethers.formatUnits(amount, tokenDecimals);
    };

    // Effect to fetch token requirements when network/contract changes
    useEffect(() => {

        if (currentNetwork && contractAddress && governanceTokenAddress) {


            // console.log(`Using contract address: ${contractAddress}`);
            fetchTokenRequirements();

        }
    }, [currentNetwork, contractAddress, governanceTokenAddress]);

    const createProject = async (e) => {
        e.preventDefault(); // Prevent form submission refresh

        // console.log("🚀 Ganjes DAO Proposal Creation Tool");
        // console.log("=====================================\n");
        // console.log("📝 Using account:", userAddress);

        // Enhanced input validation
        const errors = validateInputs(description, projectName, projectUrl, fundingGoal);
        setValidationErrors(errors);

        if (errors.length > 0) {
            // console.log("❌ Validation errors:");
            errors.forEach(error => {
                // console.log(`  - ${error}`);
                toast.error(error);
            });
            return;
        }

        // Check if we need approval first
        if (!requirements?.hasAllowance && requirements?.hasMinTokens && requirements?.hasDepositTokens) {
            // Allow approval process to continue
            // console.log("🔐 User needs to approve tokens first");
        } else if (!requirements?.canCreateProposal) {
            toast.error(`❌ Cannot create proposal: ${requirements?.statusMessage || 'Requirements not met'}`);
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


            // Check and handle token approval if needed
            if (!requirements?.hasAllowance) {
                // console.log("\n🔐 Approving DAO to spend tokens...");
                toast.info("🔐 Approving DAO to spend 100 tokens...");
                const approveTx = await tokenContract.connect(signer).approve(contractAddress, proposalDeposit);
                // console.log("📄 Approval transaction sent:", approveTx.hash);
                await approveTx.wait();
                // console.log("✅ Approval transaction confirmed\n");
                toast.success("✅ Token approval confirmed! You can now create proposals.");

                // Refresh requirements after approval
                await fetchTokenRequirements();
                setLoading(false);
                return; // Stop here, user needs to click create again
            }

            // Log current requirements for debugging
            // console.log("📋 Current requirements:", requirements);

            // Pre-flight checks before creating proposal
            const currentBalance = await tokenContract.balanceOf(userAddress);
            const currentAllowance = await tokenContract.allowance(userAddress, contractAddress);

            // console.log("🔍 Pre-flight checks:");
            // console.log("  - User Balance:", ethers.formatEther(currentBalance), tokenSymbol);
            // console.log("  - Current Allowance:", ethers.formatEther(currentAllowance), tokenSymbol);
            // console.log("  - Required Deposit:", ethers.formatEther(proposalDeposit), tokenSymbol);
            // console.log("  - Min Tokens Required:", ethers.formatEther(minTokensForProposal), tokenSymbol);

            // Check if user still has enough balance
            if (currentBalance < minTokensForProposal) {
                throw new Error(`Insufficient token balance. Required: ${ethers.formatEther(minTokensForProposal)} ${tokenSymbol}, Current: ${ethers.formatEther(currentBalance)} ${tokenSymbol}`);
            }

            // Check if allowance is sufficient
            if (currentAllowance < proposalDeposit) {
                throw new Error(`Insufficient token allowance. Required: ${ethers.formatEther(proposalDeposit)} ${tokenSymbol}, Current: ${ethers.formatEther(currentAllowance)} ${tokenSymbol}`);
            }

            // Display proposal summary before creation
            // console.log("\n📋 Proposal Summary:");
            // console.log("  - Project Name:", projectName);
            // console.log("  - Project URL:", projectUrl);
            // console.log("  - Funding Goal:", ethers.formatEther(fundingGoalInWei), "tokens");
            // console.log("  - Required Deposit:", ethers.formatEther(proposalDeposit), "tokens");
            // console.log("  - Description:", description.substring(0, 100) + (description.length > 100 ? "..." : ""));

            toast.info("⏳ Creating proposal...");

            // Try to estimate gas first
            let gasEstimate;
            try {
                gasEstimate = await contract.createProposal.estimateGas(
                    description,
                    projectName,
                    projectUrl,
                    fundingGoalInWei
                );
                // console.log("⛽ Gas estimate:", gasEstimate.toString());
            } catch (estimateError) {
                console.error("❌ Gas estimation failed:", estimateError);
                throw new Error(`Gas estimation failed: ${estimateError.reason || estimateError.message}`);
            }

            // Call createProposal function with estimated gas + buffer
            const tx = await contract.createProposal(
                description,
                projectName,
                projectUrl,
                fundingGoalInWei,
                {
                    gasLimit: gasEstimate + (gasEstimate / 5n), // Add 20% buffer
                }
            );

            // Wait for transaction confirmation
            toast.info(`🚀 Transaction sent! Hash: ${tx.hash}`);
            toast.info(`⏳ Waiting for confirmation on ${currentNetwork.chainName}...`);

            // console.log("⏳ Waiting for transaction confirmation...");
            const receipt = await tx.wait();

            // Find ProposalCreated event
            const proposalCreatedEvent = receipt.logs.find(
                log => {
                    try {
                        const parsed = contract.interface.parseLog(log);
                        return parsed.name === "ProposalCreated";
                    } catch {
                        return false;
                    }
                }
            );

            if (proposalCreatedEvent) {
                const decodedEvent = contract.interface.parseLog(proposalCreatedEvent);
                const proposalId = decodedEvent.args.proposalId;

                // console.log("\n🎉 Proposal Created Successfully!");
                // console.log("=====================================");
                // console.log("  - Proposal ID:", proposalId.toString());
                // console.log("  - Transaction Hash:", receipt.hash);
                // console.log("  - Block Number:", receipt.blockNumber);
                // console.log("  - Gas Used:", receipt.gasUsed.toString());

                // Enhanced success notification
                const explorerUrl = `${currentNetwork.blockExplorerUrls[0]}/tx/${tx.hash}`;
                toast.success(
                    `🎉 Proposal Created Successfully! ID: ${proposalId.toString()}`
                );
                toast.info(
                    `📊 Gas used: ${receipt.gasUsed.toString()}`
                );
                toast.info(
                    <div>
                        📄 <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>
                            View transaction on {currentNetwork.chainName}
                        </a>
                    </div>
                );

                // Show next steps
                toast.info(
                    "📝 Next Steps: Share your proposal ID with potential investors and promote your project!"
                );
            } else {
                throw new Error("❌ ProposalCreated event not found in transaction receipt");
            }

            // Reset form
            setDescription("");
            setProjectName("");
            setProjectUrl("");
            setFundingGoal("");

            // Refresh token balance after successful proposal creation
            fetchTokenRequirements();
        } catch (error) {
            console.error("\n❌ Error creating proposal:", error);

            // Enhanced error handling with more specific checks
            if (error.code === 4001) {
                toast.error("❌ Transaction rejected by user!");
            } else if (error.code === 'CALL_EXCEPTION' || error.receipt?.status === 0) {
                console.error("\n💡 Transaction reverted. Common issues:");
                console.error("  - Insufficient token balance for deposit");
                console.error("  - DAO contract not approved to spend tokens");
                console.error("  - Proposal cooldown period still active");
                console.error("  - Maximum proposals per user reached");
                console.error("  - Invalid funding goal (too high/low)");
                console.error("  - Contract is paused");
                console.error("  - Invalid parameter values");

                // Check specific error messages
                const errorMsg = error.reason || error.message || 'Unknown error';
                if (errorMsg.includes('allowance') || errorMsg.includes('approved')) {
                    toast.error("❌ Token allowance issue. Please refresh and try approving tokens again.");
                } else if (errorMsg.includes('balance') || errorMsg.includes('insufficient')) {
                    toast.error("❌ Insufficient token balance for proposal deposit.");
                } else if (errorMsg.includes('cooldown') || errorMsg.includes('wait')) {
                    toast.error("❌ Proposal cooldown period active. Please wait before creating another proposal.");
                } else {
                    toast.error(`❌ Transaction reverted: ${errorMsg}`);
                }

                // Refresh requirements to get updated status
                await fetchTokenRequirements();
            } else if (error.code === 'INSUFFICIENT_FUNDS') {
                console.error("💡 You don't have enough tokens for the transaction");
                toast.error("💰 Insufficient funds for transaction fees!");
            } else if (error.code === -32000) {
                const currency = currentNetwork?.nativeCurrency?.symbol || 'tokens';
                toast.error(`⛽ Insufficient ${currency} for gas fees. ${isTestnet(currentNetwork?.chainId) ? 'Get test tokens from faucet!' : 'Add more tokens to your wallet!'}`);
            } else if (error.message.includes("insufficient funds")) {
                const currency = currentNetwork?.nativeCurrency?.symbol || 'tokens';
                toast.error(`💰 Insufficient ${currency} balance for transaction fees!`);
            } else if (error.message.includes("Gas estimation failed")) {
                toast.error(`⛽ ${error.message}`);
            } else if (error.message.includes("Insufficient token")) {
                toast.error(error.message);
            } else if (error.message.includes("network")) {
                toast.error(`🌐 Network error. Please check your ${currentNetwork?.chainName} connection!`);
            } else {
                toast.error(`❌ Failed to create proposal: ${error.message || 'Unknown error'}`);
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

                                        {/* Enhanced Requirements Section */}
                                        {currentNetwork && contractAddress && (
                                            <div className="row mt-3">
                                                <div className="col-12">
                                                    <div className="card">
                                                        <div className="card-header d-flex justify-content-between align-items-center">
                                                            <h5 className="card-title mb-0">
                                                                📋 Proposal Requirements & Status
                                                            </h5>
                                                            <button
                                                                type="button"
                                                                onClick={fetchTokenRequirements}
                                                                className="btn btn-sm btn-outline-primary"
                                                                title="Refresh requirements"
                                                            >
                                                                🔄 Refresh
                                                            </button>
                                                        </div>
                                                        <div className="card-body">
                                                            {/* Account Status */}
                                                            <div className="row mb-3">
                                                                <div className="col-12">
                                                                    <h6>💳 Account Status:</h6>
                                                                    <div className="row">
                                                                        <div className="col-md-4">
                                                                            <div className="d-flex justify-content-between">
                                                                                <span>Token Balance:</span>
                                                                                <strong className={hasEnoughTokensForProposal() ? "text-success" : "text-danger"}>
                                                                                    {userTokenBalance ? `${formatTokenAmount(userTokenBalance)} ${tokenSymbol}` : `0 ${tokenSymbol}`}
                                                                                </strong>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-md-4">
                                                                            <div className="d-flex justify-content-between">
                                                                                <span>Required Deposit:</span>
                                                                                <strong className="text-primary">
                                                                                    {proposalDeposit ? `${formatTokenAmount(proposalDeposit)} ${tokenSymbol}` : "Loading..."}
                                                                                </strong>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-md-4">
                                                                            <div className="d-flex justify-content-between">
                                                                                <span>Min Required:</span>
                                                                                <strong className="text-primary">
                                                                                    {minTokensForProposal ? `${formatTokenAmount(minTokensForProposal)} ${tokenSymbol}` : "Loading..."}
                                                                                </strong>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Requirements Checklist */}
                                                            {requirements && (
                                                                <div className="row mb-3">
                                                                    <div className="col-12">
                                                                        <h6>📋 Proposal Requirements:</h6>
                                                                        <div className="row">
                                                                            <div className="col-md-6">
                                                                                <div className="d-flex align-items-center mb-2">
                                                                                    <span className={`me-2 ${requirements.canCreateProposal ? 'text-success' : 'text-danger'}`}>
                                                                                        {requirements.canCreateProposal ? '✅ Confirm Proposal' : '✅ Can Create Proposal'}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="d-flex align-items-center mb-2">
                                                                                    <span className={`me-2 ${requirements.hasMinTokens ? 'text-success' : 'text-danger'}`}>
                                                                                        {requirements.hasMinTokens ? '✅' : '❌'}
                                                                                    </span>
                                                                                    <span>Has Min Tokens</span>
                                                                                </div>
                                                                                <div className="d-flex align-items-center mb-2">
                                                                                    <span className={`me-2 ${requirements.hasDepositTokens ? 'text-success' : 'text-danger'}`}>
                                                                                        {requirements.hasDepositTokens ? '✅' : '❌'}
                                                                                    </span>
                                                                                    <span>Has Deposit Tokens</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="col-md-6">
                                                                                <div className="d-flex align-items-center mb-2">
                                                                                    <span className={`me-2 ${requirements.hasAllowance ? 'text-success' : 'text-warning'}`}>
                                                                                        {requirements.hasAllowance ? '✅' : '⚠️'}
                                                                                    </span>
                                                                                    <span>Has Allowance</span>
                                                                                </div>
                                                                                <div className="d-flex align-items-center mb-2">
                                                                                    <span className={`me-2 ${requirements.cooldownPassed ? 'text-success' : 'text-warning'}`}>
                                                                                        {requirements.cooldownPassed ? '✅' : '⏰'}
                                                                                    </span>
                                                                                    <span>Cooldown Passed</span>
                                                                                </div>
                                                                                <div className="d-flex align-items-center mb-2">
                                                                                    <span className={`me-2 ${requirements.belowMaxProposals ? 'text-success' : 'text-warning'}`}>
                                                                                        {requirements.belowMaxProposals ? '✅' : '🚫'}
                                                                                    </span>
                                                                                    <span>Below Max Proposals</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="alert alert-info mt-2 mb-0">
                                                                            <strong>Status:</strong> {requirements.statusMessage}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Help Section */}
                                                            <div className="mt-3">
                                                                <div className="alert alert-light mb-0">
                                                                    <h6 className="alert-heading">💡 Proposal Guidelines:</h6>
                                                                    <ul className="mb-0" style={{ fontSize: '14px' }}>
                                                                        <li><strong>Minimum:</strong> 10 tokens funding goal</li>
                                                                        <li><strong>Maximum:</strong> 1,000,000 tokens funding goal</li>
                                                                        <li><strong>Description:</strong> At least 10 characters</li>
                                                                        <li><strong>Project Name:</strong> At least 2 characters</li>
                                                                        <li><strong>URL:</strong> Must be a valid website link</li>
                                                                        <li><strong>Deposit:</strong> Refunded if proposal fails to pass</li>
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Submit Button */}
                                        <div className="row mt-3">
                                            <div className="col-12">
                                                {/* Show approval button if needed */}
                                                {requirements && !requirements.hasAllowance && requirements.hasMinTokens && requirements.hasDepositTokens ? (
                                                    <button
                                                        type="button"
                                                        onClick={createProject}
                                                        disabled={loading || !currentNetwork || !contractAddress}
                                                        className={`btn ${loading ? 'btn-secondary' : 'btn-warning'} btn-lg w-100`}
                                                    >
                                                        {loading ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                                Approving Tokens...
                                                            </>
                                                        ) : (
                                                            <>
                                                                🔐 Create Proposal
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={createProject}
                                                        disabled={loading || !currentNetwork || !contractAddress || !requirements?.canCreateProposal}
                                                        className={`btn ${loading ? 'btn-secondary' : requirements?.canCreateProposal ? 'btn-primary' : 'btn-danger'} btn-lg w-100`}
                                                    >
                                                        {loading ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                                Approve Proposal...
                                                            </>
                                                        ) : !requirements?.canCreateProposal && requirements ? (
                                                            <>
                                                                🚫 {requirements.statusMessage || 'Requirements Not Met'}
                                                            </>
                                                        ) : (
                                                            <>
                                                                🚀 Create Proposal
                                                            </>
                                                        )}
                                                    </button>
                                                )}
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
