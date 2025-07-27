/**
 * DAO Service Layer for Admin Dashboard
 * Handles all blockchain interactions and data fetching
 */

import { ethers } from 'ethers';
import { getContractAddress } from '../../utils/networks';
import { daoABI } from '../../Auth/Abi';
import { toast } from 'react-toastify';

class DAOService {
  constructor() {
    this.provider = null;
    this.daoContract = null;
    this.tokenContract = null;
    this.currentNetwork = null;
    this.contractAddress = null;
  }

  /**
   * Initialize the service with network and contracts
   */
  async initialize(network) {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected. Please install MetaMask extension.');
    }

    try {
      this.currentNetwork = network;

      // Get contract address with better error handling
      try {
        this.contractAddress = getContractAddress(network.chainId);
      } catch (error) {
        console.warn('Failed to get contract address:', error);
        this.contractAddress = null;
      }

      if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`DAO contract not deployed on ${network.chainName}. Please check network configuration.`);
      }

      // Check if MetaMask is connected
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
          throw new Error('MetaMask not connected. Please connect your wallet first.');
        }
      } catch (accountError) {
        throw new Error(`Failed to check MetaMask connection: ${accountError.message}`);
      }

      // Create provider and contracts with better error handling
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum);

        // Test provider connection
        const network_info = await this.provider.getNetwork();
        console.log('Provider connected to network:', network_info.name, network_info.chainId);

        const signer = await this.provider.getSigner();

        // Test signer
        const signerAddress = await signer.getAddress();
        console.log('Signer address:', signerAddress);

        this.daoContract = new ethers.Contract(this.contractAddress, daoABI, signer);

        // Test contract connection by calling a simple view method
        try {
          const proposalCount = await this.daoContract.proposalCount();
          console.log('Contract test successful, proposal count:', proposalCount.toString());
        } catch (contractError) {
          console.warn('Contract method test failed, but continuing...', contractError);
          // Don't throw here, as the contract might still work for other methods
        }

        console.log(`✅ DAO Service initialized successfully for ${network.chainName}`, {
          contractAddress: this.contractAddress,
          networkId: network.chainId,
          hasProvider: !!this.provider,
          hasContract: !!this.daoContract,
          signerAddress
        });

        return true;
      } catch (providerError) {
        console.error('Provider/signer initialization failed:', providerError);

        // Provide more specific error messages
        if (providerError.code === 4001) {
          throw new Error('Connection rejected by user. Please approve the connection request.');
        } else if (providerError.code === -32002) {
          throw new Error('Connection request already pending. Please check MetaMask.');
        } else if (providerError.message.includes('user rejected')) {
          throw new Error('Connection rejected by user.');
        } else {
          throw new Error(`Failed to connect to ${network.chainName}: ${providerError.message}`);
        }
      }

    } catch (error) {
      console.error('Failed to initialize DAO Service:', error);
      this.cleanup(); // Clean up partial initialization
      throw error;
    }
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics() {
    if (!this.daoContract) {
      throw new Error('DAO Service not initialized');
    }

    try {
      // Fetch basic metrics with error handling for each method
      let totalProposals = 0;
      let totalFunded = 0;
      let daoBalance = 0;
      let allProposalIds = [];

      try {
        totalProposals = await this.daoContract.getTotalProposals();
        totalProposals = Number(totalProposals);
      } catch (error) {
        console.warn('Failed to fetch total proposals:', error);
        // Fallback: try to get proposal count
        try {
          const proposalCount = await this.daoContract.proposalCount();
          totalProposals = Number(proposalCount);
        } catch (fallbackError) {
          console.warn('Fallback proposal count also failed:', fallbackError);
        }
      }

      try {
        totalFunded = await this.daoContract.getTotalFundedAmount();
        totalFunded = ethers.formatEther(totalFunded);
      } catch (error) {
        console.warn('Failed to fetch total funded amount:', error);
        totalFunded = '0';
      }

      try {
        daoBalance = await this.daoContract.getDAOBalance();
        daoBalance = ethers.formatEther(daoBalance);
      } catch (error) {
        console.warn('Failed to fetch DAO balance:', error);
        daoBalance = '0';
      }

      try {
        allProposalIds = await this.daoContract.getAllProposalIds();
      } catch (error) {
        console.warn('Failed to fetch all proposal IDs:', error);
        allProposalIds = [];
      }

      // Get active and executed proposals count
      const activeProposals = await this.getActiveProposalsCount(allProposalIds);
      const executedProposals = await this.getExecutedProposalsCount(allProposalIds);

      // Calculate additional metrics
      let totalInvestors = 0;
      let averageFunding = 0;
      let successRate = 0;

      try {
        totalInvestors = await this.daoContract.getActiveInvestorCount();
        totalInvestors = Number(totalInvestors);
      } catch (error) {
        console.warn('Failed to fetch total investors:', error);
      }

      if (totalProposals > 0) {
        successRate = ((executedProposals / totalProposals) * 100).toFixed(1);
      }

      if (executedProposals > 0) {
        averageFunding = (parseFloat(totalFunded) / executedProposals).toFixed(4);
      }

      return {
        totalProposals,
        totalFunded,
        daoBalance,
        activeProposals,
        executedProposals,
        totalInvestors,
        successRate,
        averageFunding,
        currency: this.currentNetwork?.nativeCurrency?.symbol || 'ETH',
        // Additional impact metrics
        impactScore: Math.min(100, (totalProposals * 10) + (parseFloat(totalFunded) * 5)).toFixed(0),
        networkGrowth: totalInvestors > 0 ? ((totalProposals / totalInvestors) * 100).toFixed(1) : '0'
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return default values instead of throwing
      return {
        totalProposals: 0,
        totalFunded: '0',
        daoBalance: '0',
        activeProposals: 0,
        executedProposals: 0,
        currency: this.currentNetwork?.nativeCurrency?.symbol || 'ETH'
      };
    }
  }

  /**
   * Get all proposals with details
   */
  async getAllProposals() {
    if (!this.daoContract) {
      throw new Error('DAO Service not initialized');
    }

    try {
      let proposalIds = [];

      // Try to get proposal IDs
      try {
        proposalIds = await this.daoContract.getAllProposalIds();
      } catch (error) {
        console.warn('Failed to fetch proposal IDs, returning empty array:', error);
        return [];
      }

      if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
        console.log('No proposals found');
        return [];
      }

      const proposals = [];

      for (const id of proposalIds) {
        try {
          const [basicDetails, votingDetails] = await Promise.all([
            this.daoContract.getProposalBasicDetails(id),
            this.daoContract.getProposalVotingDetails(id)
          ]);

          // Handle different return formats (struct vs array)
          const proposalData = {
            id: Number(id),
            proposer: basicDetails.proposer || basicDetails[1],
            projectName: basicDetails.projectName || basicDetails[3] || `Proposal #${id}`,
            description: basicDetails.description || basicDetails[2] || 'No description available',
            fundingGoal: ethers.formatEther(basicDetails.fundingGoal || basicDetails[5] || 0),
            totalVotesFor: ethers.formatEther(votingDetails.totalVotesFor || votingDetails[0] || 0),
            totalVotesAgainst: ethers.formatEther(votingDetails.totalVotesAgainst || votingDetails[1] || 0),
            votersFor: Number(votingDetails.votersFor || votingDetails[2] || 0),
            votersAgainst: Number(votingDetails.votersAgainst || votingDetails[3] || 0),
            totalInvested: ethers.formatEther(votingDetails.totalInvested || votingDetails[4] || 0),
            endTime: new Date(Number(basicDetails.endTime || basicDetails[6] || 0) * 1000),
            executed: basicDetails.executed || basicDetails[7] || false,
            passed: basicDetails.passed || basicDetails[8] || false,
            currency: this.currentNetwork?.nativeCurrency?.symbol || 'ETH'
          };

          proposals.push(proposalData);
        } catch (error) {
          console.warn(`Failed to fetch proposal ${id}:`, error);
          // Add a basic proposal entry even if details fail
          proposals.push({
            id: Number(id),
            proposer: '0x0000000000000000000000000000000000000000',
            projectName: `Proposal #${id}`,
            description: 'Error loading details',
            fundingGoal: '0',
            totalVotesFor: '0',
            totalVotesAgainst: '0',
            votersFor: 0,
            votersAgainst: 0,
            totalInvested: '0',
            endTime: new Date(),
            executed: false,
            passed: false,
            currency: this.currentNetwork?.nativeCurrency?.symbol || 'ETH'
          });
        }
      }

      return proposals;
    } catch (error) {
      console.error('Error fetching all proposals:', error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Get proposers with their statistics
   */
  async getProposersData() {
    if (!this.daoContract) {
      throw new Error('DAO Service not initialized');
    }

    try {
      const proposals = await this.getAllProposals();
      const proposersMap = new Map();

      // Group proposals by proposer
      proposals.forEach(proposal => {
        const proposer = proposal.proposer;

        if (!proposersMap.has(proposer)) {
          proposersMap.set(proposer, {
            address: proposer,
            totalProposals: 0,
            approvedProposals: 0,
            totalFunding: 0,
            proposals: []
          });
        }

        const proposerData = proposersMap.get(proposer);
        proposerData.totalProposals += 1;
        proposerData.proposals.push(proposal);

        if (proposal.passed) {
          proposerData.approvedProposals += 1;
          proposerData.totalFunding += parseFloat(proposal.totalInvested);
        }
      });

      return Array.from(proposersMap.values()).map(proposer => ({
        ...proposer,
        successRate: proposer.totalProposals > 0
          ? (proposer.approvedProposals / proposer.totalProposals * 100).toFixed(1)
          : 0,
        averageFunding: proposer.approvedProposals > 0
          ? (proposer.totalFunding / proposer.approvedProposals).toFixed(4)
          : 0
      }));
    } catch (error) {
      console.error('Error fetching proposers data:', error);
      throw error;
    }
  }

  /**
   * Get investors data
   */
  async getInvestorsData() {
    if (!this.daoContract) {
      throw new Error('DAO Service not initialized');
    }

    try {
      const activeInvestorCount = await this.daoContract.getActiveInvestorCount();

      return {
        totalInvestors: Number(activeInvestorCount),
        activeInvestors: Number(activeInvestorCount)
      };
    } catch (error) {
      console.error('Error fetching investors data:', error);
      throw error;
    }
  }

  /**
   * Get executed proposals
   */
  async getExecutedProposals() {
    try {
      const allProposals = await this.getAllProposals();
      return allProposals.filter(proposal => proposal.executed);
    } catch (error) {
      console.error('Error fetching executed proposals:', error);
      throw error;
    }
  }

  /**
   * Execute a proposal (admin function)
   */
  async executeProposal(proposalId) {
    if (!this.daoContract) {
      throw new Error('DAO Service not initialized');
    }

    try {
      const tx = await this.daoContract.executeProposal(proposalId);
      toast.info('Transaction submitted. Waiting for confirmation...');

      const receipt = await tx.wait();
      toast.success('Proposal executed successfully!');

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error executing proposal:', error);
      toast.error('Failed to execute proposal');
      throw error;
    }
  }

  /**
   * Helper method to count active proposals
   */
  async getActiveProposalsCount(proposalIds) {
    let activeCount = 0;
    const currentTime = Math.floor(Date.now() / 1000);

    for (const id of proposalIds) {
      try {
        const basicDetails = await this.daoContract.getProposalBasicDetails(id);
        if (Number(basicDetails.endTime) > currentTime && !basicDetails.executed) {
          activeCount++;
        }
      } catch (error) {
        console.warn(`Failed to check proposal ${id} status:`, error);
      }
    }

    return activeCount;
  }

  /**
   * Helper method to count executed proposals
   */
  async getExecutedProposalsCount(proposalIds) {
    let executedCount = 0;

    for (const id of proposalIds) {
      try {
        const basicDetails = await this.daoContract.getProposalBasicDetails(id);
        if (basicDetails.executed) {
          executedCount++;
        }
      } catch (error) {
        console.warn(`Failed to check proposal ${id} execution status:`, error);
      }
    }

    return executedCount;
  }

  /**
   * Test contract connectivity and available methods
   */
  async testContractMethods() {
    if (!this.daoContract) {
      return { isConnected: false, availableMethods: [] };
    }

    const availableMethods = [];
    const testMethods = [
      'proposalCount',
      'getTotalProposals',
      'getAllProposalIds',
      'getDAOBalance',
      'getTotalFundedAmount',
      'getActiveInvestorCount'
    ];

    for (const method of testMethods) {
      try {
        await this.daoContract[method]();
        availableMethods.push(method);
      } catch (error) {
        console.warn(`Method ${method} not available:`, error.message);
      }
    }

    return {
      isConnected: true,
      availableMethods,
      contractAddress: this.contractAddress,
      network: this.currentNetwork?.chainName
    };
  }

  /**
   * Get network information
   */
  getNetworkInfo() {
    return {
      network: this.currentNetwork,
      contractAddress: this.contractAddress,
      isInitialized: !!this.daoContract
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.provider = null;
    this.daoContract = null;
    this.tokenContract = null;
    this.currentNetwork = null;
    this.contractAddress = null;
  }
}

// Create singleton instance
export const daoService = new DAOService();
export default daoService;