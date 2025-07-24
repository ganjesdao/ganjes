import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';
import GanjesDAO from './Dao';

// Mock ethers
jest.mock('ethers');

// Mock window.ethereum
const mockEthereum = {
  request: jest.fn(),
};

global.window.ethereum = mockEthereum;
global.alert = jest.fn();

describe('GanjesDAO Component', () => {
  let mockProvider;
  let mockSigner;
  let mockDaoContract;
  let mockTokenContract;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    global.alert.mockClear();

    // Mock ethers objects
    mockProvider = {
      getSigner: jest.fn(),
    };

    mockSigner = {
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
    };

    mockDaoContract = {
      admin: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      getDAOBalance: jest.fn().mockResolvedValue(ethers.parseEther('1000')),
      minInvestmentAmount: jest.fn().mockResolvedValue(ethers.parseEther('10')),
      getAllProposalIds: jest.fn().mockResolvedValue([1, 2]),
      getProposalDetails: jest.fn(),
      fundingRecordCount: jest.fn().mockResolvedValue(0),
      createProposal: jest.fn(),
      vote: jest.fn(),
      executeProposal: jest.fn(),
      depositFunds: jest.fn(),
      withdrawExcessFunds: jest.fn(),
      setMinInvestmentAmount: jest.fn(),
      getFundingRecord: jest.fn(),
      getVoterCounts: jest.fn(),
    };

    mockTokenContract = {
      approve: jest.fn(),
      balanceOf: jest.fn().mockResolvedValue(ethers.parseEther('500')),
    };

    // Mock ethers constructors
    ethers.BrowserProvider = jest.fn().mockReturnValue(mockProvider);
    ethers.Contract = jest.fn()
      .mockReturnValueOnce(mockDaoContract)
      .mockReturnValueOnce(mockTokenContract);
    ethers.parseEther = jest.fn().mockImplementation((value) => `parsed_${value}`);
    ethers.formatEther = jest.fn().mockImplementation((value) => value.toString());

    mockProvider.getSigner.mockResolvedValue(mockSigner);

    // Set up environment variable
    process.env.REACT_APP_TOKEN_ADDRESS = '0x9876543210987654321098765432109876543210';
  });

  test('renders connect wallet button when not connected', () => {
    render(<GanjesDAO />);
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  test('connects wallet successfully', async () => {
    // Mock proposal details
    mockDaoContract.getProposalDetails.mockResolvedValue([
      1, // id
      '0x1234567890123456789012345678901234567890', // proposer
      'Test Proposal', // description
      ethers.parseEther('100'), // fundingGoal
      ethers.parseEther('50'), // totalVotesFor
      ethers.parseEther('20'), // totalVotesAgainst
      5, // votersFor
      2, // votersAgainst
      ethers.parseEther('30'), // totalInvested
      Math.floor(Date.now() / 1000) + 86400, // endTime (1 day from now)
      false, // executed
      false, // passed
    ]);

    render(<GanjesDAO />);
    
    const connectButton = screen.getByText('Connect Wallet');
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText(/Connected Account:/)).toBeInTheDocument();
      expect(screen.getByText(/DAO Balance:/)).toBeInTheDocument();
      expect(screen.getByText(/Minimum Investment:/)).toBeInTheDocument();
    });

    expect(ethers.BrowserProvider).toHaveBeenCalledWith(mockEthereum);
    expect(mockProvider.getSigner).toHaveBeenCalled();
    expect(mockSigner.getAddress).toHaveBeenCalled();
  });

  test('handles wallet connection error', async () => {
    ethers.BrowserProvider = jest.fn().mockImplementation(() => {
      throw new Error('MetaMask not found');
    });

    render(<GanjesDAO />);
    
    const connectButton = screen.getByText('Connect Wallet');
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to connect wallet.');
    });
  });

  test('shows admin controls when user is admin', async () => {
    mockDaoContract.getProposalDetails.mockResolvedValue([
      1, '0x1234567890123456789012345678901234567890', 'Test Proposal', 
      ethers.parseEther('100'), ethers.parseEther('50'), ethers.parseEther('20'),
      5, 2, ethers.parseEther('30'), Math.floor(Date.now() / 1000) + 86400, false, false
    ]);

    render(<GanjesDAO />);
    
    fireEvent.click(screen.getByText('Connect Wallet'));

    await waitFor(() => {
      expect(screen.getByText('You are the admin!')).toBeInTheDocument();
      expect(screen.getByText('Execute Proposal')).toBeInTheDocument();
      expect(screen.getByText('Withdraw Excess Funds')).toBeInTheDocument();
      expect(screen.getByText('Set Minimum Investment')).toBeInTheDocument();
    });
  });

  test('creates proposal successfully', async () => {
    mockDaoContract.getProposalDetails.mockResolvedValue([
      1, '0x1234567890123456789012345678901234567890', 'Test Proposal', 
      ethers.parseEther('100'), ethers.parseEther('50'), ethers.parseEther('20'),
      5, 2, ethers.parseEther('30'), Math.floor(Date.now() / 1000) + 86400, false, false
    ]);

    const mockTx = { wait: jest.fn().mockResolvedValue({}) };
    mockDaoContract.createProposal.mockResolvedValue(mockTx);

    render(<GanjesDAO />);
    
    fireEvent.click(screen.getByText('Connect Wallet'));

    await waitFor(() => {
      expect(screen.getByText('Create Proposal')).toBeInTheDocument();
    });

    const descriptionInput = screen.getByPlaceholderText('Description');
    const fundingGoalInput = screen.getByPlaceholderText('Funding Goal (tokens)');
    const createButton = screen.getByRole('button', { name: 'Create Proposal' });

    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    fireEvent.change(fundingGoalInput, { target: { value: '100' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockDaoContract.createProposal).toHaveBeenCalledWith('Test Description', 'parsed_100');
      expect(global.alert).toHaveBeenCalledWith('Proposal created successfully!');
    });
  });

  test('handles create proposal error', async () => {
    mockDaoContract.getProposalDetails.mockResolvedValue([
      1, '0x1234567890123456789012345678901234567890', 'Test Proposal', 
      ethers.parseEther('100'), ethers.parseEther('50'), ethers.parseEther('20'),
      5, 2, ethers.parseEther('30'), Math.floor(Date.now() / 1000) + 86400, false, false
    ]);

    mockDaoContract.createProposal.mockRejectedValue(new Error('Insufficient tokens'));

    render(<GanjesDAO />);
    
    fireEvent.click(screen.getByText('Connect Wallet'));

    await waitFor(() => {
      expect(screen.getByText('Create Proposal')).toBeInTheDocument();
    });

    const descriptionInput = screen.getByPlaceholderText('Description');
    const fundingGoalInput = screen.getByPlaceholderText('Funding Goal (tokens)');
    const createButton = screen.getByRole('button', { name: 'Create Proposal' });

    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    fireEvent.change(fundingGoalInput, { target: { value: '100' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to create proposal. Ensure sufficient tokens (100 minimum).');
    });
  });

  test('votes on proposal successfully', async () => {
    mockDaoContract.getProposalDetails.mockResolvedValue([
      1, '0x1234567890123456789012345678901234567890', 'Test Proposal', 
      ethers.parseEther('100'), ethers.parseEther('50'), ethers.parseEther('20'),
      5, 2, ethers.parseEther('30'), Math.floor(Date.now() / 1000) + 86400, false, false
    ]);

    const mockApproveTx = { wait: jest.fn().mockResolvedValue({}) };
    const mockVoteTx = { wait: jest.fn().mockResolvedValue({}) };
    mockTokenContract.approve.mockResolvedValue(mockApproveTx);
    mockDaoContract.vote.mockResolvedValue(mockVoteTx);

    render(<GanjesDAO />);
    
    fireEvent.click(screen.getByText('Connect Wallet'));

    await waitFor(() => {
      expect(screen.getByText('Vote on Proposal')).toBeInTheDocument();
    });

    const proposalIdInputs = screen.getAllByPlaceholderText('Proposal ID');
    const investmentAmountInput = screen.getByPlaceholderText('Investment Amount (tokens)');
    const voteButton = screen.getByRole('button', { name: 'Vote' });

    fireEvent.change(proposalIdInputs[0], { target: { value: '1' } });
    fireEvent.change(investmentAmountInput, { target: { value: '50' } });
    fireEvent.click(voteButton);

    await waitFor(() => {
      expect(mockTokenContract.approve).toHaveBeenCalled();
      expect(mockDaoContract.vote).toHaveBeenCalledWith('1', true, 'parsed_50');
      expect(global.alert).toHaveBeenCalledWith('Vote cast successfully!');
    });
  });

  test('executes proposal successfully (admin only)', async () => {
    mockDaoContract.getProposalDetails.mockResolvedValue([
      1, '0x1234567890123456789012345678901234567890', 'Test Proposal', 
      ethers.parseEther('100'), ethers.parseEther('50'), ethers.parseEther('20'),
      5, 2, ethers.parseEther('30'), Math.floor(Date.now() / 1000) + 86400, false, false
    ]);

    const mockTx = { wait: jest.fn().mockResolvedValue({}) };
    mockDaoContract.executeProposal.mockResolvedValue(mockTx);

    render(<GanjesDAO />);
    
    fireEvent.click(screen.getByText('Connect Wallet'));

    await waitFor(() => {
      expect(screen.getByText('Execute Proposal')).toBeInTheDocument();
    });

    const proposalIdInputs = screen.getAllByPlaceholderText('Proposal ID');
    const executeButton = screen.getByRole('button', { name: 'Execute Proposal' });

    fireEvent.change(proposalIdInputs[1], { target: { value: '1' } });
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockDaoContract.executeProposal).toHaveBeenCalledWith('1');
      expect(global.alert).toHaveBeenCalledWith('Proposal executed successfully!');
    });
  });

  test('deposits funds successfully', async () => {
    mockDaoContract.getProposalDetails.mockResolvedValue([
      1, '0x1234567890123456789012345678901234567890', 'Test Proposal', 
      ethers.parseEther('100'), ethers.parseEther('50'), ethers.parseEther('20'),
      5, 2, ethers.parseEther('30'), Math.floor(Date.now() / 1000) + 86400, false, false
    ]);

    const mockApproveTx = { wait: jest.fn().mockResolvedValue({}) };
    const mockDepositTx = { wait: jest.fn().mockResolvedValue({}) };
    mockTokenContract.approve.mockResolvedValue(mockApproveTx);
    mockDaoContract.depositFunds.mockResolvedValue(mockDepositTx);

    render(<GanjesDAO />);
    
    fireEvent.click(screen.getByText('Connect Wallet'));

    await waitFor(() => {
      expect(screen.getByText('Deposit Funds')).toBeInTheDocument();
    });

    const depositAmountInput = screen.getByPlaceholderText('Amount (tokens)');
    const depositButton = screen.getByRole('button', { name: 'Deposit Funds' });

    fireEvent.change(depositAmountInput, { target: { value: '100' } });
    fireEvent.click(depositButton);

    await waitFor(() => {
      expect(mockTokenContract.approve).toHaveBeenCalled();
      expect(mockDaoContract.depositFunds).toHaveBeenCalledWith('parsed_100');
      expect(global.alert).toHaveBeenCalledWith('Funds deposited successfully!');
    });
  });

  test('fetches specific proposal successfully', async () => {
    const mockProposalDetails = [
      1, '0x1234567890123456789012345678901234567890', 'Specific Proposal', 
      ethers.parseEther('200'), ethers.parseEther('100'), ethers.parseEther('50'),
      10, 5, ethers.parseEther('75'), Math.floor(Date.now() / 1000) + 86400, false, false
    ];
    const mockVoterCounts = [10, 5];

    mockDaoContract.getProposalDetails
      .mockResolvedValueOnce([
        1, '0x1234567890123456789012345678901234567890', 'Test Proposal', 
        ethers.parseEther('100'), ethers.parseEther('50'), ethers.parseEther('20'),
        5, 2, ethers.parseEther('30'), Math.floor(Date.now() / 1000) + 86400, false, false
      ])
      .mockResolvedValueOnce(mockProposalDetails);
    
    mockDaoContract.getVoterCounts.mockResolvedValue(mockVoterCounts);

    render(<GanjesDAO />);
    
    fireEvent.click(screen.getByText('Connect Wallet'));

    await waitFor(() => {
      expect(screen.getByText('Fetch Specific Proposal')).toBeInTheDocument();
    });

    const specificProposalIdInput = screen.getAllByPlaceholderText('Proposal ID')[2];
    const fetchButton = screen.getByRole('button', { name: 'Fetch Proposal' });

    fireEvent.change(specificProposalIdInput, { target: { value: '1' } });
    fireEvent.click(fetchButton);

    await waitFor(() => {
      expect(mockDaoContract.getProposalDetails).toHaveBeenCalledWith('1');
      expect(mockDaoContract.getVoterCounts).toHaveBeenCalledWith('1');
      expect(screen.getByText('Specific Proposal')).toBeInTheDocument();
    });
  });

  test('handles MetaMask not installed', () => {
    delete global.window.ethereum;

    render(<GanjesDAO />);
    
    const connectButton = screen.getByText('Connect Wallet');
    fireEvent.click(connectButton);

    expect(global.alert).toHaveBeenCalledWith('Please install MetaMask!');
  });

  test('displays proposals correctly', async () => {
    mockDaoContract.getProposalDetails.mockResolvedValue([
      1, '0x1234567890123456789012345678901234567890', 'Test Proposal', 
      ethers.parseEther('100'), ethers.parseEther('50'), ethers.parseEther('20'),
      5, 2, ethers.parseEther('30'), Math.floor(Date.now() / 1000) + 86400, false, false
    ]);

    render(<GanjesDAO />);
    
    fireEvent.click(screen.getByText('Connect Wallet'));

    await waitFor(() => {
      expect(screen.getByText('All Proposals')).toBeInTheDocument();
      expect(screen.getByText('Test Proposal')).toBeInTheDocument();
      expect(screen.getByText('ID: 1')).toBeInTheDocument();
    });
  });
});