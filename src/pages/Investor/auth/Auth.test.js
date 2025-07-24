import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Auth from './Auth';

// Mock fetch globally
global.fetch = jest.fn();

// Mock window.location
delete window.location;
window.location = { href: '' };

describe('Investor Auth Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = '';
    
    // Set up environment variable
    process.env.REACT_APP_BASE_API_URL = 'http://localhost:3001';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('redirects to signin when no auth token is present', async () => {
    const mockOnProfileDataFetched = jest.fn();
    
    render(<Auth onProfileDataFetched={mockOnProfileDataFetched} />);
    
    await waitFor(() => {
      expect(window.location.href).toBe('/signin');
      expect(mockOnProfileDataFetched).not.toHaveBeenCalled();
    });
  });

  test('fetches investor profile data with correct endpoint', async () => {
    sessionStorage.setItem('authToken', 'valid-token');
    const mockOnProfileDataFetched = jest.fn();
    const mockProfileData = {
      status: true,
      investor: {
        id: 1,
        name: 'Test Investor',
        email: 'investor@example.com',
        balance: 1000,
      },
    };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockProfileData,
    });

    render(<Auth onProfileDataFetched={mockOnProfileDataFetched} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/investor/profile',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-token',
          },
        }
      );
      expect(mockOnProfileDataFetched).toHaveBeenCalledWith(mockProfileData);
    });
  });

  test('handles unauthorized access for investor', async () => {
    sessionStorage.setItem('authToken', 'expired-token');
    const mockOnProfileDataFetched = jest.fn();
    
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    render(<Auth onProfileDataFetched={mockOnProfileDataFetched} />);
    
    await waitFor(() => {
      expect(window.location.href).toBe('/signin');
      expect(sessionStorage.getItem('authToken')).toBeNull();
      expect(mockOnProfileDataFetched).not.toHaveBeenCalled();
    });
  });

  test('handles server errors gracefully', async () => {
    sessionStorage.setItem('authToken', 'valid-token');
    const mockOnProfileDataFetched = jest.fn();
    
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<Auth onProfileDataFetched={mockOnProfileDataFetched} />);
    
    await waitFor(() => {
      expect(window.location.href).toBe('/signin');
      expect(sessionStorage.getItem('authToken')).toBeNull();
    });
  });

  test('renders null component', () => {
    const mockOnProfileDataFetched = jest.fn();
    const { container } = render(<Auth onProfileDataFetched={mockOnProfileDataFetched} />);
    
    expect(container.firstChild).toBeNull();
  });
});