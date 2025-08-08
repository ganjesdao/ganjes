import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getNetworkByChainId, getContractAddress } from '../utils/networks';
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
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize wallet connection on window load
  const initializeWallet = useCallback(async () => {
    if (!window.ethereum || isInitialized) return;

    try {
      setIsConnecting(true);

      // Check if already connected
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });

      if (accounts.length > 0) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const account = await signer.getAddress();

        // Get current network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const network = getNetworkByChainId(chainId);
        const address = getContractAddress(chainId);

        setProvider(provider);
        setSigner(signer);
        setAccount(account);
        setCurrentNetwork(network);
        setContractAddress(address);

        // console.log('Wallet auto-connected:', account);
        // console.log('Network:', network?.chainName);
        // console.log('Contract Address:', address);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing wallet:', error);
      setIsInitialized(true);
    } finally {
      setIsConnecting(false);
    }
  }, [isInitialized]);

  // Connect wallet manually
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
        const account = await signer.getAddress();

        // Get current network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const network = getNetworkByChainId(chainId);
        const address = getContractAddress(chainId);
        setProvider(provider);
        setSigner(signer);
        setAccount(account);
        setCurrentNetwork(network);
        setContractAddress(address);
        toast.success('Wallet connected successfully!');
        // console.log('Wallet connected:', account);
        // console.log('Network:', network?.chainName);
        // console.log('Contract Address:', address);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error connecting wallet:', error?.message);
      toast.error(`Failed to connect wallet: ${error?.message}`);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount('');
    setCurrentNetwork(null);
    setContractAddress('');
    toast.info('Wallet disconnected');
  }, []);

  // Handle account changes
  const handleAccountsChanged = useCallback((accounts) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      // console.log('Account changed to:', accounts[0]);

      // Reinitialize provider and signer with new account
      if (window.ethereum) {
        const initNewAccount = async () => {
          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            setProvider(provider);
            setSigner(signer);
          } catch (error) {
            console.error('Error reinitializing with new account:', error);
          }
        };
        initNewAccount();
      }
    } else {
      disconnectWallet();
    }
  }, [disconnectWallet]);

  // Handle network changes
  const handleChainChanged = useCallback((chainId) => {
    const network = getNetworkByChainId(chainId);
    const address = getContractAddress(chainId);
    setCurrentNetwork(network);
    setContractAddress(address);

    // console.log('Network changed to:', network?.chainName);
    // console.log('New contract address:', address);

    if (!network) {

      toast.warning('Unsupported network detected');
    }
  }, []);

  // Initialize on mount and window load
  useEffect(() => {
    const handleWindowLoad = () => {
      initializeWallet();
    };

    if (document.readyState === 'complete') {
      initializeWallet();
    } else {
      window.addEventListener('load', handleWindowLoad);
      return () => window.removeEventListener('load', handleWindowLoad);
    }
  }, [initializeWallet]);

  // Set up event listeners
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
    // State
    provider,
    signer,
    account,
    currentNetwork,
    contractAddress,
    isConnecting,
    isInitialized,
    isConnected: !!account,

    // Actions
    connectWallet,
    disconnectWallet,
    initializeWallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext;