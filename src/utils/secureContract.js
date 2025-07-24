/**
 * Secure Smart Contract Interaction Utilities
 * Enhanced security for blockchain interactions with validation and error handling
 */

import { ethers } from 'ethers';
import { InputValidator, SecurityValidator } from './validation';
import { NETWORKS, getNetworkByChainId, getContractAddress } from './networks';

/**
 * Contract Security Configuration
 */
const CONTRACT_SECURITY_CONFIG = {
  // Gas limits for different operations
  gasLimits: {
    createProposal: 500000,
    vote: 300000,
    executeProposal: 400000,
    depositFunds: 200000,
    withdrawFunds: 250000,
    approve: 100000,
  },
  
  // Maximum values to prevent overflow attacks
  maxValues: {
    tokenAmount: ethers.parseEther('1000000'), // 1M tokens max
    proposalId: 999999999,
    gasPrice: ethers.parseUnits('100', 'gwei'), // 100 gwei max
  },
  
  // Minimum values for validation
  minValues: {
    tokenAmount: ethers.parseEther('0.001'), // 0.001 tokens min
    investmentAmount: ethers.parseEther('1'), // 1 token min investment
  },
  
  // Timeout configurations
  timeouts: {
    transactionTimeout: 60000, // 1 minute
    blockConfirmations: 2, // Wait for 2 confirmations
  }
};

/**
 * Secure Contract Interaction Class
 */
export class SecureContractInteraction {
  constructor(contractAddress, contractABI, signerOrProvider) {
    this.validateConstructorParams(contractAddress, contractABI, signerOrProvider);
    
    this.contractAddress = contractAddress;
    this.contractABI = contractABI;
    this.contract = new ethers.Contract(contractAddress, contractABI, signerOrProvider);
    this.signer = signerOrProvider;
  }

  /**
   * Validate constructor parameters
   */
  validateConstructorParams(contractAddress, contractABI, signerOrProvider) {
    if (!ethers.isAddress(contractAddress)) {
      throw new Error('Invalid contract address');
    }
    
    if (!Array.isArray(contractABI) || contractABI.length === 0) {
      throw new Error('Invalid contract ABI');
    }
    
    if (!signerOrProvider) {
      throw new Error('Signer or provider is required');
    }
  }

  /**
   * Validate transaction parameters before execution
   */
  validateTransactionParams(method, params, options = {}) {
    // Check if method exists in contract
    if (!this.contract[method]) {
      throw new Error(`Method ${method} not found in contract`);
    }

    // Validate gas limit
    if (options.gasLimit) {
      const maxGasLimit = CONTRACT_SECURITY_CONFIG.gasLimits[method] || 500000;
      if (options.gasLimit > maxGasLimit) {
        throw new Error(`Gas limit too high for method ${method}`);
      }
    }

    // Validate gas price
    if (options.gasPrice && options.gasPrice > CONTRACT_SECURITY_CONFIG.maxValues.gasPrice) {
      throw new Error('Gas price too high');
    }

    // Validate value if present
    if (options.value && options.value > CONTRACT_SECURITY_CONFIG.maxValues.tokenAmount) {
      throw new Error('Transaction value too high');
    }

    return true;
  }

  /**
   * Execute contract method with enhanced security
   */
  async executeMethod(method, params = [], options = {}) {
    try {
      // Validate parameters
      this.validateTransactionParams(method, params, options);

      // Set default gas limit if not provided
      if (!options.gasLimit) {
        options.gasLimit = CONTRACT_SECURITY_CONFIG.gasLimits[method] || 300000;
      }

      // Estimate gas to prevent failures
      let estimatedGas;
      try {
        estimatedGas = await this.contract[method].estimateGas(...params, options);
        
        // Add 20% buffer to estimated gas
        const gasWithBuffer = estimatedGas * 120n / 100n;
        
        // Use the lower of estimated gas (with buffer) or configured limit
        options.gasLimit = gasWithBuffer < BigInt(options.gasLimit) ? gasWithBuffer : BigInt(options.gasLimit);
      } catch (gasEstimateError) {
        console.warn(`Gas estimation failed for ${method}:`, gasEstimateError.message);
        // Continue with default gas limit
      }

      // Execute transaction with timeout
      const txPromise = this.contract[method](...params, options);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction timeout')), CONTRACT_SECURITY_CONFIG.timeouts.transactionTimeout);
      });

      const tx = await Promise.race([txPromise, timeoutPromise]);
      
      // Wait for confirmation
      const receipt = await tx.wait(CONTRACT_SECURITY_CONFIG.timeouts.blockConfirmations);
      
