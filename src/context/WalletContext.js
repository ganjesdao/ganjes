import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getNetworkByChainId, getContractAddress, getRpcUrl, NETWORKS } from '../utils/networks';
import { daoABI } from '../Auth/Abi';
import { toast } from 'react-toastify';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  // Network providers for reading data (no wallet needed)
  const [networkProviders, setNetworkProviders] = useState(new Map());
  const [readOnlyContract, setReadOnlyContract] = useState(null);
  
  // Wallet-specific states (only for execution)
  const [walletProvider, setWalletProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  
  // Current network state
  const [currentNetwork, setCurrentNetwork] = useState(NETWORKS.BSC_TESTNET); // Default network
  const [contractAddress, setContractAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Data state
  const [blockchainData, setBlockchainData] = useState({
    proposals: [],
    userProposals: [],
    daoBalance: '0',
    minInvestment: '0',
    lastFetched: null
  });
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataCache, setDataCache] = useState(new Map());

  // Initialize network providers for all supported networks
  const initializeNetworkProviders = useCallback(() => {
    const providers = new Map();
    
    Object.values(NETWORKS).forEach(network => {
      if (network.rpcUrls && network.rpcUrls.length > 0) {
        try {
          const rpcUrl = getRpcUrl(network.chainId);
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          providers.set(network.chainId, provider);
        } catch (error) {
          console.warn(`Failed to initialize provider for ${network.chainName}:`, error);
        }
      }
    });
    
    setNetworkProviders(providers);
    return providers;
  }, []);

  // Get network provider (no wallet needed)
  const getNetworkProvider = useCallback((chainId = null) => {
    const targetChainId = chainId || currentNetwork?.chainId || NETWORKS.BSC_TESTNET.chainId;
    return networkProviders.get(targetChainId) || networkProviders.get(NETWORKS.BSC_TESTNET.chainId);
  }, [networkProviders, currentNetwork]);

  // Initialize read-only contract using network provider
  const initializeReadOnlyContract = useCallback((chainId = null) => {
    const targetChainId = chainId || currentNetwork?.chainId || NETWORKS.BSC_TESTNET.chainId;
    const contractAddr = getContractAddress(targetChainId);
    const provider = getNetworkProvider(targetChainId);

    if (!contractAddr || !provider || contractAddr === '0x0000000000000000000000000000000000000000') {
      setReadOnlyContract(null);
      setContractAddress('');
      return null;
    }

    try {
      const contract = new ethers.Contract(contractAddr, daoABI, provider);
      setReadOnlyContract(contract);
      setContractAddress(contractAddr);
      return contract;
    } catch (error) {
      console.error('❌ Failed to initialize read-only contract:', error);
      setReadOnlyContract(null);
      return null;
    }
  }, [currentNetwork, getNetworkProvider]);

  // Fetch data using network provider (no wallet needed)
  const fetchBlockchainData = useCallback(async (targetChainId = null) => {
    if (isDataLoading) return;

    const chainId = targetChainId || currentNetwork?.chainId || NETWORKS.BSC_TESTNET.chainId;
    const cacheKey = `${chainId}-data`;
    const CACHE_DURATION = 120000; // 2 minutes cache
    
    // Check cache first
    const cached = dataCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      setBlockchainData(prev => ({ ...prev, ...cached.data }));
      return;
    }

    const contract = readOnlyContract || initializeReadOnlyContract(chainId);
    if (!contract) return;

    try {
      setIsDataLoading(true);

      // Fetch essential data using network provider
      const [proposalIdsResult] = await Promise.allSettled([
        contract.getAllProposalIds()
      ]);

      if (proposalIdsResult.status !== 'fulfilled' || !proposalIdsResult.value?.length) {
        const data = { proposals: [], userProposals: [], lastFetched: Date.now() };
        setBlockchainData(prev => ({ ...prev, ...data }));
        dataCache.set(cacheKey, { data, timestamp: Date.now() });
        return;
      }

      // Fetch basic proposal data (limit to 20 for performance)
      const proposalPromises = proposalIdsResult.value.slice(0, 20).map(async (id) => {
        try {
          const proposal = await contract.getProposal(id);
          return {
            id: Number(id),
            proposer: proposal.proposer,
            description: proposal.description || `Proposal #${id}`,
            projectName: proposal.projectName || proposal.description?.slice(0, 50) + '...' || `Proposal #${id}`,
            fundingGoal: ethers.formatEther(proposal.fundingGoal || '0'),
            totalVotesFor: ethers.formatEther(proposal.totalVotesFor || '0'),
            totalVotesAgainst: ethers.formatEther(proposal.totalVotesAgainst || '0'),
            votersFor: Number(proposal.votersFor || 0),
            votersAgainst: Number(proposal.votersAgainst || 0),
            endTime: Number(proposal.endTime) || 0,
            executed: Boolean(proposal.executed),
            passed: Boolean(proposal.passed),
            rejected: Boolean(proposal.rejected),
            status: proposal.executed ? (proposal.passed ? 'PASSED' : 'FAILED') 
              : proposal.rejected ? 'REJECTED' 
              : ((Number(proposal.endTime) * 1000) > Date.now() ? 'ACTIVE' : 'PENDING')
          };
        } catch {
          return null;
        }
      });

      const proposals = (await Promise.allSettled(proposalPromises))
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value)
        .sort((a, b) => b.id - a.id);

      const data = {
        proposals,
        userProposals: account ? proposals.filter(p => p.proposer.toLowerCase() === account.toLowerCase()) : [],
        lastFetched: Date.now()
      };

      // Cache the result
      dataCache.set(cacheKey, { data, timestamp: Date.now() });
      setBlockchainData(prev => ({ ...prev, ...data }));

    } catch (error) {
      console.error('❌ Error fetching blockchain data:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, [isDataLoading, dataCache, account, currentNetwork, readOnlyContract, initializeReadOnlyContract]);

  // Fetch additional data (DAO balance, min investment) when needed
  const fetchAdditionalData = useCallback(async (targetChainId = null) => {
    const chainId = targetChainId || currentNetwork?.chainId || NETWORKS.BSC_TESTNET.chainId;
    const contract = readOnlyContract || initializeReadOnlyContract(chainId);
    if (!contract) return;

    try {
      const [minInvestmentResult, daoStatsResult] = await Promise.allSettled([
        contract.minInvestmentAmount(),
        contract.getDAOStats().catch(() => ({ contractBalance: '0' }))
      ]);

      const minInvestment = minInvestmentResult.status === 'fulfilled' 
        ? ethers.formatEther(minInvestmentResult.value || '0') : '0';
      
      const daoBalance = daoStatsResult.status === 'fulfilled' 
        ? ethers.formatEther(daoStatsResult.value.contractBalance || '0') : '0';

      setBlockchainData(prev => ({ ...prev, daoBalance, minInvestment }));
    } catch (error) {
      console.error('❌ Error fetching additional data:', error);
    }
  }, [currentNetwork, readOnlyContract, initializeReadOnlyContract]);

  // Connect wallet ONLY for execution (no network switching)
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask!');
      return false;
    }

    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Set wallet-specific data (ONLY for execution)
        setWalletProvider(provider);
        setSigner(signer);
        setAccount(accounts[0]);
        
        // Just refresh user proposals with new account (no network change)
        if (blockchainData.proposals.length > 0) {
          const userProposals = blockchainData.proposals.filter(
            p => p.proposer.toLowerCase() === accounts[0].toLowerCase()
          );
          setBlockchainData(prev => ({ ...prev, userProposals }));
        }

        toast.success('Wallet connected for transactions!');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [blockchainData.proposals]);

  // Get execution contract (with wallet signer for transactions)
  const getExecutionContract = useCallback(() => {
    if (!signer || !contractAddress) {
      toast.error('Please connect wallet first');
      return null;
    }
    return new ethers.Contract(contractAddress, daoABI, signer);
  }, [signer, contractAddress]);

  // Switch network (NO wallet needed - just change network provider and fetch data)
  const switchNetwork = useCallback(async (network) => {
    try {
      setIsDataLoading(true);
      
      // Clear cache for network switch
      setDataCache(new Map());
      
      // Update to selected network using networks.js data
      setCurrentNetwork(network);
      
      // Initialize read-only contract for new network
      await initializeReadOnlyContract(network.chainId);
      
      // Fetch data using new network provider
      await fetchBlockchainData(network.chainId);
      
      // Update contract address for future execution
      setContractAddress(getContractAddress(network.chainId));
      
      toast.success(`Switched to ${network.chainName}`);
    } catch (error) {
      console.error('Error switching network:', error);
      toast.error('Failed to switch network');
    } finally {
      setIsDataLoading(false);
    }
  }, [initializeReadOnlyContract, fetchBlockchainData]);

  // Get available networks from networks.js
  const getAvailableNetworks = useCallback(() => {
    return Object.values(NETWORKS);
  }, []);

  // Disconnect wallet (keep network data)
  const disconnectWallet = useCallback(() => {
    setWalletProvider(null);
    setSigner(null);
    setAccount('');
    // Keep network data and read-only contract
    // Only clear user-specific data
    setBlockchainData(prev => ({ ...prev, userProposals: [] }));
    toast.info('Wallet disconnected');
  }, []);

  // Handle account changes (only if wallet was already connected)
  const handleAccountsChanged = useCallback(async (accounts) => {
    if (accounts.length > 0 && signer) {
      // Only update if wallet was already connected
      setAccount(accounts[0]);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const newSigner = await provider.getSigner();
        
        setWalletProvider(provider);
        setSigner(newSigner);
        
        // Update user proposals with new account
        if (blockchainData.proposals.length > 0) {
          const userProposals = blockchainData.proposals.filter(
            p => p.proposer.toLowerCase() === accounts[0].toLowerCase()
          );
          setBlockchainData(prev => ({ ...prev, userProposals }));
        }
      } catch (error) {
        console.error('Error with account change:', error);
      }
    } else {
      disconnectWallet();
    }
  }, [disconnectWallet, blockchainData.proposals, signer]);

  // Handle network changes from MetaMask (NO wallet connection required)
  const handleChainChanged = useCallback(async (chainId) => {
    const network = getNetworkByChainId(chainId);
    
    if (!network) {
      toast.warning(`Network ${chainId} not supported. Please select a supported network.`);
      return;
    }

    // Switch network independently (no wallet needed)
    await switchNetwork(network);
  }, [switchNetwork]);

  // Initialize network providers and read-only contract on mount
  useEffect(() => {
    const initializeApp = () => {
      initializeNetworkProviders();
      const defaultContract = initializeReadOnlyContract();
      
      // Fetch initial data without wallet connection
      if (defaultContract) {
        fetchBlockchainData();
      }

      // Check if wallet is already connected (only for account info, no network switch)
      if (window.ethereum) {
        window.ethereum.request({ method: 'eth_accounts' })
          .then(accounts => {
            if (accounts.length > 0) {
              // Wallet was already connected, just set account info
              setAccount(accounts[0]);
              
              // Set up wallet provider for execution
              const provider = new ethers.BrowserProvider(window.ethereum);
              provider.getSigner().then(signer => {
                setWalletProvider(provider);
                setSigner(signer);
                
                // Update user proposals with existing account
                setTimeout(() => {
                  if (blockchainData.proposals.length > 0) {
                    const userProposals = blockchainData.proposals.filter(
                      p => p.proposer.toLowerCase() === accounts[0].toLowerCase()
                    );
                    setBlockchainData(prev => ({ ...prev, userProposals }));
                  }
                }, 1000); // Wait for initial data load
              }).catch(error => console.warn('Failed to get signer:', error));
            }
          })
          .catch(error => console.warn('Failed to check wallet connection:', error));
      }
    };

    if (document.readyState === 'complete') {
      initializeApp();
    } else {
      window.addEventListener('load', initializeApp);
      return () => window.removeEventListener('load', initializeApp);
    }
  }, []);

  // Event listeners for wallet changes
  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [handleAccountsChanged, handleChainChanged]);

  const value = {
    // Core state
    provider: getNetworkProvider(), // Network provider for reading
    walletProvider, // Wallet provider for execution
    signer, // Only available when wallet connected
    account,
    currentNetwork,
    contractAddress,
    isConnecting,
    isConnected: !!account,
    
    // Contracts
    daoContract: readOnlyContract, // Read-only contract using network provider
    getExecutionContract, // Function to get contract with wallet signer
    
    // Data
    blockchainData,
    isDataLoading,

    // Actions
    connectWallet, // Only for execution
    disconnectWallet,
    switchNetwork, // Independent network switching
    getAvailableNetworks, // Get all networks from networks.js
    fetchBlockchainData,
    fetchAdditionalData,
    refreshBlockchainData: () => fetchBlockchainData(currentNetwork?.chainId)
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext;