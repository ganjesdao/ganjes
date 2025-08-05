# Network Switcher System

This system provides a reusable network switcher component that supports multiple blockchain networks including Ethereum and Binance Smart Chain (both mainnet and testnet).

## 🚀 Features

- **Multi-Network Support**: ETH Mainnet, Sepolia Testnet, BSC Mainnet, BSC Testnet
- **Auto Network Detection**: Automatically detects current network
- **Network Switching**: One-click network switching with automatic network addition
- **Contract Management**: Different contract addresses for different networks
- **Faucet Integration**: Direct links to testnet faucets
- **Responsive UI**: Beautiful dropdown with network status indicators

## 📁 Files Structure

```
src/
├── utils/
│   └── networks.js          # Network configurations and utilities
├── components/
│   ├── NetworkSwitcher.jsx  # Main network switcher component
│   └── NetworkSwitcherExample.jsx  # Usage example
└── pages/proposer/
    └── ProposalCreate.jsx   # Updated with network switching
```

## 🔧 Usage

### Basic Usage

```jsx
import NetworkSwitcher from '../components/NetworkSwitcher';
import { getContractAddress, isTestnet } from '../utils/networks';

function MyComponent() {
  const [currentNetwork, setCurrentNetwork] = useState(null);

  const handleNetworkChange = (network) => {
    setCurrentNetwork(network);
    // Get contract address for this network
    const contractAddress = getContractAddress(network.chainId);
    console.log('Contract:', contractAddress);
  };

  return (
    <NetworkSwitcher 
      onNetworkChange={handleNetworkChange}
      selectedNetwork={currentNetwork}
      showTestnets={true} // Set to false to hide testnets
    />
  );
}
```

### Available Networks

| Network | Chain ID | Symbol | Type | Faucet |
|---------|----------|--------|------|--------|
| Ethereum Mainnet | 1 | ETH | Mainnet | - |
| Sepolia Testnet | 11155111 | ETH | Testnet | ✅ |
| BSC Mainnet | 56 | BNB | Mainnet | - |
| BSC Testnet | 97 | tBNB | Testnet | ✅ |

### Utility Functions

```jsx
import { 
  NETWORKS, 
  getNetworkByChainId, 
  getContractAddress, 
  isTestnet, 
  getGasPrice 
} from '../utils/networks';

// Get network info by chain ID
const network = getNetworkByChainId('0x61'); // BSC Testnet

// Get contract address for current network
const contractAddress = getContractAddress('0x61');

// Check if network is testnet
const isTest = isTestnet('0x61'); // true

// Get recommended gas price for network
const gasPrice = getGasPrice('0x61'); // "10"
```

## 🎨 Customization

### Adding New Networks

Add new networks to `src/utils/networks.js`:

```jsx
export const NETWORKS = {
  // Existing networks...
  
  POLYGON_MAINNET: {
    chainId: '0x89', // 137 in decimal
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
    icon: '🔵',
    color: '#8247E5',
    faucetUrl: null,
  },
};
```

### Adding Contract Addresses

Update `CONTRACT_ADDRESSES` in `src/utils/networks.js`:

```jsx
export const CONTRACT_ADDRESSES = {
  [NETWORKS.ETH_MAINNET.chainId]: '0xYourMainnetContract',
  [NETWORKS.BSC_TESTNET.chainId]: process.env.REACT_APP_DAO_BSC_TEST_ADDRESS,
  // Add more contracts...
};
```

## 🎯 Component Props

### NetworkSwitcher Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onNetworkChange` | `function` | - | Callback when network changes |
| `selectedNetwork` | `object` | `null` | Currently selected network |
| `showTestnets` | `boolean` | `true` | Whether to show testnet options |

## 🔄 State Management

The component manages these states:
- `currentNetwork`: Currently connected network
- `isDropdownOpen`: Dropdown visibility
- Network switching status

## 🛠️ Error Handling

The system handles:
- Network not available in wallet
- Network switching failures
- Contract not deployed on network
- Insufficient gas fees
- User rejection of network switch

## 🔗 Integration Examples

### With Smart Contract Interactions

```jsx
const createTransaction = async () => {
  if (!isNetworkSupported()) {
    toast.error('Please select a supported network!');
    return;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(
    getContractAddress(currentNetwork.chainId),
    contractABI,
    provider.getSigner()
  );

  // Your contract interaction...
};
```

### With Form Validation

```jsx
const isFormValid = () => {
  return (
    formData.isValid &&
    currentNetwork &&
    getContractAddress(currentNetwork.chainId) !== "0x0000000000000000000000000000000000000000"
  );
};
```

## 🎨 Styling

The component uses inline styles for portability. You can customize colors by:
1. Modifying network colors in `networks.js`
2. Overriding styles in your CSS
3. Passing custom styles via props (future enhancement)

## 🧪 Testing

Test the component with:
1. Different wallet connections
2. Network switching scenarios
3. Contract deployment status
4. Testnet faucet links
5. Error handling

## 🔄 Updates

To update contract addresses or add new networks:
1. Edit `src/utils/networks.js`
2. Update contract addresses mapping
3. Test with new networks
4. Update documentation

This system is designed to be easily extensible and reusable across your entire application! 🚀