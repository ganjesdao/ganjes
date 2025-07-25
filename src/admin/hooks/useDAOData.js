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
      setError(`Failed to connect to ${currentNetwork?.chainName}: ${error.message}`);
      toast.error(`Connection failed: ${error.message}`);
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
    if (!enabled || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if service is initialized
      const networkInfo = daoService.getNetworkInfo();
      if (!networkInfo.isInitialized) {
        const initialized = await initializeService();
        if (!initialized) return;
      }

      // Fetch all data in parallel
      await Promise.allSettled([
        fetchDashboardMetrics(),
        fetchProposals(),
        fetchProposers(),
        fetchInvestors(),
        fetchExecutedProposals()
      ]);

      if (isMountedRef.current) {
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching DAO data:', error);
      if (isMountedRef.current) {
        setError('Failed to fetch DAO data');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    enabled,
    isLoading,
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
      return result;
    } catch (error) {
      console.error('Error executing proposal:', error);
      throw error;
    }
  }, [fetchAllData]);

  /**
   * Initialize when network changes
   */
  useEffect(() => {
    if (currentNetwork && enabled) {
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