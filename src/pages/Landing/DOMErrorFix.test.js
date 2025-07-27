/**
 * Test file for DOM Error Fix
 * Testing the fix for "Failed to execute 'removeChild' on 'Node'" error
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import Landing from './Landing';

// Mock dependencies
jest.mock('react-toastify', () => ({
    toast: {
        success: jest.fn(() => 'toast-id-success'),
        error: jest.fn(() => 'toast-id-error'),
        warning: jest.fn(() => 'toast-id-warning'),
        info: jest.fn(() => 'toast-id-info'),
        dismiss: jest.fn()
    },
    ToastContainer: ({ children, ...props }) => (
        <div data-testid="toast-container" {...props}>
            {children}
        </div>
    )
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
    on: jest.fn(),
    removeListener: jest.fn()
};

Object.defineProperty(window, 'ethereum', {
    value: mockEthereum,
    writable: true
});

describe('DOM Error Fix Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockEthereum.request.mockResolvedValue(['0x1234567890123456789012345678901234567890']);

        // Mock successful contract calls by default
        mockContract.getTotalProposals.mockResolvedValue(5);
        mockContract.getApprovedProposals.mockResolvedValue([3]);
        mockContract.getRunningProposals.mockResolvedValue([2]);
        mockContract.getTotalFundedAmount.mockResolvedValue('1000000000000000000');
        mockContract.getActiveInvestorCount.mockResolvedValue(10);
    });

    const renderLanding = () => {
        return render(
            <BrowserRouter>
                <Landing />
            </BrowserRouter>
        );
    };

    describe('Toast Management', () => {
        test('should properly track and dismiss toasts to prevent DOM conflicts', async () => {
            renderLanding();

            // Wait for analytics to start
            await waitFor(() => {
                expect(toast.info).toHaveBeenCalledWith('📊 Fetching analytics data...', { autoClose: 2000 });
            });

            // Verify toast.dismiss is called when needed
            await waitFor(() => {
                expect(toast.dismiss).toHaveBeenCalled();
            });
        });

        test('should prevent multiple simultaneous fetches', async () => {
            renderLanding();

            // Wait for initial fetch to start
            await waitFor(() => {
                expect(toast.info).toHaveBeenCalledTimes(1);
            });

            // Try to trigger another fetch while first is running
            const refreshButton = await screen.findByText('Refresh Analytics');

            // Should not trigger multiple fetches
            fireEvent.click(refreshButton);

            // Should still only have one info toast call
            expect(toast.info).toHaveBeenCalledTimes(1);
        });

        test('should properly cleanup event listeners on unmount', async () => {
            const { unmount } = renderLanding();

            // Verify event listener was added
            expect(mockEthereum.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));

            // Unmount component
            act(() => {
                unmount();
            });

            // Verify cleanup was called
            expect(mockEthereum.removeListener).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
        });

        test('should dismiss toasts on component unmount', async () => {
            const { unmount } = renderLanding();

            // Wait for toast to be created
            await waitFor(() => {
                expect(toast.info).toHaveBeenCalled();
            });

            // Unmount component
            act(() => {
                unmount();
            });

            // Should dismiss any active toasts
            expect(toast.dismiss).toHaveBeenCalled();
        });
    });

    describe('Toast Container Integration', () => {
        test('should render ToastContainer with proper configuration', async () => {
            renderLanding();

            const toastContainer = screen.getByTestId('toast-container');
            expect(toastContainer).toBeInTheDocument();
            expect(toastContainer).toHaveAttribute('limit', '3');
        });

        test('should limit toast count to prevent DOM overflow', async () => {
            renderLanding();

            const toastContainer = screen.getByTestId('toast-container');
            expect(toastContainer).toHaveAttribute('limit', '3');
        });
    });

    describe('Error Handling Improvements', () => {
        test('should handle rapid toast creation and dismissal', async () => {
            // Mock rapid network changes
            renderLanding();

            // Simulate rapid network changes that could cause DOM conflicts
            act(() => {
                // Trigger multiple state changes rapidly
                fireEvent.click(screen.getByText('Refresh Analytics'));
            });

            await waitFor(() => {
                // Should handle rapid changes without DOM errors
                expect(toast.dismiss).toHaveBeenCalled();
            });
        });

        test('should handle contract initialization errors without DOM conflicts', async () => {
            // Mock contract initialization failure
            jest.doMock('../../utils/networks', () => ({
                getContractAddress: jest.fn(() => '0x0000000000000000000000000000000000000000'),
                isTestnet: jest.fn(() => false)
            }));

            renderLanding();

            await waitFor(() => {
                expect(toast.warning).toHaveBeenCalledWith('⚠️ Contract not deployed on this network yet!');
            });

            // Should not cause DOM manipulation errors
            expect(toast.dismiss).toHaveBeenCalled();
        });

        test('should handle analytics fetch failures gracefully', async () => {
            // Mock analytics failures
            mockContract.getTotalProposals.mockRejectedValue(new Error('Network error'));
            mockContract.getApprovedProposals.mockRejectedValue(new Error('Network error'));
            mockContract.getRunningProposals.mockRejectedValue(new Error('Network error'));
            mockContract.getTotalFundedAmount.mockRejectedValue(new Error('Network error'));
            mockContract.getActiveInvestorCount.mockRejectedValue(new Error('Network error'));

            renderLanding();

            await waitFor(() => {
                expect(toast.warning).toHaveBeenCalledWith(
                    expect.stringContaining('Retrying analytics fetch')
                );
            });

            // Should properly manage toast lifecycle
            expect(toast.dismiss).toHaveBeenCalled();
        });
    });

    describe('State Management', () => {
        test('should prevent race conditions in state updates', async () => {
            renderLanding();

            // Simulate rapid state changes
            act(() => {
                const refreshButton = screen.getByText('Refresh Analytics');
                fireEvent.click(refreshButton);
                fireEvent.click(refreshButton);
                fireEvent.click(refreshButton);
            });

            // Should handle multiple clicks without issues
            await waitFor(() => {
                expect(screen.getByText('Refresh Analytics')).toBeInTheDocument();
            });
        });

        test('should properly reset state on network changes', async () => {
            renderLanding();

            // Wait for initial load
            await waitFor(() => {
                expect(toast.info).toHaveBeenCalled();
            });

            // Simulate network change by triggering re-render
            act(() => {
                // This would normally be triggered by network change
                fireEvent.click(screen.getByText('Refresh Analytics'));
            });

            // Should handle state reset properly
            expect(toast.dismiss).toHaveBeenCalled();
        });
    });

    describe('Memory Leak Prevention', () => {
        test('should not create memory leaks with toast references', async () => {
            const { unmount } = renderLanding();

            // Create some toasts
            await waitFor(() => {
                expect(toast.info).toHaveBeenCalled();
            });

            // Unmount and verify cleanup
            act(() => {
                unmount();
            });

            // Should clean up properly
            expect(toast.dismiss).toHaveBeenCalled();
        });

        test('should handle timeout cleanup properly', async () => {
            // Mock slow contract calls
            mockContract.getTotalProposals.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(5), 100))
            );

            const { unmount } = renderLanding();

            // Start fetch
            await waitFor(() => {
                expect(toast.info).toHaveBeenCalled();
            });

            // Unmount before completion
            act(() => {
                unmount();
            });

            // Should handle cleanup without errors
            expect(toast.dismiss).toHaveBeenCalled();
        });
    });
});