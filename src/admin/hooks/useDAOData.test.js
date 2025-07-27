/**
 * Test file for useDAOData hook
 * Testing error handling improvements
 */

import { renderHook, act } from '@testing-library/react';
import { toast } from 'react-toastify';
import { useDAOData } from './useDAOData';
import { daoService } from '../services/daoService';

// Mock dependencies
jest.mock('react-toastify', () => ({
    toast: {
        error: jest.fn(),
        warn: jest.fn(),
        success: jest.fn()
    }
}));

jest.mock('../services/daoService', () => ({
    daoService: {
        initialize: jest.fn(),
        cleanup: jest.fn(),
        getNetworkInfo: jest.fn(),
        getDashboardMetrics: jest.fn(),
        getAllProposals: jest.fn(),
        getProposersData: jest.fn(),
        getInvestorsData: jest.fn(),
        getExecutedProposals: jest.fn(),
        executeProposal: jest.fn()
    }
}));

describe('useDAOData Hook - Error Handling', () => {
    const mockNetwork = {
        chainId: 1,
        chainName: 'Ethereum Mainnet'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Default successful network info
        daoService.getNetworkInfo.mockReturnValue({
            isInitialized: true,
            contractAddress: '0x1234567890123456789012345678901234567890'
        });
    });

    describe('Service Initialization Error Handling', () => {
        test('should handle connection errors with user-friendly messages', async () => {
            const connectionError = new Error('MetaMask not connected');
            daoService.initialize.mockRejectedValue(connectionError);

            const { result } = renderHook(() => useDAOData(mockNetwork, true));

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            expect(result.current.error).toContain('Please connect your wallet');
            expect(toast.warn).toHaveBeenCalledWith('Please connect your wallet to continue');
        });

        test('should handle network errors with specific messages', async () => {
            const networkError = new Error('Network connection failed');
            daoService.initialize.mockRejectedValue(networkError);

            const { result } = renderHook(() => useDAOData(mockNetwork, true));

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            expect(result.current.error).toContain('Failed to connect to Ethereum Mainnet');
            expect(toast.error).toHaveBeenCalledWith('Connection failed: Network connection failed');
        });
    });

    describe('Data Fetching Error Handling', () => {
        test('should handle partial data fetch failures', async () => {
            // Setup successful initialization
            daoService.initialize.mockResolvedValue(true);
            daoService.getNetworkInfo.mockReturnValue({
                isInitialized: true,
                contractAddress: '0x1234567890123456789012345678901234567890'
            });

            // Mock some successful and some failed requests
            daoService.getDashboardMetrics.mockResolvedValue({ totalValue: 1000 });
            daoService.getAllProposals.mockRejectedValue(new Error('Proposals fetch failed'));
            daoService.getProposersData.mockResolvedValue([]);
            daoService.getInvestorsData.mockResolvedValue([]);
            daoService.getExecutedProposals.mockResolvedValue([]);

            const { result } = renderHook(() => useDAOData(mockNetwork, true));

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 200));
            });

            expect(result.current.error).toContain('Some data could not be loaded');
            expect(toast.warn).toHaveBeenCalledWith('Some data could not be loaded. Please check your connection.');
        });

        test('should handle complete data fetch failure', async () => {
            // Setup successful initialization
            daoService.initialize.mockResolvedValue(true);
            daoService.getNetworkInfo.mockReturnValue({
                isInitialized: false // This will trigger initialization
            });

            // Mock initialization to succeed but data fetch to fail
            daoService.initialize.mockResolvedValue(true);
            const fetchError = new Error('Network timeout');

            // Make fetchAllData throw an error
            daoService.getDashboardMetrics.mockRejectedValue(fetchError);

            const { result } = renderHook(() => useDAOData(mockNetwork, true));

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 200));
            });

            expect(toast.error).toHaveBeenCalled();
        });
    });

    describe('Proposal Execution Error Handling', () => {
        test('should handle insufficient funds error', async () => {
            const insufficientFundsError = new Error('insufficient funds for gas');
            daoService.executeProposal.mockRejectedValue(insufficientFundsError);

            const { result } = renderHook(() => useDAOData(mockNetwork, true));

            await act(async () => {
                try {
                    await result.current.executeProposal(1);
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(toast.error).toHaveBeenCalledWith('Insufficient funds to execute this proposal');
            expect(result.current.error).toBe('Insufficient funds to execute this proposal');
        });

        test('should handle authorization error', async () => {
            const authError = new Error('not authorized to execute');
            daoService.executeProposal.mockRejectedValue(authError);

            const { result } = renderHook(() => useDAOData(mockNetwork, true));

            await act(async () => {
                try {
                    await result.current.executeProposal(1);
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(toast.error).toHaveBeenCalledWith('You are not authorized to execute this proposal');
            expect(result.current.error).toBe('You are not authorized to execute this proposal');
        });

        test('should handle successful proposal execution', async () => {
            const successResult = { transactionHash: '0xabc123' };
            daoService.executeProposal.mockResolvedValue(successResult);

            // Mock successful data refresh
            daoService.getDashboardMetrics.mockResolvedValue({ totalValue: 1000 });
            daoService.getAllProposals.mockResolvedValue([]);
            daoService.getProposersData.mockResolvedValue([]);
            daoService.getInvestorsData.mockResolvedValue([]);
            daoService.getExecutedProposals.mockResolvedValue([]);

            const { result } = renderHook(() => useDAOData(mockNetwork, true));

            let executionResult;
            await act(async () => {
                executionResult = await result.current.executeProposal(1);
            });

            expect(executionResult).toEqual(successResult);
            expect(toast.success).toHaveBeenCalledWith('Proposal executed successfully!');
        });
    });

    describe('Error State Management', () => {
        test('should clear error state on successful operations', async () => {
            // First, cause an error
            const error = new Error('Initial error');
            daoService.initialize.mockRejectedValueOnce(error);

            const { result } = renderHook(() => useDAOData(mockNetwork, true));

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            expect(result.current.error).toBeTruthy();

            // Then, make subsequent calls successful
            daoService.initialize.mockResolvedValue(true);
            daoService.getDashboardMetrics.mockResolvedValue({ totalValue: 1000 });
            daoService.getAllProposals.mockResolvedValue([]);
            daoService.getProposersData.mockResolvedValue([]);
            daoService.getInvestorsData.mockResolvedValue([]);
            daoService.getExecutedProposals.mockResolvedValue([]);

            await act(async () => {
                await result.current.refreshData();
            });

            // Error should be cleared after successful refresh
            expect(result.current.error).toBeNull();
            expect(toast.success).toHaveBeenCalledWith('Data refreshed successfully');
        });
    });
});