// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../storage/DAOStorage.sol";
import "../libraries/ReentrancyGuard.sol";

contract FundManager is DAOStorage {
    
    event ProposalExecuted(uint256 indexed proposalId, bool passed, uint256 amountAllocated, uint256 timestamp);
    event FundsWithdrawn(address indexed recipient, uint256 amount, uint256 timestamp);
    event FundsDeposited(address indexed depositor, uint256 amount, uint256 timestamp);
    event EmergencyWithdrawal(address indexed recipient, uint256 amount, string reason, uint256 timestamp);
    event RefundClaimed(uint256 indexed proposalId, address indexed investor, uint256 amount, uint256 timestamp);
    
    function executeProposal(uint256 _proposalId) external virtual onlyAdmin {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(!proposal.executed, "Proposal already executed");
        require(block.timestamp >= proposal.endTime, "Voting period not ended");
        
        proposal.executed = true;
        
        // Check if proposal passes by funding goal OR by voting
        bool passesByFunding = proposal.totalInvested >= proposal.fundingGoal;
        bool passesByVoting = false;
        
        if (!passesByFunding) {
            uint256 totalSupply = governanceToken.totalSupply();
            uint256 totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
            uint256 quorum = (totalSupply * MIN_QUORUM_PERCENT) / 100;
            passesByVoting = (totalVotes >= quorum && proposal.totalVotesFor > proposal.totalVotesAgainst);
        }
        
        if (passesByFunding || passesByVoting) {
            proposal.passed = true;
            require(governanceToken.balanceOf(address(this)) >= proposal.fundingGoal, "Insufficient DAO funds");
            governanceToken.transfer(proposal.proposer, proposal.fundingGoal);
            
            fundingRecordCount++;
            fundingHistory[fundingRecordCount] = FundingRecord({
                proposalId: _proposalId,
                recipient: proposal.proposer,
                amount: proposal.fundingGoal,
                timestamp: block.timestamp
            });
            
            emit FundsWithdrawn(proposal.proposer, proposal.fundingGoal, block.timestamp);
        }
        
        emit ProposalExecuted(_proposalId, proposal.passed, proposal.passed ? proposal.fundingGoal : 0, block.timestamp);
    }
    
    function claimRefund(uint256 _proposalId) external virtual {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(proposal.executed, "Proposal not yet executed");
        require(!proposal.passed, "Cannot refund passed proposal");
        require(proposal.investments[msg.sender] > 0, "No investment to refund");
        
        uint256 refundAmount = proposal.investments[msg.sender];
        proposal.investments[msg.sender] = 0;
        
        require(governanceToken.transfer(msg.sender, refundAmount), "Refund transfer failed");
        
        emit RefundClaimed(_proposalId, msg.sender, refundAmount, block.timestamp);
    }
    
    function batchRefund(uint256 _proposalId, address[] memory _investors) external virtual onlyAdmin {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(proposal.executed, "Proposal not yet executed");
        require(!proposal.passed, "Cannot refund passed proposal");
        
        for (uint256 i = 0; i < _investors.length; i++) {
            address investor = _investors[i];
            uint256 refundAmount = proposal.investments[investor];
            
            if (refundAmount > 0) {
                proposal.investments[investor] = 0;
                require(governanceToken.transfer(investor, refundAmount), "Refund transfer failed");
                emit RefundClaimed(_proposalId, investor, refundAmount, block.timestamp);
            }
        }
    }
    
    function deposit(uint256 amount) external virtual onlyTokenHolder {
        require(amount > 0, "Amount must be positive");
        require(governanceToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        emit FundsDeposited(msg.sender, amount, block.timestamp);
    }
    
    // Emergency withdraw - restricted to operational costs only
    // Consider removing this function entirely and using proposal-based withdrawals
    function emergencyWithdraw(uint256 _amount, address _to, string memory _reason) external virtual onlyAdmin {
        require(_amount > 0, "Withdraw amount must be positive");
        require(_amount <= governanceToken.balanceOf(address(this)) / 20, "Cannot withdraw more than 5% in emergency");
        require(bytes(_reason).length > 0, "Emergency reason required");
        require(governanceToken.balanceOf(address(this)) >= _amount, "Insufficient DAO balance");
        
        governanceToken.transfer(_to, _amount);
        emit EmergencyWithdrawal(_to, _amount, _reason, block.timestamp);
    }
    
    function getDAOBalance() external view returns (uint256) {
        return governanceToken.balanceOf(address(this));
    }
    
    function getFundingRecord(uint256 recordId) external view returns (uint256, address, uint256, uint256) {
        FundingRecord memory record = fundingHistory[recordId];
        return (record.proposalId, record.recipient, record.amount, record.timestamp);
    }
    
    function getTotalFundedAmount() external view returns (uint256) {
        uint256 totalFunded = 0;
        for (uint256 i = 1; i <= fundingRecordCount; i++) {
            totalFunded += fundingHistory[i].amount;
        }
        return totalFunded;
    }
}