      // Validate receipt
      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed or was reverted');
      }

      return {
        success: true,
        transaction: tx,
        receipt: receipt,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
      };

    } catch (error) {
      // Enhanced error handling with security considerations
      return this.handleContractError(error, method, params);
    }
  }

  /**
   * Secure error handling that doesn't leak sensitive information
   */
  handleContractError(error, method, params) {
    let userFriendlyMessage = 'Transaction failed. Please try again.';
    let errorType = 'unknown';

    // Categorize errors without exposing sensitive details
    if (error.code === 'INSUFFICIENT_FUNDS') {
      userFriendlyMessage = 'Insufficient funds for this transaction.';
      errorType = 'insufficient_funds';
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      userFriendlyMessage = 'Transaction may fail. Please check your inputs.';
      errorType = 'gas_estimation_failed';
    } else if (error.code === 'NONCE_EXPIRED' || error.code === 'REPLACEMENT_UNDERPRICED') {
      userFriendlyMessage = 'Transaction was replaced or expired. Please try again.';
      errorType = 'nonce_error';
    } else if (error.message?.includes('user rejected')) {
      userFriendlyMessage = 'Transaction was cancelled by user.';
      errorType = 'user_rejected';
    } else if (error.message?.includes('timeout')) {
      userFriendlyMessage = 'Transaction timed out. Please try again.';
      errorType = 'timeout';
    }

    // Log error for debugging (without sensitive data)
    console.error(`Contract method ${method} failed:`, {
      errorType,
      code: error.code,
      message: error.message?.substring(0, 100), // Truncate long messages
    });

    return {
      success: false,
      error: {
        type: errorType,
        message: userFriendlyMessage,
        code: error.code,
      }
    };
  }

  /**
   * Read-only contract calls with caching
   */
  async callMethod(method, params = [], useCache = true) {
    try {
      const cacheKey = `${this.contractAddress}_${method}_${JSON.stringify(params)}`;
      
      // Check cache for read-only calls
      if (useCache) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return { success: true, data: cached, fromCache: true };
        }
      }

      const result = await this.contract[method](...params);
      
      // Cache the result for 30 seconds
      if (useCache) {
        this.setCache(cacheKey, result, 30000);
      }

      return { success: true, data: result, fromCache: false };
    } catch (error) {
      console.error(`Contract call ${method} failed:`, error.message);
      return {
        success: false,
        error: {
          message: 'Failed to fetch data from contract',
          type: 'contract_call_failed'
        }
      };
    }
  }

  /**
   * Simple caching mechanism
   */
  getFromCache(key) {
    try {
      const cached = sessionStorage.getItem(`contract_cache_${key}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() < parsed.expiry) {
          return parsed.data;
        } else {
          sessionStorage.removeItem(`contract_cache_${key}`);
        }
      }
    } catch (error) {
      // Ignore cache errors
    }
    return null;
  }

  setCache(key, data, ttlMs) {
    try {
      const cacheData = {
        data: data.toString(), // Convert BigNumber to string for caching
        expiry: Date.now() + ttlMs
      };
      sessionStorage.setItem(`contract_cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      // Ignore cache errors
    }
  }
}

/**
 * DAO-specific secure contract interactions
 */
