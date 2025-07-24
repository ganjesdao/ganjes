import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast, ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // CSS for toast notifications
import NetworkSwitcher from "../../components/NetworkSwitcher";
import { getContractAddress, getGasPrice, isTestnet } from "../../utils/networks";
const contractABI = [
  // Relevant ABI for createProposal (creates a project)
  {
    inputs: [
      { name: "_description", type: "string" },
      { name: "_projectName", type: "string" },
      { name: "_projectUrl", type: "string" },
      { name: "_fundingGoal", type: "uint256" },
    ],
    name: "createProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Add other ABI entries as needed
];


function ProposalCreate() {
  // State for form inputs
  const [description, setDescription] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [fundingGoal, setFundingGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState("");

  // Handle network change from NetworkSwitcher
  const handleNetworkChange = (network) => {
    setCurrentNetwork(network);
    if (network) {
      const address = getContractAddress(network.chainId);
      setContractAddress(address);
      
      if (address === "0x0000000000000000000000000000000000000000") {
        toast.warn(`⚠️ No contract deployed on ${network.chainName} yet!`);
      } else {
        toast.success(`📍 Connected to ${network.chainName}`);
      }
    }
  };

  // Check if current network is supported
  const isNetworkSupported = () => {
    return currentNetwork && contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000";
  };

  // Function to create a project
  const createProject = async (e) => {
    e.preventDefault(); // Prevent form submission refresh

    // Input validation
    if (!description || description.trim() === "") {
      toast.error("Description cannot be empty!");
      return;
    }
    if (!projectName || projectName.trim() === "") {
      toast.error("Project name cannot be empty!");
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
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

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
    <div style={{ padding: "20px", maxWidth: "700px", margin: "0 auto" }}>
      {/* Header with Network Switcher */}
      <div style={{ 
        backgroundColor: currentNetwork ? currentNetwork.color : "#6c757d", 
        color: "white", 
        padding: "20px", 
        borderRadius: "15px", 
        marginBottom: "20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h2 style={{ margin: 0 }}>🚀 Create New Project</h2>
          <NetworkSwitcher 
            onNetworkChange={handleNetworkChange}
            selectedNetwork={currentNetwork}
            showTestnets={true}
          />
        </div>
        
        {currentNetwork && contractAddress && (
          <div style={{ fontSize: "14px", opacity: 0.9 }}>
            <p style={{ margin: "5px 0" }}>
              {currentNetwork.icon} <strong>{currentNetwork.chainName}</strong> | 
              Contract: {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
            </p>
          </div>
        )}
      </div>

      {/* Network Status Warnings */}
      {!currentNetwork && (
        <div style={{
          backgroundColor: "#ffeeba",
          color: "#856404",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
          textAlign: "center"
        }}>
          <p style={{ margin: 0 }}>⚠️ Please select a network to create projects</p>
        </div>
      )}

      {currentNetwork && !isNetworkSupported() && (
        <div style={{
          backgroundColor: "#f8d7da",
          color: "#721c24",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
          textAlign: "center"
        }}>
          <p style={{ margin: 0 }}>
            ❌ No contract deployed on <strong>{currentNetwork.chainName}</strong> yet!
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>
            Switch to BSC Testnet which has a deployed contract.
          </p>
        </div>
      )}

      {/* Faucet Info for Testnets */}
      {currentNetwork && isTestnet(currentNetwork.chainId) && (
        <div style={{
          backgroundColor: "#d4edda",
          color: "#155724",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px"
        }}>
          <p style={{ margin: "0 0 10px 0" }}>
            💡 <strong>Need test {currentNetwork.nativeCurrency.symbol}?</strong>
          </p>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Get free test tokens from: <a href={currentNetwork.faucetUrl || '#'} target="_blank" rel="noopener noreferrer">
              {currentNetwork.chainName} Faucet
            </a>
          </p>
        </div>
      )}

      <form onSubmit={createProject}>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="projectName">📋 Project Name:</label>
          <input
            id="projectName"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter your project name"
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
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="description">📝 Project Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your project, its goals, and how funding will be used..."
            style={{ 
              width: "100%", 
              height: "120px", 
              padding: "12px",
              borderRadius: "5px",
              border: "2px solid #ddd",
              fontSize: "16px",
              resize: "vertical"
            }}
            required
          />
        </div>
        
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="projectUrl">🔗 Project URL:</label>
          <input
            id="projectUrl"
            type="url"
            value={projectUrl}
            onChange={(e) => setProjectUrl(e.target.value)}
            placeholder="https://your-project-website.com"
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
        
        <div style={{ marginBottom: "15px" }}>
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
          <small style={{ color: "#666", fontSize: "14px" }}>
            💡 Enter the amount in {currentNetwork?.nativeCurrency?.symbol || 'tokens'} ({currentNetwork?.nativeCurrency?.name || 'native currency'}) you need for your project
          </small>
        </div>
        <button
          type="submit"
          disabled={loading || !isNetworkSupported()}
          style={{
            width: "100%",
            padding: "15px 20px",
            backgroundColor: loading || !isNetworkSupported() ? "#ccc" : (currentNetwork?.color || "#f093fb"),
            background: loading || !isNetworkSupported() ? "#ccc" : `linear-gradient(45deg, ${currentNetwork?.color || "#f093fb"}, ${currentNetwork?.color || "#f5576c"})`,
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: loading || !isNetworkSupported() ? "not-allowed" : "pointer",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            if (!loading && isNetworkSupported()) {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = `0 8px 25px ${currentNetwork?.color || '#f093fb'}40`;
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && isNetworkSupported()) {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }
          }}
        >
          {loading 
            ? `🔄 Creating Project on ${currentNetwork?.chainName || 'Network'}...` 
            : isNetworkSupported() 
              ? "🚀 Create Project" 
              : !currentNetwork 
                ? "❌ Select Network First"
                : "❌ Contract Not Available"
          }
        </button>
      </form>

      {/* Contract & Network Info */}
      {currentNetwork && (
        <div style={{
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          fontSize: "14px",
          color: "#666"
        }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>📋 Network Information</h4>
          <p style={{ margin: "5px 0" }}>
            <strong>Network:</strong> {currentNetwork.icon} {currentNetwork.chainName} (Chain ID: {parseInt(currentNetwork.chainId, 16)})
          </p>
          <p style={{ margin: "5px 0" }}>
            <strong>Currency:</strong> {currentNetwork.nativeCurrency.symbol} ({currentNetwork.nativeCurrency.name})
          </p>
          {contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000" && (
            <>
              <p style={{ margin: "5px 0" }}>
                <strong>Contract:</strong> {contractAddress}
              </p>
              <p style={{ margin: "5px 0" }}>
                <strong>Explorer:</strong> <a href={`${currentNetwork.blockExplorerUrls[0]}/address/${contractAddress}`} target="_blank" rel="noopener noreferrer">
                  View Contract
                </a>
              </p>
            </>
          )}
          {isTestnet(currentNetwork.chainId) && currentNetwork.faucetUrl && (
            <p style={{ margin: "5px 0" }}>
              <strong>Faucet:</strong> <a href={currentNetwork.faucetUrl} target="_blank" rel="noopener noreferrer">
                Get Test Tokens
              </a>
            </p>
          )}
        </div>
      )}

      <ToastContainer 
        position="top-right" 
        autoClose={8000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}

export default ProposalCreate;