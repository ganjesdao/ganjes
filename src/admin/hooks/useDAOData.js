/**
 * Custom Hook for DAO Data Management
 * Handles data fetching, caching, and state management for admin dashboard
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { daoService } from '../services/daoService';
import { toast } from 'react-toastify';

export const useDAOData = (currentNetwork, enabled = true) => {
  // State management
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [proposers, setProposers] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [executedProposals, setExecutedProposals] = useState([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Refs for cleanup and tracking
  const initializationRef = useRef(false);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  // Configuration
  const REFRESH_INTERVAL = 30000; // 30 seconds
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize DAO service with current network
   */
  const initializeService = useCallback(async () => {
    if (!enabled || !currentNetwork || initializationRef.current) {
      return false;
    }

    setIsInitializing(true);
    setError(null);
    initializationRef.current = true;

    try {
      await daoService.initialize(currentNetwork);
      console.log('DAO Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize DAO service:', error);

      // Don't show toast for MetaMask connection issues on page load
      const isConnectionIssue = error.message.includes('not connected') ||
        error.message.includes('not detected') ||
        error.message.includes('rejected');

      // Set error state with user-friendly message
      const errorMessage = isConnectionIssue
        ? `Please connect your wallet to ${currentNetwork?.chainName || 'the network'}`
        : `Failed to connect to ${currentNetwork?.chainName}: ${error.message}`;

      setError(errorMessage);

      // Show appropriate user feedback
      if (!isConnectionIssue) {
        toast.error(`Connection failed: ${error.message}`);
      } else {
        console.warn(`Connection issue: ${error.message}`);
        // Show a more user-friendly message for connection issues
        toast.warn('Please connect your wallet to continue');
      }

      return false;
    } finally {
      setIsInitializing(false);
      initializationRef.current = false;
    }
  }, [currentNetwork, enabled]);

  /**
   * Fetch dashboard metrics
   */
  const fetchDashboardMetrics = useCallback(async () => {
    try {
      const metrics = await daoService.getDashboardMetrics();
      if (isMountedRef.current) {
        setDashboardMetrics(metrics);
      }
      return metrics;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      if (isMountedRef.current) {
        setError('Failed to fetch dashboard metrics');
      }
      throw error;
    }
  }, []);

  /**
   * Fetch all proposals
   */
  const fetchProposals = useCallback(async () => {
    try {
      const proposalsData = await daoService.getAllProposals();
      if (isMountedRef.current) {
        setProposals(proposalsData);
      }
      return proposalsData;
    } catch (error) {
      console.error('Error fetching proposals:', error);
      if (isMountedRef.current) {
        setError('Failed to fetch proposals');
      }
      throw error;
    }
  }, []);

  /**
   * Fetch proposers data
   */
  const fetchProposers = useCallback(async () => {
    try {
      const proposersData = await daoService.getProposersData();
      if (isMountedRef.current) {
        setProposers(proposersData);
      }
      return proposersData;
    } catch (error) {
      console.error('Error fetching proposers:', error);
      if (isMountedRef.current) {
        setError('Failed to fetch proposers data');
      }
      throw error;
    }
  }, []);

  /**
   * Fetch investors data
   */
  const fetchInvestors = useCallback(async () => {
    try {
      const investorsData = await daoService.getInvestorsData();
      if (isMountedRef.current) {
        setInvestors(investorsData);
      }
      return investorsData;
    } catch (error) {
      console.error('Error fetching investors:', error);
      if (isMountedRef.current) {
        setError('Failed to fetch investors data');
      }
      throw error;
    }
  }, []);

  /**
   * Fetch executed proposals
   */
  const fetchExecutedProposals = useCallback(async () => {
    try {
      const executedData = await daoService.getExecutedProposals();
      if (isMountedRef.current) {
        setExecutedProposals(executedData);
      }
      return executedData;
    } catch (error) {
      console.error('Error fetching executed proposals:', error);
      if (isMountedRef.current) {
        setError('Failed to fetch executed proposals');
      }
      throw error;
    }
  }, []);

  /**
   * Fetch all data
   */
  const fetchAllData = useCallback(async () => {
    if (!enabled || isLoading || !currentNetwork) {
      console.log('useDAOData: Skipping fetchAllData', {
        enabled,
        isLoading,
        hasNetwork: !!currentNetwork
      });
      return;
    }

    console.log('useDAOData: Starting fetchAllData for', currentNetwork.chainName);
    setIsLoading(true);
    setError(null);

    try {
      // Check if service is initialized
      const networkInfo = daoService.getNetworkInfo();
      console.log('useDAOData: Service network info', networkInfo);

      if (!networkInfo.isInitialized) {
        console.log('useDAOData: Service not initialized, initializing...');
        const initialized = await initializeService();
        if (!initialized) {
          console.log('useDAOData: Service initialization failed');
          return;
        }
        console.log('useDAOData: Service initialized successfully');
      }

      console.log('useDAOData: Fetching all data...');
      // Fetch all data in parallel
      const results = await Promise.allSettled([
        fetchDashboardMetrics(),
        fetchProposals(),
        fetchProposers(),
        fetchInvestors(),
        fetchExecutedProposals()
      ]);

      console.log('useDAOData: Data fetch results', {
        metrics: results[0].status,
        proposals: results[1].status,
        proposers: results[2].status,
        investors: results[3].status,
        executed: results[4].status
      });

      // Check for any failed requests and provide specific error messages
      const failedRequests = results.filter(result => result.status === 'rejected');
      if (failedRequests.length > 0) {
        console.warn('useDAOData: Some data requests failed:', failedRequests);
        const errorMessages = failedRequests.map(result => result.reason?.message || 'Unknown error');
        const uniqueErrors = [...new Set(errorMessages)];

        if (isMountedRef.current) {
          setError(`Some data could not be loaded: ${uniqueErrors.join(', ')}`);
        }

        // Show toast for partial failures
        toast.warn('Some data could not be loaded. Please check your connection.');
      }

      if (isMountedRef.current) {
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('useDAOData: Error fetching DAO data:', error);
      const errorMessage = error.message.includes('network')
        ? 'Network connection error. Please check your internet connection.'
        : error.message.includes('contract')
          ? 'Smart contract error. Please try again later.'
          : `Failed to fetch DAO data: ${error.message}`;

      if (isMountedRef.current) {
        setError(errorMessage);
      }

      // Show user-friendly error toast
      toast.error(errorMessage);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    enabled,
    isLoading,
    currentNetwork,
    initializeService,
    fetchDashboardMetrics,
    fetchProposals,
    fetchProposers,
    fetchInvestors,
    fetchExecutedProposals
  ]);

  /**
   * Refresh data manually
   */
  const refreshData = useCallback(async () => {
    await fetchAllData();
    toast.success('Data refreshed successfully');
  }, [fetchAllData]);

  /**
   * Execute proposal
   */
  const executeProposal = useCallback(async (proposalId) => {
    try {
      const result = await daoService.executeProposal(proposalId);
      // Refresh data after execution
      await fetchAllData();
      toast.success('Proposal executed successfully!');
      return result;
    } catch (error) {
      console.error('Error executing proposal:', error);

      // Provide user-friendly error messages
      const errorMessage = error.message.includes('insufficient funds')
        ? 'Insufficient funds to execute this proposal'
        : error.message.includes('not authorized')
          ? 'You are not authorized to execute this proposal'
          : error.message.includes('already executed')
            ? 'This proposal has already been executed'
            : error.message.includes('voting period')
              ? 'Voting period has not ended yet'
              : `Failed to execute proposal: ${error.message}`;

      toast.error(errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchAllData]);

  /**
   * Initialize when network changes
   */
  useEffect(() => {
    console.log('useDAOData: Network change effect triggered', {
      currentNetwork: currentNetwork?.chainName,
      enabled,
      hasNetwork: !!currentNetwork
    });

    if (currentNetwork && enabled) {
      console.log('useDAOData: Initializing for network', {
        chainName: currentNetwork.chainName,
        chainId: currentNetwork.chainId
      });

      // Reset state
      setDashboardMetrics(null);
      setProposals([]);
      setProposers([]);
      setInvestors([]);
      setExecutedProposals([]);
      setError(null);

      // Cleanup previous service
      daoService.cleanup();

      // Initialize and fetch data
      fetchAllData();
    } else {
      console.log('useDAOData: Not initializing', {
        hasNetwork: !!currentNetwork,
        enabled
      });
    }
  }, [currentNetwork, enabled, fetchAllData]);

  /**
   * Set up auto-refresh interval
   */
  useEffect(() => {
    if (enabled && currentNetwork) {
      intervalRef.current = setInterval(() => {
        fetchAllData();
      }, REFRESH_INTERVAL);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [enabled, currentNetwork, fetchAllData]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      daoService.cleanup();
    };
  }, []);

  // Computed values
  const activeProposals = proposals.filter(p =>
    new Date() < p.endTime && !p.executed
  );

  const totalValue = proposals.reduce((sum, p) =>
    sum + parseFloat(p.totalInvested || 0), 0
  );

  const isNetworkSupported = currentNetwork &&
    daoService.getNetworkInfo().contractAddress !== '0x0000000000000000000000000000000000000000';

  return {
    // Data
    dashboardMetrics,
    proposals,
    proposers,
    investors,
    executedProposals,
    activeProposals,
    totalValue,

    // State
    isLoading,
    isInitializing,
    error,
    lastUpdated,
    isNetworkSupported,

    // Actions
    refreshData,
    executeProposal,
    initializeService,

    // Individual fetch methods
    fetchDashboardMetrics,
    fetchProposals,
    fetchProposers,
    fetchInvestors,
    fetchExecutedProposals
  };
};

export default useDAOData;