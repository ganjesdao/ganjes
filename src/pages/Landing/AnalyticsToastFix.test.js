/**
 * Test file for Analytics Toast Notification Fix
 * Testing the improved error handling and user feedback for analytics fetching
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import Landing from './Landing';

// Mock dependencies
jest.mock('react-toastify', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn()
    },
    ToastContainer: () => <div data-testid="toast-container" />
}));

jest.mock('../../utils/networks', () => ({
    getContractAddress: jest.fn(() => '0x1234567890123456789012345678901234567890'),
    isTestnet: jest.fn(() => false)
}));

jest.mock('../../Auth/Abi', () => ({
    daoABI: []
}));

// Mock ethers
const mockContract = {
    getTotalProposals: jest.fn(),
    getApprovedProposals: jest.fn(),
    getRunningProposals: jest.fn(),
    getTotalFundedAmount: jest.fn(),
    getActiveInvestorCount: jest.fn()
};

jest.mock('ethers', () => ({
    ethers: {
        BrowserProvider: jest.fn(() => ({})),
        Contract: jest.fn(() => mockContract),
        formatEther: jest.fn((value) => value.toString())
    }
}));

// Mock window.ethereum
const mockEthereum = {
    request: jest.fn(),
    on: jest.fn()
};

Object.defineProperty(window, 'ethereum', {
    value: mockEthereum,
    writable: true
});

describe('Analytics Toast Notification Fix', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockEthereum.request.mockResolvedValue(['0x1234567890123456789012345678901234567890']);
    });

    const renderLanding = () => {
        return render(
            <BrowserRouter>
                <Landing />
            </BrowserRouter>
        );
    };

    describe('Improved Analytics Fetching', () => {
        test('should show immediate loading feedback when fetching analytics', async () => {
            // Mock successful contract calls
            mockContract.getTotalProposals.mockResolvedValue(5);
            mockContract.getApprovedProposals.mockResolvedValue([3]);
            mockContract.getRunningProposals.mockResolvedValue([2]);
            mockContract.getTotalFundedAmount.mockResolvedValue('1000000000000000000');
            mockContract.getActiveInvestorCount.mockResolvedValue(10);

            renderLanding();

            // Wait for component to initialize and start fetching
            await waitFor(() => {
                expect(toast.info).toHaveBeenCalledWith('📊 Fetching analytics data...', { autoClose: 2000 });
            });
        });

        test('should handle individual contract call failures gracefully', async () => {
            // Mock some successful and some failed calls
            mockContract.getTotalProposals.mockResolvedValue(5);
            mockContract.getApprovedProposals.mockRejectedValue(new Error('Network error'));
            mockContract.getRunningProposals.mockResolvedValue([2]);
            mockContract.getTotalFundedAmount.mockRejectedValue(new Error('Timeout'));
            mockContract.getActiveInvestorCount.mockResolvedValue(10);

            renderLanding();

            await waitFor(() => {
                expect(toast.warning).toHaveBeenCalledWith(
                    expect.stringContaining('Some analytics data may be incomplete'),
                    { autoClose: 4000 }
                );
            });
        });

        test('should implement retry mechanism with exponential backoff', async () => {
            // Mock all calls to fail initially
            mockContract.getTotalProposals.mockRejectedValue(new Error('Network error'));
            mockContract.getApprovedProposals.mockRejectedValue(new Error('Network error'));
            mockContract.getRunningProposals.mockRejectedValue(new Error('Network error'));
            mockContract.getTotalFundedAmount.mockRejectedValue(new Error('Network error'));
            mockContract.getActiveInvestorCount.mockRejectedValue(new Error('Network error'));

            renderLanding();

            // Should show retry messages
            await waitFor(() => {
                expect(toast.warning).toHaveBeenCalledWith(
                    expect.stringContaining('Retrying analytics fetch')
                );
            }, { timeout: 5000 });
        });

        test('should show final error message after max retries', async () => {
            // Mock all calls to fail consistently
            mockContract.getTotalProposals.mockRejectedValue(new Error('Persistent network error'));
            mockContract.getApprovedProposals.mockRejectedValue(new Error('Persistent network error'));
            mockContract.getRunningProposals.mockRejectedValue(new Error('Persistent network error'));
            mockContract.getTotalFundedAmount.mockRejectedValue(new Error('Persistent network error'));
            mockContract.getActiveInvestorCount.mockRejectedValue(new Error('Persistent network error'));

            renderLanding();

            // Should eventually show final error
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to fetch analytics after 3 attempts'),
                    { autoClose: 6000 }
                );
            }, { timeout: 10000 });
        });

        test('should handle timeout errors specifically', async () => {
            // Mock calls to timeout
            mockContract.getTotalProposals.mockImplementation(() =>
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), 100)
                )
            );

            renderLanding();

            await waitFor(() => {
                expect(console.warn).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to fetch total proposals:'),
                    'Request timeout'
                );
            });
        });
    });

    describe('UI Loading States', () => {
        test('should show loading spinners in stats cards during fetch', async () => {
            // Mock slow contract calls
            mockContract.getTotalProposals.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(5), 1000))
            );
            mockContract.getApprovedProposals.mockResolvedValue([3]);
            mockContract.getRunningProposals.mockResolvedValue([2]);
            mockContract.getTotalFundedAmount.mockResolvedValue('1000000000000000000');
            mockContract.getActiveInvestorCount.mockResolvedValue(10);

            renderLanding();

            // Should show loading spinners
            await waitFor(() => {
                const spinners = screen.getAllByRole('status');
                expect(spinners.length).toBeGreaterThan(0);
            });
        });

        test('should show refresh button and handle manual refresh', async () => {
            mockContract.getTotalProposals.mockResolvedValue(5);
            mockContract.getApprovedProposals.mockResolvedValue([3]);
            mockContract.getRunningProposals.mockResolvedValue([2]);
            mockContract.getTotalFundedAmount.mockResolvedValue('1000000000000000000');
            mockContract.getActiveInvestorCount.mockResolvedValue(10);

            renderLanding();

            // Wait for initial load
            await waitFor(() => {
                expect(screen.getByText('Refresh Analytics')).toBeInTheDocument();
            });

            // Click refresh button
            const refreshButton = screen.getByText('Refresh Analytics');
            fireEvent.click(refreshButton);

            // Should show refreshing state
            await waitFor(() => {
                expect(screen.getByText('Refreshing...')).toBeInTheDocument();
            });
        });

        test('should show error indicator when stats have errors', async () => {
            // Mock some failed calls
            mockContract.getTotalProposals.mockRejectedValue(new Error('Network error'));
            mockContract.getApprovedProposals.mockResolvedValue([3]);
            mockContract.getRunningProposals.mockResolvedValue([2]);
            mockContract.getTotalFundedAmount.mockResolvedValue('1000000000000000000');
            mockContract.getActiveInvestorCount.mockResolvedValue(10);

            renderLanding();

            await waitFor(() => {
                expect(screen.getByText('Some data may be incomplete')).toBeInTheDocument();
            });
        });
    });

    describe('Network Integration', () => {
        test('should show network name in analytics controls', async () => {
            mockContract.getTotalProposals.mockResolvedValue(5);
            mockContract.getApprovedProposals.mockResolvedValue([3]);
            mockContract.getRunningProposals.mockResolvedValue([2]);
            mockContract.getTotalFundedAmount.mockResolvedValue('1000000000000000000');
            mockContract.getActiveInvestorCount.mockResolvedValue(10);

            renderLanding();

            // Should show network information
            await waitFor(() => {
                // Network name should be displayed (mocked network would be shown)
                const networkElements = screen.getAllByText(/network/i);
                expect(networkElements.length).toBeGreaterThan(0);
            });
        });

        test('should handle refresh when no network is connected', async () => {
            renderLanding();

            // Wait for component to load
            await waitFor(() => {
                expect(screen.getByText('Refresh Analytics')).toBeInTheDocument();
            });

            // Click refresh without network
            const refreshButton = screen.getByText('Refresh Analytics');
            fireEvent.click(refreshButton);

            expect(toast.warning).toHaveBeenCalledWith('⚠️ Please connect to a network first');
        });
    });

    describe('Performance Improvements', () => {
        test('should use Promise.allSettled for parallel execution', async () => {
            const startTime = Date.now();

            // Mock all calls with delays
            mockContract.getTotalProposals.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(5), 100))
            );
            mockContract.getApprovedProposals.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve([3]), 100))
            );
            mockContract.getRunningProposals.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve([2]), 100))
            );
            mockContract.getTotalFundedAmount.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve('1000000000000000000'), 100))
            );
            mockContract.getActiveInvestorCount.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(10), 100))
            );

            renderLanding();

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith(
                    '✅ Analytics data loaded successfully!',
                    { autoClose: 2000 }
                );
            });

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            // Should execute in parallel (around 100ms) rather than sequential (500ms)
            expect(executionTime).toBeLessThan(300);
        });
    });
});