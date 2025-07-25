/**
 * DAO Service Layer for Admin Dashboard
 * Handles all blockchain interactions and data fetching
 */

import { ethers } from 'ethers';
import { getContractAddress } from '../../utils/networks';
import { ganjesTokenAbi, daoAbi } from '../../Auth/Abi';
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
      throw new Error('MetaMask not detected');
    }

    try {
      this.currentNetwork = network;
      this.contractAddress = getContractAddress(network.chainId);
      
      if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Contract not deployed on ${network.chainName}`);
      }

      // Create provider and contracts
      this.provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await this.provider.getSigner();
      
      this.daoContract = new ethers.Contract(this.contractAddress, daoAbi, signer);
      // Token contract address would be retrieved from DAO contract or configured separately
      
      console.log(`DAO Service initialized for ${network.chainName}`, {
        contractAddress: this.contractAddress,
        provider: this.provider
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize DAO Service:', error);
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
      const [
        totalProposals,
        totalFunded,
        daoBalance,
        allProposalIds
      ] = await Promise.all([
        this.daoContract.getTotalProposals(),
        this.daoContract.getTotalFundedAmount(),
        this.daoContract.getDAOBalance(),
        this.daoContract.getAllProposalIds()
      ]);

      // Get active proposals count
      const activeProposals = await this.getActiveProposalsCount(allProposalIds);
      
      // Get executed proposals count
      const executedProposals = await this.getExecutedProposalsCount(allProposalIds);

      return {
        totalProposals: Number(totalProposals),
        totalFunded: ethers.formatEther(totalFunded),
        daoBalance: ethers.formatEther(daoBalance),
        activeProposals,
        executedProposals,
        currency: this.currentNetwork.nativeCurrency.symbol
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
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
      const proposalIds = await this.daoContract.getAllProposalIds();
      const proposals = [];

      for (const id of proposalIds) {
        try {
          const [basicDetails, votingDetails] = await Promise.all([
            this.daoContract.getProposalBasicDetails(id),
            this.daoContract.getProposalVotingDetails(id)
          ]);

          proposals.push({
            id: Number(id),
            proposer: basicDetails.proposer,
            projectName: basicDetails.projectName,
            description: basicDetails.description,
            fundingGoal: ethers.formatEther(basicDetails.fundingGoal),
            totalVotesFor: ethers.formatEther(votingDetails.totalVotesFor),
            totalVotesAgainst: ethers.formatEther(votingDetails.totalVotesAgainst),
            votersFor: Number(votingDetails.votersFor),
            votersAgainst: Number(votingDetails.votersAgainst),
            totalInvested: ethers.formatEther(votingDetails.totalInvested),
            endTime: new Date(Number(basicDetails.endTime) * 1000),
            executed: basicDetails.executed,
            passed: basicDetails.passed,
            currency: this.currentNetwork.nativeCurrency.symbol
          });
        } catch (error) {
          console.warn(`Failed to fetch proposal ${id}:`, error);
          // Continue with other proposals
        }
      }

      return proposals;
    } catch (error) {
      console.error('Error fetching all proposals:', error);
      throw error;
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
   * Get investors data (this would need additional contract methods)
   */
  async getInvestorsData() {
    if (!this.daoContract) {
      throw new Error('DAO Service not initialized');
    }

    try {
      // This is a simplified version - you might need additional contract methods
      const activeInvestorCount = await this.daoContract.getActiveInvestorCount();
      
      return {
        totalInvestors: Number(activeInvestorCount),
        // Additional investor data would require more contract methods
        // or off-chain indexing
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