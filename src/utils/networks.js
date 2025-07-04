// Network configurations for ETH and BSC (Mainnet & Testnet)
export const NETWORKS = {
  ETH_MAINNET: {
    chainId: '0x1', // 1 in decimal
    chainName: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://mainnet.infura.io/v3/', 'https://eth-mainnet.g.alchemy.com/v2/'],
    blockExplorerUrls: ['https://etherscan.io'],
    icon: '🔷',
    color: '#627EEA',
    faucetUrl: null, // No faucet for mainnet
  },
  
  ETH_SEPOLIA: {
    chainId: '0xaa36a7', // 11155111 in decimal
    chainName: 'Sepolia Testnet',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.infura.io/v3/', 'https://eth-sepolia.g.alchemy.com/v2/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    icon: '🔷',
    color: '#627EEA',
    faucetUrl: 'https://sepoliafaucet.com/',
  },

  BSC_MAINNET: {
    chainId: '0x38', // 56 in decimal
    chainName: 'BSC Mainnet',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    rpcUrls: ['https://bsc-dataseed1.binance.org', 'https://bsc-dataseed2.binance.org'],
    blockExplorerUrls: ['https://bscscan.com'],
    icon: '🟡',
    color: '#F3BA2F',
    faucetUrl: null, // No faucet for mainnet
  },

  BSC_TESTNET: {
    chainId: '0x61', // 97 in decimal
    chainName: 'BSC Testnet',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'tBNB',
      decimals: 18,
    },
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
    icon: '🟡',
    color: '#F3BA2F',
    faucetUrl: 'https://testnet.binance.org/faucet-smart',
  },
};

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  [NETWORKS.ETH_MAINNET.chainId]: '0x0000000000000000000000000000000000000000', // Replace with actual mainnet contract
  [NETWORKS.ETH_SEPOLIA.chainId]: '0x42DfcbF08cdf0d7A522E7A1c19ec3cC30a180117', // Replace with actual Sepolia contract
  [NETWORKS.BSC_MAINNET.chainId]: process.env.REACT_APP_DAO_BSC_TEST_ADDRESS, // Your BSC mainnet contract
  [NETWORKS.BSC_TESTNET.chainId]:  process.env.REACT_APP_DAO_BSC_TEST_ADDRESS, // Your BSC testnet contract
};

// Get network by chain ID
export const getNetworkByChainId = (chainId) => {
  return Object.values(NETWORKS).find(network => network.chainId === chainId);
};

// Get contract address for current network
export const getContractAddress = (chainId) => {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[NETWORKS.BSC_TESTNET.chainId];
};

// Check if network is testnet
export const isTestnet = (chainId) => {
  return chainId === NETWORKS.ETH_SEPOLIA.chainId || chainId === NETWORKS.BSC_TESTNET.chainId;
};

// Get gas price for network (in gwei)
export const getGasPrice = (chainId) => {
  switch (chainId) {
    case NETWORKS.ETH_MAINNET.chainId:
      return '20'; // 20 gwei for ETH mainnet
    case NETWORKS.ETH_SEPOLIA.chainId:
      return '10'; // 10 gwei for Sepolia
    case NETWORKS.BSC_MAINNET.chainId:
      return '5'; // 5 gwei for BSC mainnet
    case NETWORKS.BSC_TESTNET.chainId:
      return '10'; // 10 gwei for BSC testnet
    default:
      return '10';
  }
};