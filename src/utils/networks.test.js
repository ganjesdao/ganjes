import {
  NETWORKS,
  CONTRACT_ADDRESSES,
  getNetworkByChainId,
  getContractAddress,
  isTestnet,
  getGasPrice,
} from './networks';

describe('Network Utilities', () => {
  const ACTUAL_BSC_ADDRESS = process.env.REACT_APP_DAO_BSC_TEST_ADDRESS;
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('NETWORKS configuration', () => {
    test('should have correct ETH mainnet configuration', () => {
      expect(NETWORKS.ETH_MAINNET).toEqual({
        chainId: '0x1',
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
        faucetUrl: null,
      });
    });

    test('should have correct ETH Sepolia configuration', () => {
      expect(NETWORKS.ETH_SEPOLIA).toEqual({
        chainId: '0xaa36a7',
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
      });
    });

    test('should have correct BSC mainnet configuration', () => {
      expect(NETWORKS.BSC_MAINNET).toEqual({
        chainId: '0x38',
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
        faucetUrl: null,
      });
    });

    test('should have correct BSC testnet configuration', () => {
      expect(NETWORKS.BSC_TESTNET).toEqual({
        chainId: '0x61',
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
      });
    });
  });

  describe('getNetworkByChainId', () => {
    test('should return correct network for ETH mainnet', () => {
      const network = getNetworkByChainId('0x1');
      expect(network).toEqual(NETWORKS.ETH_MAINNET);
    });

    test('should return correct network for ETH Sepolia', () => {
      const network = getNetworkByChainId('0xaa36a7');
      expect(network).toEqual(NETWORKS.ETH_SEPOLIA);
    });

    test('should return correct network for BSC mainnet', () => {
      const network = getNetworkByChainId('0x38');
      expect(network).toEqual(NETWORKS.BSC_MAINNET);
    });

    test('should return correct network for BSC testnet', () => {
      const network = getNetworkByChainId('0x61');
      expect(network).toEqual(NETWORKS.BSC_TESTNET);
    });

    test('should return undefined for unknown chain ID', () => {
      const network = getNetworkByChainId('0x999');
      expect(network).toBeUndefined();
    });
  });

  describe('getContractAddress', () => {
    test('should return correct contract address for ETH mainnet', () => {
      const address = getContractAddress('0x1');
      expect(address).toBe('0x0000000000000000000000000000000000000000');
    });

    test('should return correct contract address for ETH Sepolia', () => {
      const address = getContractAddress('0xaa36a7');
      expect(address).toBe('0x42DfcbF08cdf0d7A522E7A1c19ec3cC30a180117');
    });

    test('should return environment variable for BSC mainnet', () => {
      const address = getContractAddress('0x38');
      expect(address).toBe(ACTUAL_BSC_ADDRESS);
    });

    test('should return environment variable for BSC testnet', () => {
      const address = getContractAddress('0x61');
      expect(address).toBe(ACTUAL_BSC_ADDRESS);
    });

    test('should return BSC testnet address as fallback for unknown chain', () => {
      const address = getContractAddress('0x999');
      expect(address).toBe(ACTUAL_BSC_ADDRESS);
    });
  });

  describe('isTestnet', () => {
    test('should return true for ETH Sepolia', () => {
      expect(isTestnet('0xaa36a7')).toBe(true);
    });

    test('should return true for BSC testnet', () => {
      expect(isTestnet('0x61')).toBe(true);
    });

    test('should return false for ETH mainnet', () => {
      expect(isTestnet('0x1')).toBe(false);
    });

    test('should return false for BSC mainnet', () => {
      expect(isTestnet('0x38')).toBe(false);
    });

    test('should return false for unknown networks', () => {
      expect(isTestnet('0x999')).toBe(false);
    });
  });

  describe('getGasPrice', () => {
    test('should return correct gas price for ETH mainnet', () => {
      expect(getGasPrice('0x1')).toBe('20');
    });

    test('should return correct gas price for ETH Sepolia', () => {
      expect(getGasPrice('0xaa36a7')).toBe('10');
    });

    test('should return correct gas price for BSC mainnet', () => {
      expect(getGasPrice('0x38')).toBe('5');
    });

    test('should return correct gas price for BSC testnet', () => {
      expect(getGasPrice('0x61')).toBe('10');
    });

    test('should return default gas price for unknown networks', () => {
      expect(getGasPrice('0x999')).toBe('10');
    });
  });

  describe('CONTRACT_ADDRESSES configuration', () => {
    test('should have addresses for all supported networks', () => {
      expect(CONTRACT_ADDRESSES['0x1']).toBe('0x0000000000000000000000000000000000000000');
      expect(CONTRACT_ADDRESSES['0xaa36a7']).toBe('0x42DfcbF08cdf0d7A522E7A1c19ec3cC30a180117');
      expect(CONTRACT_ADDRESSES['0x38']).toBe(ACTUAL_BSC_ADDRESS);
      expect(CONTRACT_ADDRESSES['0x61']).toBe(ACTUAL_BSC_ADDRESS);
    });

    test('should use environment variables for BSC networks', () => {
      expect(CONTRACT_ADDRESSES[NETWORKS.BSC_MAINNET.chainId]).toBe(ACTUAL_BSC_ADDRESS);
      expect(CONTRACT_ADDRESSES[NETWORKS.BSC_TESTNET.chainId]).toBe(ACTUAL_BSC_ADDRESS);
    });
  });

  describe('Network properties validation', () => {
    test('all networks should have required properties', () => {
      Object.values(NETWORKS).forEach(network => {
        expect(network).toHaveProperty('chainId');
        expect(network).toHaveProperty('chainName');
        expect(network).toHaveProperty('nativeCurrency');
        expect(network).toHaveProperty('rpcUrls');
        expect(network).toHaveProperty('blockExplorerUrls');
        expect(network).toHaveProperty('icon');
        expect(network).toHaveProperty('color');
        
        // Check nativeCurrency structure
        expect(network.nativeCurrency).toHaveProperty('name');
        expect(network.nativeCurrency).toHaveProperty('symbol');
        expect(network.nativeCurrency).toHaveProperty('decimals');
        expect(network.nativeCurrency.decimals).toBe(18);
        
        // Check arrays are not empty
        expect(network.rpcUrls.length).toBeGreaterThan(0);
        expect(network.blockExplorerUrls.length).toBeGreaterThan(0);
      });
    });

    test('testnet networks should have faucet URLs', () => {
      expect(NETWORKS.ETH_SEPOLIA.faucetUrl).toBeTruthy();
      expect(NETWORKS.BSC_TESTNET.faucetUrl).toBeTruthy();
    });

    test('mainnet networks should not have faucet URLs', () => {
      expect(NETWORKS.ETH_MAINNET.faucetUrl).toBeNull();
      expect(NETWORKS.BSC_MAINNET.faucetUrl).toBeNull();
    });
  });
});