export class SecureDAOContract extends SecureContractInteraction {
  /**
   * Securely create a proposal
   */
  async createProposal(description, projectName, projectUrl, fundingGoal) {
    // Validate inputs
    const validation = InputValidator.validateProposalCreation({
      description,
      title: projectName,
      projectUrl,
      fundingGoal
    });

    if (!validation.isValid) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: 'Invalid proposal data',
          details: validation.errors
        }
      };
    }

    // Check for suspicious content
    if (SecurityValidator.hasSuspiciousPatterns(description) || 
        SecurityValidator.hasSuspiciousPatterns(projectName)) {
      return {
        success: false,
        error: {
          type: 'security_error',
          message: 'Proposal content contains invalid characters'
        }
      };
    }

    // Convert funding goal to wei
    let fundingGoalWei;
    try {
      fundingGoalWei = ethers.parseEther(fundingGoal);
      
      // Validate amount ranges
      if (fundingGoalWei < CONTRACT_SECURITY_CONFIG.minValues.tokenAmount ||
          fundingGoalWei > CONTRACT_SECURITY_CONFIG.maxValues.tokenAmount) {
        throw new Error('Funding goal out of acceptable range');
      }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: 'Invalid funding goal amount'
        }
      };
    }

    return await this.executeMethod('createProposal', [
      validation.value.description,
      validation.value.title,
      validation.value.projectUrl || '',
      fundingGoalWei
    ]);
  }

  /**
   * Securely vote on a proposal
   */
  async vote(proposalId, support, investmentAmount) {
    // Validate inputs
    const validation = InputValidator.validateVoteData({
      proposalId,
      support,
      investmentAmount
    });

    if (!validation.isValid) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: 'Invalid vote data',
          details: validation.errors
        }
      };
    }

    // Convert investment amount to wei
    let investmentAmountWei;
    try {
      investmentAmountWei = ethers.parseEther(investmentAmount);
      
      // Validate investment amount
      if (investmentAmountWei < CONTRACT_SECURITY_CONFIG.minValues.investmentAmount ||
          investmentAmountWei > CONTRACT_SECURITY_CONFIG.maxValues.tokenAmount) {
        throw new Error('Investment amount out of acceptable range');
      }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: 'Invalid investment amount'
        }
      };
    }

    return await this.executeMethod('vote', [
      validation.value.proposalId,
      validation.value.support,
      investmentAmountWei
    ]);
  }

  /**
   * Securely execute a proposal (admin only)
   */
  async executeProposal(proposalId) {
    // Validate proposal ID
    if (!Number.isInteger(proposalId) || proposalId < 1 || proposalId > CONTRACT_SECURITY_CONFIG.maxValues.proposalId) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: 'Invalid proposal ID'
        }
      };
    }

    // Additional admin verification could be added here
    return await this.executeMethod('executeProposal', [proposalId]);
  }

  /**
   * Securely deposit funds
   */
  async depositFunds(amount) {
    // Validate amount
    let amountWei;
    try {
      amountWei = ethers.parseEther(amount);
      
      if (amountWei < CONTRACT_SECURITY_CONFIG.minValues.tokenAmount ||
          amountWei > CONTRACT_SECURITY_CONFIG.maxValues.tokenAmount) {
        throw new Error('Deposit amount out of acceptable range');
      }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: 'Invalid deposit amount'
        }
      };
    }

    return await this.executeMethod('deposit', [amountWei]);
  }

  /**
   * Get proposal details safely
   */
  async getProposalDetails(proposalId) {
    // Validate proposal ID
    if (!Number.isInteger(proposalId) || proposalId < 1) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: 'Invalid proposal ID'
        }
      };
    }

    const result = await this.callMethod('getProposalBasicDetails', [proposalId]);
    
    if (result.success && result.data) {
      // Format the data for safe consumption
      try {
        return {
          success: true,
          data: {
            id: Number(result.data[0]),
            proposer: result.data[1],
            description: result.data[2],
            projectName: result.data[3],
            projectUrl: result.data[4],
            fundingGoal: ethers.formatEther(result.data[5]),
            endTime: new Date(Number(result.data[6]) * 1000).toISOString(),
            executed: result.data[7],
            passed: result.data[8]
          }
        };
      } catch (formatError) {
        return {
          success: false,
          error: {
            type: 'format_error',
            message: 'Failed to format proposal data'
          }
        };
      }
    }

    return result;
  }
}

/**
 * Network Security Utilities
 */
export class NetworkSecurity {
  /**
   * Validate network configuration before switching
   */
  static validateNetworkConfig(networkConfig) {
    const requiredFields = ['chainId', 'chainName', 'nativeCurrency', 'rpcUrls', 'blockExplorerUrls'];
    
    for (const field of requiredFields) {
      if (!networkConfig[field]) {
        return { isValid: false, error: `Missing required field: ${field}` };
      }
    }

    // Validate chain ID format
    if (!/^0x[a-fA-F0-9]+$/.test(networkConfig.chainId)) {
      return { isValid: false, error: 'Invalid chain ID format' };
    }

    // Validate RPC URLs
    for (const rpcUrl of networkConfig.rpcUrls) {
      try {
        new URL(rpcUrl);
      } catch (error) {
        return { isValid: false, error: `Invalid RPC URL: ${rpcUrl}` };
      }
    }

    return { isValid: true };
  }

  /**
   * Safely switch network
   */
  static async switchNetwork(chainId) {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    // Validate chain ID
    const network = getNetworkByChainId(chainId);
    if (!network) {
      throw new Error('Unsupported network');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
      
      return { success: true };
    } catch (switchError) {
      // Network not added, try to add it
      if (switchError.code === 4902) {
        const validation = this.validateNetworkConfig(network);
        if (!validation.isValid) {
          throw new Error(`Network configuration invalid: ${validation.error}`);
        }

        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network],
          });
          
          return { success: true };
        } catch (addError) {
          throw new Error(`Failed to add network: ${addError.message}`);
        }
      } else {
        throw new Error(`Failed to switch network: ${switchError.message}`);
      }
    }
  }
}

export default {
  SecureContractInteraction,
  SecureDAOContract,
  NetworkSecurity,
  CONTRACT_SECURITY_CONFIG
};