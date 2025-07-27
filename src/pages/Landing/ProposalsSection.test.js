/**
 * Test file for Proposals Section
 * Testing the "No proposals found on this network" message and proposals display
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
    getActiveInvestorCount: jest.fn(),
    getAllProposalIds: jest.fn(),
    getProposalBasicDetails: jest.fn(),
    getProposalVotingDetails: jest.fn()
};

jest.mock('ethers', () => ({
    ethers: {
        BrowserProvider: jest.fn(() => ({})),
        Contract: jest.fn(() => mockContract),
        formatEther: jest.fn((value) => (parseFloat(value) / 1e18).toString())
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

// Mock localStorage
const mockLocalStorage = {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});

describe('Proposals Section Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockEthereum.request.mockResolvedValue(['0x1234567890123456789012345678901234567890']);

        // Mock default successful stats calls
        mockContract.getTotalProposals.mockResolvedValue(0);
        mockContract.getApprovedProposals.mockResolvedValue([0]);
        mockContract.getRunningProposals.mockResolvedValue([0]);
        mockContract.getTotalFundedAmount.mockResolvedValue('0');
        mockContract.getActiveInvestorCount.mockResolvedValue(0);
    });

    const renderLanding = () => {
        return render(
            <BrowserRouter>
                <Landing />
            </BrowserRouter>
        );
    };

    describe('No Proposals State', () => {
        test('should show "No Proposals Found" message when no proposals exist', async () => {
            // Mock empty proposals
            mockContract.getAllProposalIds.mockResolvedValue([]);

            renderLanding();

            // Wait for loading to complete
            await waitFor(() => {
                expect(screen.getByText('No Proposals Found')).toBeInTheDocument();
            });

            // Check the message content
            expect(screen.getByText(/No proposals found on/)).toBeInTheDocument();
            expect(screen.getByText(/Be the first to submit a proposal/)).toBeInTheDocument();
        });

        test('should show network name in no proposals message', async () => {
            mockContract.getAllProposalIds.mockResolvedValue([]);

            renderLanding();

            await waitFor(() => {
                expect(screen.getByText('No Proposals Found')).toBeInTheDocument();
            });

            // Should show network name (mocked network would be displayed)
            const networkText = screen.getByText(/network/i);
            expect(networkText).toBeInTheDocument();
        });

        test('should show submit proposal button when no proposals found', async () => {
            mockContract.getAllProposalIds.mockResolvedValue([]);

            renderLanding();

            await waitFor(() => {
                expect(screen.getByText('Submit Proposal')).toBeInTheDocument();
            });

            const submitButton = screen.getByText('Submit Proposal');
            expect(submitButton).toHaveClass('btn-primary');
        });

        test('should show refresh button when no proposals found', async () => {
            mockContract.getAllProposalIds.mockResolvedValue([]);

            renderLanding();

            await waitFor(() => {
                expect(screen.getByText('Refresh')).toBeInTheDocument();
            });

            const refreshButton = screen.getByText('Refresh');
            expect(refreshButton).toHaveClass('btn-outline-secondary');
        });
    });

    describe('No Network State', () => {
        test('should show "No Network Connected" message when no network is connected', async () => {
            // Mock no network scenario by not setting up contract
            mockEthereum.request.mockResolvedValue([]);

            renderLanding();

            await waitFor(() => {
                expect(screen.getByText('No Network Connected')).toBeInTheDocument();
            });

            expect(screen.getByText('Please connect to a network to view proposals')).toBeInTheDocument();
        });
    });

    describe('Loading State', () => {
        test('should show loading spinner while fetching proposals', async () => {
            // Mock slow contract calls
            mockContract.getAllProposalIds.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve([]), 1000))
            );

            renderLanding();

            // Should show loading state
            await waitFor(() => {
                expect(screen.getByText('Loading proposals from blockchain...')).toBeInTheDocument();
            });

            const spinner = screen.getByRole('status');
            expect(spinner).toBeInTheDocument();
        });
    });

    describe('Proposals Display', () => {
        const mockProposalData = [
            {
                id: '1',
                projectName: 'Test Project 1',
                projectUrl: 'https://test1.com',
                description: 'This is a test project description',
                fundingGoal: '10000000000000000000', // 10 ETH in wei
                totalInvested: '5000000000000000000', // 5 ETH in wei
                endTime: Date.now() / 1000 + 86400, // 1 day from now
                passed: false
            },
            {
                id: '2',
                projectName: 'Test Project 2',
                projectUrl: 'https://test2.com',
                description: 'Another test project',
                fundingGoal: '20000000000000000000', // 20 ETH in wei
                totalInvested: '20000000000000000000', // 20 ETH in wei
                endTime: Date.now() / 1000 - 86400, // 1 day ago
                passed: true
            }
        ];

        test('should display proposals when they exist', async () => {
            // Mock proposals exist
            mockContract.getAllProposalIds.mockResolvedValue(['1', '2']);
            mockContract.getProposalBasicDetails.mockImplementation((id) => {
                const proposal = mockProposalData.find(p => p.id === id);
                return Promise.resolve({
                    id: proposal.id,
                    projectName: proposal.projectName,
                    projectUrl: proposal.projectUrl,
                    description: proposal.description,
                    fundingGoal: proposal.fundingGoal,
                    endTime: proposal.endTime,
                    passed: proposal.passed
                });
            });
            mockContract.getProposalVotingDetails.mockImplementation((id) => {
                const proposal = mockProposalData.find(p => p.id === id);
                return Promise.resolve({
                    totalInvested: proposal.totalInvested
                });
            });

            renderLanding();

            // Wait for proposals to load
            await waitFor(() => {
                expect(screen.getByText('Test Project 1')).toBeInTheDocument();
                expect(screen.getByText('Test Project 2')).toBeInTheDocument();
            });

            // Check proposal details
            expect(screen.getByText('This is a test project description')).toBeInTheDocument();
            expect(screen.getByText('Another test project')).toBeInTheDocument();
        });

        test('should show correct proposal status badges', async () => {
            mockContract.getAllProposalIds.mockResolvedValue(['1', '2']);
            mockContract.getProposalBasicDetails.mockImplementation((id) => {
                const proposal = mockProposalData.find(p => p.id === id);
                return Promise.resolve({
                    id: proposal.id,
                    projectName: proposal.projectName,
                    projectUrl: proposal.projectUrl,
                    description: proposal.description,
                    fundingGoal: proposal.fundingGoal,
                    endTime: proposal.endTime,
                    passed: proposal.passed
                });
            });
            mockContract.getProposalVotingDetails.mockImplementation((id) => {
                const proposal = mockProposalData.find(p => p.id === id);
                return Promise.resolve({
                    totalInvested: proposal.totalInvested
                });
            });

            renderLanding();

            await waitFor(() => {
                expect(screen.getByText('Pending')).toBeInTheDocument();
                expect(screen.getByText('Approved')).toBeInTheDocument();
            });
        });

        test('should handle proposal click navigation', async () => {
            mockContract.getAllProposalIds.mockResolvedValue(['1']);
            mockContract.getProposalBasicDetails.mockResolvedValue({
                id: '1',
                projectName: 'Test Project 1',
                projectUrl: 'https://test1.com',
                description: 'Test description',
                fundingGoal: '10000000000000000000',
                endTime: Date.now() / 1000 + 86400,
                passed: false
            });
            mockContract.getProposalVotingDetails.mockResolvedValue({
                totalInvested: '5000000000000000000'
            });

            renderLanding();

            await waitFor(() => {
                expect(screen.getByText('Test Project 1')).toBeInTheDocument();
            });

            // Click on proposal
            const viewButton = screen.getByTitle('View Details');
            fireEvent.click(viewButton);

            // Should store proposal ID in localStorage
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('proposalId', '1');
        });

        test('should show "View All Proposals" button when proposals exist', async () => {
            mockContract.getAllProposalIds.mockResolvedValue(['1']);
            mockContract.getProposalBasicDetails.mockResolvedValue({
                id: '1',
                projectName: 'Test Project 1',
                projectUrl: 'https://test1.com',
                description: 'Test description',
                fundingGoal: '10000000000000000000',
                endTime: Date.now() / 1000 + 86400,
                passed: false
            });
            mockContract.getProposalVotingDetails.mockResolvedValue({
                totalInvested: '5000000000000000000'
            });

            renderLanding();

            await waitFor(() => {
                expect(screen.getByText('View All Proposals')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle proposal fetch errors gracefully', async () => {
            mockContract.getAllProposalIds.mockRejectedValue(new Error('Network error'));

            renderLanding();

            await waitFor(() => {
                expect(screen.getByText('No Proposals Found')).toBeInTheDocument();
            });
        });

        test('should handle individual proposal fetch errors', async () => {
            mockContract.getAllProposalIds.mockResolvedValue(['1', '2']);
            mockContract.getProposalBasicDetails.mockImplementation((id) => {
                if (id === '1') {
                    return Promise.reject(new Error('Failed to fetch proposal 1'));
                }
                return Promise.resolve({
                    id: '2',
                    projectName: 'Test Project 2',
                    projectUrl: 'https://test2.com',
                    description: 'Test description',
                    fundingGoal: '10000000000000000000',
                    endTime: Date.now() / 1000 + 86400,
                    passed: false
                });
            });
            mockContract.getProposalVotingDetails.mockResolvedValue({
                totalInvested: '5000000000000000000'
            });

            renderLanding();

            // Should still show the successful proposal
            await waitFor(() => {
                expect(screen.getByText('Test Project 2')).toBeInTheDocument();
            });

            // Should not show the failed proposal
            expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument();
        });
    });

    describe('UI Interactions', () => {
        test('should handle card hover effects', async () => {
            mockContract.getAllProposalIds.mockResolvedValue(['1']);
            mockContract.getProposalBasicDetails.mockResolvedValue({
                id: '1',
                projectName: 'Test Project 1',
                projectUrl: 'https://test1.com',
                description: 'Test description',
                fundingGoal: '10000000000000000000',
                endTime: Date.now() / 1000 + 86400,
                passed: false
            });
            mockContract.getProposalVotingDetails.mockResolvedValue({
                totalInvested: '5000000000000000000'
            });

            renderLanding();

            await waitFor(() => {
                expect(screen.getByText('Test Project 1')).toBeInTheDocument();
            });

            const card = screen.getByText('Test Project 1').closest('.card');
            expect(card).toHaveStyle('transition: all 0.3s ease');
        });
    });
});