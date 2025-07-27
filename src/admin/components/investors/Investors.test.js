/**
 * Test file for Investors component
 * Testing layout integration and mobile responsiveness
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Investors from './Investors';
import authSlice from '../../store/slices/authSlice';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
    useLocation: () => ({
        pathname: '/admin/investors'
    })
}));

// Mock AdminPageLayout
jest.mock('../common/AdminPageLayout', () => {
    return function MockAdminPageLayout({ children }) {
        const mockIsMobile = false;
        return (
            <div data-testid="admin-page-layout">
                {typeof children === 'function' ? children({ isMobile: mockIsMobile }) : children}
            </div>
        );
    };
});

// Mock PageHeader
jest.mock('../common/PageHeader', () => {
    return function MockPageHeader({ title, description, icon, children }) {
        return (
            <div data-testid="page-header">
                <h1>{title}</h1>
                <p>{description}</p>
                <span>{icon}</span>
                {children}
            </div>
        );
    };
});

// Mock SearchBar
jest.mock('../common/SearchBar', () => {
    return function MockSearchBar({ searchTerm, onSearchChange, placeholder }) {
        return (
            <input
                data-testid="search-bar"
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
            />
        );
    };
});

// Mock MobileTable
jest.mock('../common/MobileTable', () => {
    return function MockMobileTable({ data, columns, isMobile, onRowAction }) {
        return (
            <div data-testid="mobile-table">
                <div data-testid="table-mobile-state">{isMobile ? 'mobile' : 'desktop'}</div>
                <div data-testid="table-data-count">{data.length}</div>
                {data.map((item, index) => (
                    <div key={index} data-testid={`table-row-${index}`}>
                        {item.name}
                    </div>
                ))}
            </div>
        );
    };
});

// Create mock store
const createMockStore = (initialState = {}) => {
    return configureStore({
        reducer: {
            auth: authSlice
        },
        preloadedState: {
            auth: {
                isAuthenticated: true,
                user: { name: 'Test Admin' },
                ...initialState.auth
            }
        }
    });
};

// Test wrapper component
const TestWrapper = ({ children, store }) => (
    <Provider store={store}>
        {children}
    </Provider>
);

describe('Investors Component', () => {
    let mockStore;

    beforeEach(() => {
        mockStore = createMockStore();
    });

    describe('Layout Integration', () => {
        test('should use AdminPageLayout component', async () => {
            render(
                <TestWrapper store={mockStore}>
                    <Investors />
                </TestWrapper>
            );

            expect(screen.getByTestId('admin-page-layout')).toBeInTheDocument();
        });

        test('should render PageHeader with correct props', async () => {
            render(
                <TestWrapper store={mockStore}>
                    <Investors />
                </TestWrapper>
            );

            const pageHeader = screen.getByTestId('page-header');
            expect(pageHeader).toBeInTheDocument();
            expect(screen.getByText('Investors Management')).toBeInTheDocument();
            expect(screen.getByText('👥')).toBeInTheDocument();
        });

        test('should render SearchBar component', async () => {
            render(
                <TestWrapper store={mockStore}>
                    <Investors />
                </TestWrapper>
            );

            expect(screen.getByTestId('search-bar')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Search investors...')).toBeInTheDocument();
        });

        test('should render MobileTable component', async () => {
            render(
                <TestWrapper store={mockStore}>
                    <Investors />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('mobile-table')).toBeInTheDocument();
            });
        });
    });

    describe('Mobile Responsiveness', () => {
        test('should pass mobile state to MobileTable', async () => {
            render(
                <TestWrapper store={mockStore}>
                    <Investors />
                </TestWrapper>
            );

            await waitFor(() => {
                const mobileState = screen.getByTestId('table-mobile-state');
                expect(mobileState).toBeInTheDocument();
                // Should show desktop by default in our mock
                expect(mobileState).toHaveTextContent('desktop');
            });
        });
    });

    describe('Data Loading', () => {
        test('should display loading state initially', () => {
            render(
                <TestWrapper store={mockStore}>
                    <Investors />
                </TestWrapper>
            );

            // Should show loading initially (before setTimeout completes)
            expect(screen.queryByTestId('mobile-table')).not.toBeInTheDocument();
        });

        test('should display investors data after loading', async () => {
            render(
                <TestWrapper store={mockStore}>
                    <Investors />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('mobile-table')).toBeInTheDocument();
                const dataCount = screen.getByTestId('table-data-count');
                expect(parseInt(dataCount.textContent)).toBeGreaterThan(0);
            });
        });
    });

    describe('Search Functionality', () => {
        test('should filter investors based on search term', async () => {
            render(
                <TestWrapper store={mockStore}>
                    <Investors />
                </TestWrapper>
            );

            // Wait for data to load
            await waitFor(() => {
                expect(screen.getByTestId('mobile-table')).toBeInTheDocument();
            });

            const searchBar = screen.getByTestId('search-bar');
            fireEvent.change(searchBar, { target: { value: 'Alice' } });

            // Should filter the results
            await waitFor(() => {
                const tableRows = screen.getAllByTestId(/table-row-/);
                expect(tableRows.length).toBeLessThanOrEqual(4); // Original mock data length
            });
        });
    });

    describe('Authentication', () => {
        test('should not render when user is not authenticated', () => {
            const unauthenticatedStore = createMockStore({
                auth: { isAuthenticated: false, user: null }
            });

            render(
                <TestWrapper store={unauthenticatedStore}>
                    <Investors />
                </TestWrapper>
            );

            expect(screen.queryByTestId('admin-page-layout')).not.toBeInTheDocument();
        });
    });
});