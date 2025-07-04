import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { daoABI } from '../../Auth/Abi';  // adjust path if needed
import Header from './component/Header';
import Auth from '../../Auth/Auth';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import { toast } from 'react-toastify';
import { getContractAddress, getGasPrice, isTestnet } from '../../utils/networks';


function CreateProposal() {
    const [description, setDescription] = useState("");
    const [projectName, setProjectName] = useState("");
    const [projectUrl, setProjectUrl] = useState("");
    const [fundingGoal, setFundingGoal] = useState("");
    const [loading, setLoading] = useState(false);
    const [currentNetwork, setCurrentNetwork] = useState(null);
    const [contractAddress, setContractAddress] = useState("");
    const [isToggle, setIsToggle] = useState(false);
    const authToken = sessionStorage.getItem('authToken');

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
              📄 <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{color: 'white', textDecoration: 'underline'}}>
                View transaction on {currentNetwork.chainName}
              </a>
            </div>
          );
          
          // Reset form
          setDescription("");
          setProjectName("");
          setProjectUrl("");
          setFundingGoal("");
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
                                    Proposal Management
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
                                                    style={{  width: "100%",height: "120px", padding: "12px",
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

                                        {/* Submit Button */}
                                        <div className="row mt-3">
                                            <div className="col-12">
                                                <button
                                                    type="button"
                                                    onClick={createProject}
                                                    disabled={loading || !currentNetwork || !contractAddress}
                                                    className={`btn ${loading ? 'btn-secondary' : 'btn-primary'} btn-lg w-100`}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                            Creating Proposal...
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
