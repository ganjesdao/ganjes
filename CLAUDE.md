# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start development server (runs on http://localhost:3000)
- `npm run build` - Build for production 
- `npm test` - Run test suite
- `npm run eject` - Eject from Create React App (one-way operation)

## Project Architecture

### Overview
Ganjes NFT is a React-based DAO (Decentralized Autonomous Organization) platform that connects blockchain technology with a user-friendly interface. The application facilitates project proposal creation, voting, and investment through smart contracts on Ethereum and BSC networks.

### Core Architecture

**Multi-User System:**
- **Landing Pages**: Public access for browsing and information
- **Proposer Dashboard**: For project creators to submit and manage proposals
- **Investor Dashboard**: For token holders to vote and track investments

**Key Technologies:**
- React 19.1.0 with functional components and hooks
- Ethers.js 6.14.4 for blockchain interactions
- Bootstrap 5.3.7 + React Bootstrap for responsive UI
- React Router DOM 7.6.2 for navigation
- React Toastify 11.0.5 for notifications

### Application Structure

**Authentication System (`src/Auth/`):**
- `Auth.js` - Profile validation and session management using JWT tokens
- `Abi.js` - Smart contract ABI definitions
- Uses sessionStorage for auth tokens and backend API integration

**Network Configuration (`src/utils/networks.js`):**
- Multi-network support: Ethereum (Mainnet/Sepolia), BSC (Mainnet/Testnet)
- Contract addresses per network with environment variable fallbacks
- Gas price optimization per network
- Testnet faucet integration

**Page Organization:**
```
src/pages/
├── Landing/          # Public pages (no wallet required)
│   ├── Landing.jsx   # Main landing page
│   ├── Marketplace.jsx # Proposal browsing (public access)
│   ├── Proposal.jsx  # Individual proposal view
│   └── Join.jsx      # Registration gateway
├── proposer/         # Project creator interface
│   ├── Signin.jsx    # Proposer authentication
│   ├── Dashboard.jsx # Proposal management
│   └── CreateProposal.jsx # New proposal creation
└── Investor/         # Token holder interface
    ├── Login.jsx     # Investor authentication
    ├── Dashboard.jsx # Portfolio view
    ├── Vote.jsx      # Voting interface
    └── Analytics.jsx # Investment analytics
```

### Smart Contract Integration

**Contracts (`Smart Contract/`):**
- `ganjesToken.sol` - BEP20 token (GNJS) with 666M total supply
- `gnjDao.sol` - DAO governance contract for proposals and voting

**Blockchain Features:**
- MetaMask wallet integration through ethers.js
- Multi-network switching with automatic contract address resolution
- Real-time balance checking and transaction status
- Token-based voting system (1 GNJS = 1 vote)

### Component Architecture

**Shared Components (`src/components/`):**
- Network switching utilities for MetaMask integration
- Reusable wallet connection components

**Page-specific Components:**
- Each user type (Landing/Proposer/Investor) has dedicated header, sidebar, and footer components
- DAO components (`Dao.js`) provide blockchain interaction logic

### Styling System

**CSS Organization:**
- `src/styles/` contains specialized stylesheets
- `ProposalStyles.css` - Enhanced UI with gradients, animations, and responsive design
- `GalaxySlider.css` - Custom slider components
- Global styles in `App.css` and `index.css`

**Design Principles:**
- Mobile-first responsive design using Bootstrap grid
- Gradient backgrounds and modern card layouts
- Animated interactions with hover effects
- Loading states and user feedback systems

### Key Features

**Marketplace System:**
- Public browsing without wallet connection required
- Real-time proposal filtering and search
- Animated progress bars and status indicators
- Responsive card layouts with hover effects

**Voting Mechanism:**
- Token balance verification before voting
- Real-time vote count updates
- Visual feedback for transaction states
- Vote history tracking

**Multi-Network Support:**
- Automatic network detection and switching
- Per-network contract address management
- Testnet support with faucet integration
- Gas price optimization per network

## Security Architecture

**Security Features Implemented:**
- **Secure Token Storage**: Encrypted token storage with automatic expiry
- **Input Validation**: Comprehensive validation using Joi schemas
- **XSS Protection**: DOMPurify sanitization for all user inputs
- **CSRF Protection**: Token-based CSRF protection for state-changing requests
- **Permission System**: Role-based access control with granular permissions
- **Rate Limiting**: Client-side rate limiting for login attempts
- **Security Headers**: CSP, XSS protection, and other security headers

**Security Components:**
- `SecureAuth` - Enhanced authentication with token validation
- `SecureLogin` - Login component with brute force protection
- `SecureContractInteraction` - Safe blockchain interactions
- `PermissionManager` - Role-based access control
- `SecurityValidator` - Input validation and pattern detection

**Security Utilities:**
- `secureStorage.js` - Encrypted browser storage
- `validation.js` - Input validation and sanitization
- `securityHeaders.js` - CSP and security headers
- `permissions.js` - Role-based access control
- `secureContract.js` - Safe smart contract interactions

## Development Notes

**Environment Variables Required:**
- `REACT_APP_BASE_API_URL` - Backend API endpoint
- `REACT_APP_DAO_BSC_TEST_ADDRESS` - BSC contract address

**Security Dependencies:**
- `crypto-js` - Encryption utilities
- `dompurify` - XSS protection
- `joi` - Input validation
- `helmet` - Security headers (if using server-side)

**Testing Approach:**
- Uses React Testing Library with Jest
- Component testing setup in `setupTests.js`
- Test files follow `.test.js` naming convention
- Security-focused tests for validation and authentication

**Build Process:**
- Standard Create React App build pipeline
- Outputs to `build/` directory
- Includes static assets optimization
- Security headers applied at build time

**Code Patterns:**
- Functional components with React hooks
- useEffect for blockchain data fetching
- useState for local component state
- Async/await for blockchain transactions
- Enhanced error handling without information disclosure
- Secure storage instead of localStorage/sessionStorage
- Input validation before all user interactions
- Permission checks for all sensitive operations