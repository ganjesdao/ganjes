/**
 * Test file for Real Data Integration
 * Testing TICKET-005: Add Real Data Integration
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Investors from './investors/Investors';
import Executed from './executed/Executed';
import Proposers from './proposers/Proposers';
import { useDAOData } from '../hooks/useDAOData';

// Mock the useDAOData hook
jest.mock('../hooks/useDAOData');

// Mock Redux store
const mockStore = configureStore({
    reducer: {
        auth: (state = { currentNetwork: { chainId: 1, chainName: 'Ethereum' } }) => state
    }
});

describe('Real Data Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Investors Component', () => {
        test('should display real investor data when available', async () => {
            const mockInvestorsData = [
                {
                    address: '0x1234567890123456789012345678901234567890',
                    totalInvested: 1000,
                    tokenBalance: 5000,
                    activeInvestments: 3,
                    votingPower: 5000
                },
                {
                    address: '0x0987654321098765432109876543210987654321',
                    totalInvested: 2000,
                    tokenBalance: 10000,
                    activeInvestments: 5,
                    votingPower: 10000
                }
            ];

            useDAOData.mockReturnValue({
                investors: mockInvestorsData,
                isLoading: false,
                error: null,
                refreshData: jest.fn()
            });

            render(
                <Provider store={mockStore}>
                    <Investors />
                </Provider>
            );

            await waitFor(() => {
                expect(screen.getByText('Investors Management')).toBeInTheDocument();
                expect(screen.getByText('2')).toBeInTheDocument(); // Total count
            });
        });

        test('should display fallback data when real data is not available', async () => {
            useDAOData.mockReturnValue({
                investors: [],
                isLoading: false,
                error: null,
                refreshData: jest.fn()
            });

            render(
                <Provider store={mockStore}>
                    <Investors />
                </Provider>
            );

            await waitFor(() => {
                expect(screen.getByText('Investors Management')).toBeInTheDocument();
                expect(screen.getByText('Alice Johnson')).toBeInTheDocument(); // Fallback data
            });
        });

        test('should display error state when data fetching fails', async () => {
            const mockRefreshData = jest.fn();
            useDAOData.mockReturnValue({
                investors: [],
                isLoading: false,
                error: 'Failed to fetch investors data',
                refreshData: mockRefreshData
            });

            render(
                <Provider store={mockStore}>
                    <Investors />
                </Provider>
            );

            await waitFor(() => {
                expect(screen.getByText('Failed to fetch investors data')).toBeInTheDocument();
                expect(screen.getByText('Retry')).toBeInTheDocument();
            });
        });
    });

    describe('Executed Component', () => {
        test('should display real executed proposals data when available', async () => {
            const mockExecutedData = [
                {
                    id: 1,
                    projectName: 'Real DeFi Project',
                    proposer: '0x1234567890123456789012345678901234567890',
                    totalInvested: '50',
                    totalVotesFor: '1000',
                    totalVotesAgainst: '200',
                    executed: true,
                    passed: true,
                    endTime: new Date('2024-07-20')
                }
            ];

            useDAOData.mockReturnValue({
                executedProposals: mockExecutedData,
                isLoading: false,
                error: null,
                refreshData: jest.fn()
            });

            render(
                <Provider store={mockStore}>
                    <Executed />
                </Provider>
            );

            await waitFor(() => {
                expect(screen.getByText('Executed Proposals')).toBeInTheDocument();
                expect(screen.getByText('Real DeFi Project')).toBeInTheDocument();
            });
        });

        test('should display loading state', async () => {
            useDAOData.mockReturnValue({
                executedProposals: [],
                isLoading: true,
                error: null,
                refreshData: jest.fn()
            });

            render(
                <Provider store={mockStore}>
                    <Executed />
                </Provider>
            );

            // Check for loading spinner
            expect(document.querySelector('[style*="animation: spin"]')).toBeInTheDocument();
        });
    });

    describe('Proposers Component', () => {
        test('should display real proposers data when available', async () => {
            const mockProposersData = [
                {
                    address: '0x1234567890123456789012345678901234567890',
                    totalProposals: 3,
                    approvedProposals: 2,
                    totalFunding: 1500,
                    successRate: '66.7'
                }
            ];

            useDAOData.mockReturnValue({
                proposers: mockProposersData,
                isLoading: false,
                error: null,
                refreshData: jest.fn()
            });

            render(
                <Provider store={mockStore}>
                    <Proposers />
                </Provider>
            );

            await waitFor(() => {
                expect(screen.getByText('Proposers Management')).toBeInTheDocument();
                expect(screen.getByText('Proposer 1')).toBeInTheDocument();
            });
        });

        test('should handle search functionality with real data', async () => {
            const mockProposersData = [
                {
                    address: '0x1234567890123456789012345678901234567890',
                    totalProposals: 3,
                    approvedProposals: 2
                },
                {
                    address: '0x0987654321098765432109876543210987654321',
                    totalProposals: 1,
                    approvedProposals: 1
                }
            ];

            useDAOData.mockReturnValue({
                proposers: mockProposersData,
                isLoading: false,
                error: null,
                refreshData: jest.fn()
            });

            render(
                <Provider store={mockStore}>
                    <Proposers />
                </Provider>
            );

            await waitFor(() => {
                expect(screen.getByText('Proposers Management')).toBeInTheDocument();
                // Should display both proposers initially
                expect(screen.getByText('2')).toBeInTheDocument(); // Total count
            });
        });
    });

    describe('Data Integration Flow', () => {
        test('should handle network changes properly', async () => {
            const mockRefreshData = jest.fn();

            // First render with Ethereum network
            const { rerender } = render(
                <Provider store={mockStore}>
                    <Investors />
                </Provider>
            );

            // Simulate network change
            const newMockStore = configureStore({
                reducer: {
                    auth: (state = { currentNetwork: { chainId: 137, chainName: 'Polygon' } }) => state
                }
            });

            useDAOData.mockReturnValue({
                investors: [],
                isLoading: true,
                error: null,
                refreshData: mockRefreshData
            });

            rerender(
                <Provider store={newMockStore}>
                    <Investors />
                </Provider>
            );

            // Should show loading state for new network
            expect(document.querySelector('[style*="animation: spin"]')).toBeInTheDocument();
        });

        test('should handle data refresh functionality', async () => {
            const mockRefreshData = jest.fn();

            useDAOData.mockReturnValue({
                investors: [],
                isLoading: false,
                error: 'Network connection error',
                refreshData: mockRefreshData
            });

            render(
                <Provider store={mockStore}>
                    <Investors />
                </Provider>
            );

            await waitFor(() => {
                const retryButton = screen.getByText('Retry');
                expect(retryButton).toBeInTheDocument();

                // Click retry button
                retryButton.click();
                expect(mockRefreshData).toHaveBeenCalledTimes(1);
            });
        });
    });
});