import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Auth from './Auth';

// Mock fetch globally
global.fetch = jest.fn();

// Mock window.location
delete window.location;
window.location = { href: '' };

describe('Auth Component', () => {
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

  test('redirects to signin when auth token is invalid', async () => {
    sessionStorage.setItem('authToken', 'invalid-token');
    const mockOnProfileDataFetched = jest.fn();
    
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(<Auth onProfileDataFetched={mockOnProfileDataFetched} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/profile',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer invalid-token',
          },
        }
      );
      expect(window.location.href).toBe('/signin');
      expect(sessionStorage.getItem('authToken')).toBeNull();
    });
  });

  test('handles rate limit (429) gracefully', async () => {
    sessionStorage.setItem('authToken', 'valid-token');
    const mockOnProfileDataFetched = jest.fn();
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    render(<Auth onProfileDataFetched={mockOnProfileDataFetched} />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Rate limit exceeded.');
      expect(window.location.href).toBe('');
      expect(mockOnProfileDataFetched).not.toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  test('calls onProfileDataFetched when authentication is successful', async () => {
    sessionStorage.setItem('authToken', 'valid-token');
    const mockOnProfileDataFetched = jest.fn();
    const mockProfileData = {
      status: true,
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
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
        'http://localhost:3001/profile',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-token',
          },
        }
      );
      expect(mockOnProfileDataFetched).toHaveBeenCalledWith(mockProfileData);
      expect(window.location.href).toBe('');
    });
  });

  test('redirects to signin when profile data status is false', async () => {
    sessionStorage.setItem('authToken', 'valid-token');
    const mockOnProfileDataFetched = jest.fn();
    const mockProfileData = { status: false };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockProfileData,
    });

    render(<Auth onProfileDataFetched={mockOnProfileDataFetched} />);
    
    await waitFor(() => {
      expect(mockOnProfileDataFetched).not.toHaveBeenCalled();
      expect(window.location.href).toBe('/signin');
      expect(sessionStorage.getItem('authToken')).toBeNull();
    });
  });

  test('handles network errors gracefully', async () => {
    sessionStorage.setItem('authToken', 'valid-token');
    const mockOnProfileDataFetched = jest.fn();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<Auth onProfileDataFetched={mockOnProfileDataFetched} />);
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Fetch error:', expect.any(Error));
      expect(window.location.href).toBe('/signin');
      expect(sessionStorage.getItem('authToken')).toBeNull();
    });

    consoleErrorSpy.mockRestore();
  });

  test('clears localStorage and sessionStorage on logout', async () => {
    localStorage.setItem('userData', 'test-data');
    sessionStorage.setItem('authToken', 'test-token');
    sessionStorage.setItem('otherData', 'other-data');
    
    const mockOnProfileDataFetched = jest.fn();
    
    render(<Auth onProfileDataFetched={mockOnProfileDataFetched} />);
    
    await waitFor(() => {
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.getItem('authToken')).toBeNull();
      expect(window.location.href).toBe('/signin');
    });
  });

  test('renders null', () => {
    const mockOnProfileDataFetched = jest.fn();
    const { container } = render(<Auth onProfileDataFetched={mockOnProfileDataFetched} />);
    
    expect(container.firstChild).toBeNull();
  });
});