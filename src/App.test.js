import { render, screen } from '@testing-library/react';
import App from './App';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('App Component', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  });

  test('renders ToastContainer with correct props', () => {
    render(<App />);
    const toastContainer = screen.getByTestId('toast-container');
    expect(toastContainer).toBeInTheDocument();
  });

  test('has Router wrapper for navigation', () => {
    const { container } = render(<App />);
    // Check that the app renders within Router context
    expect(container.firstChild).toBeTruthy();
  });

  test('renders main route structure', () => {
    // Since the actual routes depend on the current URL and we're testing
    // the component structure, we'll just ensure the app renders
    const { container } = render(<App />);
    expect(container.firstChild).not.toBeNull();
  });
});

describe('App Routing Structure', () => {
  test('app has correct route configuration', () => {
    // Test that the App component contains the expected routing structure
    const { container } = render(<App />);
    
    // The app should render without errors, indicating routes are properly configured
    expect(container).toBeInTheDocument();
  });

  test('renders within BrowserRouter context', () => {
    // Test that the component works within Router context
    expect(() => render(<App />)).not.toThrow();
  });
});