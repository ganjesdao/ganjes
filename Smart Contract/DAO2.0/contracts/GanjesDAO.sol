// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./base/ProposalManager.sol";
import "./base/MultiSigManager.sol";
import "./base/ParameterManager.sol";
import "./libraries/DAOConstants.sol";

/**
 * @title GanjesDAO
 * @dev Main DAO contract implementing funding proposals, governance, and multi-sig management
 * @notice For large-scale DAOs, use off-chain indexing (e.g., The Graph, SubQuery) to query proposals efficiently
 * @notice Index `ProposalCreated`, `ProposalExecuted`, and `InvestorDeactivated` events for better tracking
 * @dev Future optimization: Consider maintaining separate arrays for approved/running proposals to reduce gas costs
 */
contract GanjesDAO is ProposalManager, MultiSigManager, ParameterManager {
    
    // Events
    event FundsWithdrawn(address indexed recipient, uint256 amount, uint256 blockNumber, uint256 timestamp);
    event FundsDeposited(address indexed depositor, uint256 amount, uint256 blockNumber, uint256 timestamp);
    event InvestorDeactivated(address indexed investor, uint256 blockNumber, uint256 timestamp);
    event EmergencyExecution(uint256 indexed proposalId, address indexed executor, uint256 blockNumber, uint256 timestamp);

    /**
     * @dev Constructor
     */
    constructor(address _governanceToken, address[] memory _initialOwners, uint256 _requiredApprovals) {
        _initializeSecurity(_initialOwners, _requiredApprovals);
        _initializeDAOStorage(_governanceToken);
    }

    /**
     * @dev Execute a Funding Proposal with proper voting period enforcement
     */
    function executeProposal(uint256 _proposalId) external onlyOwner nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(!proposal.executed, "Proposal already executed");
        
        // CRITICAL FIX: Always enforce voting period before execution
        require(block.number >= proposal.endBlock, "Voting period not ended");

        proposal.executed = true;

        uint256 actualAmountTransferred = 0;
        bool isFullyFunded = false;

        // Check if proposal should pass based on investment or voting
        bool shouldPass = false;
        
        if (proposal.totalInvested >= proposal.fundingGoal) {
            shouldPass = true;
        } else {
            uint256 totalSupply = governanceToken.totalSupply();
            uint256 totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
            if (totalVotes >= (totalSupply * minQuorumPercent) / 100 && 
                proposal.totalVotesFor > proposal.totalVotesAgainst) {
                shouldPass = true;
            }
        }

        if (shouldPass) {
            (actualAmountTransferred, isFullyFunded) = _tryFinalizeProposal(_proposalId, proposal);
            // Refund proposal fee if proposal passes
            _refundProposalFee(_proposalId, proposal.proposer);
        }

        emit ProposalExecuted(
            _proposalId, 
            proposal.passed, 
            proposal.passed ? proposal.fundingGoal : 0, 
            actualAmountTransferred, 
            isFullyFunded, 
            block.number,
            block.timestamp
        );
    }

    /**
     * @dev Internal helper function to try finalizing proposal
     */
    function _tryFinalizeProposal(uint256 _proposalId, Proposal storage proposal) 
        internal 
        returns (uint256 actualAmountTransferred, bool isFullyFunded) 
    {
        proposal.passed = true;
        uint256 amount = proposal.fundingGoal;
        actualAmountTransferred = 0;
        isFullyFunded = false;

        if (governanceToken.balanceOf(address(this)) >= amount) {
            governanceToken.transfer(proposal.proposer, amount);
            actualAmountTransferred = amount;
            isFullyFunded = true;

            _recordFunding(_proposalId, proposal.proposer, amount);
            emit FundsWithdrawn(proposal.proposer, amount, block.number, block.timestamp);
        } else if (governanceToken.balanceOf(address(this)) > 0) {
            // Partial funding scenario
            actualAmountTransferred = governanceToken.balanceOf(address(this));
            governanceToken.transfer(proposal.proposer, actualAmountTransferred);

            _recordFunding(_proposalId, proposal.proposer, actualAmountTransferred);
            emit FundsWithdrawn(proposal.proposer, actualAmountTransferred, block.number, block.timestamp);
        }

        return (actualAmountTransferred, isFullyFunded);
    }

    /**
     * @dev Record funding transaction
     */
    function _recordFunding(uint256 _proposalId, address recipient, uint256 amount) internal {
        fundingRecordCount++;
        fundingHistory[fundingRecordCount] = FundingRecord({
            proposalId: _proposalId,
            recipient: recipient,
            amount: amount,
            blockNumber: block.number
        });
    }

    /**
     * @dev Override multi-sig execution to handle DAO-specific actions
     */
    function _executeMultiSigProposal(uint256 _proposalId) internal override {
        MultiSigProposal storage proposal = multiSigProposals[_proposalId];
        require(!proposal.executed, "Proposal already executed");
        proposal.executed = true;

        if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("executeProposal"))) {
            require(proposal.value > 0 && proposal.target == address(0), "Invalid parameters");
            this.executeProposal(proposal.value);
        } else if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("emergencyExecute"))) {
            require(proposal.value > 0 && proposal.target == address(0), "Invalid parameters");
            _emergencyExecuteProposal(proposal.value);
        } else if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("increaseVotingDuration"))) {
            require(proposal.value > 0 && proposal.target != address(0), "Invalid parameters");
            // proposal.value = proposalId, proposal.target encoded as uint256 = additional seconds
            this.increaseVotingDuration(proposal.value, uint256(uint160(proposal.target)));
        } else if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("decreaseVotingDuration"))) {
            require(proposal.value > 0 && proposal.target != address(0), "Invalid parameters");
            // proposal.value = proposalId, proposal.target encoded as uint256 = reduction seconds
            this.decreaseVotingDuration(proposal.value, uint256(uint160(proposal.target)));
        } else {
            // Call parent implementation for common actions (pause/unpause)
            super._executeMultiSigProposal(_proposalId);
            return; // Don't emit the event again
        }

        emit MultiSigProposalExecuted(_proposalId, proposal.action, proposal.value, proposal.target, block.number, block.timestamp);
    }

    /**
     * @dev Emergency execution function
     */
    function _emergencyExecuteProposal(uint256 _proposalId) internal {
        require(paused, "Only available during emergency pause");
        require(!emergencyExecuted[_proposalId], "Already emergency executed");
        emergencyExecuted[_proposalId] = true;
        
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(!proposal.executed, "Proposal already executed");
        
        proposal.executed = true;
        
        // Emergency execution logic - simplified for emergency situations
        if (proposal.totalInvested >= proposal.fundingGoal || 
            (proposal.totalVotesFor > proposal.totalVotesAgainst && proposal.totalVotesFor > 0)) {
            
            uint256 actualAmountTransferred = 0;
            bool isFullyFunded = false;
            (actualAmountTransferred, isFullyFunded) = _tryFinalizeProposal(_proposalId, proposal);
            
            emit ProposalExecuted(
                _proposalId, 
                proposal.passed, 
                proposal.passed ? proposal.fundingGoal : 0, 
                actualAmountTransferred, 
                isFullyFunded, 
                block.number,
                block.timestamp
            );
        }
        
        emit EmergencyExecution(_proposalId, msg.sender, block.number, block.timestamp);
    }

    /**
     * @dev Refund proposal fee for failed proposals (admin function)
     */
    function refundProposalFee(uint256 _proposalId) external onlyOwner nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(proposal.executed, "Proposal not executed");
        require(!proposal.passed, "Cannot refund fee for passed proposal");
        
        _refundProposalFee(_proposalId, proposal.proposer);
    }

    /**
     * @dev Refund investments for failed or unfunded proposals
     */
    function refundInvestments(uint256 _proposalId) external nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(proposal.executed, "Proposal not executed");
        require(!proposal.passed || (proposal.passed && governanceToken.balanceOf(address(this)) < proposal.fundingGoal), "Proposal fully funded");

        uint256 amount = proposal.investments[msg.sender];
        require(amount > 0, "No investment to refund");

        proposal.investments[msg.sender] = 0;
        proposal.totalInvested -= amount;
        require(governanceToken.transfer(msg.sender, amount), "Refund transfer failed");

        emit FundsWithdrawn(msg.sender, amount, block.number, block.timestamp);
    }

    /**
     * @dev Deposit tokens into DAO
     */
    function deposit(uint256 amount) external onlyTokenHolder(false) nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(governanceToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");

        if (!activeInvestors[msg.sender]) {
            activeInvestors[msg.sender] = true;
            activeInvestorCount++;
        }
        lastInvestorActivity[msg.sender] = block.number;

        emit FundsDeposited(msg.sender, amount, block.number, block.timestamp);
    }

    // View functions
    function getDAOBalance() external view returns (uint256) {
        return governanceToken.balanceOf(address(this));
    }

    function getAllProposalIds() external view returns (uint256[] memory) {
        return allProposalIds;
    }

    function getAllParameterProposalIds() external view returns (uint256[] memory) {
        return allParameterProposalIds;
    }

    function getFundingRecord(uint256 recordId) external view returns (uint256, address, uint256, uint256) {
        require(recordId > 0 && recordId <= fundingRecordCount, "Invalid record ID");
        FundingRecord memory record = fundingHistory[recordId];
        return (record.proposalId, record.recipient, record.amount, record.blockNumber);
    }

    function getTotalFundedAmount() external view returns (uint256) {
        uint256 totalFunded = 0;
        for (uint256 i = 1; i <= fundingRecordCount; i++) {
            totalFunded += fundingHistory[i].amount;
        }
        return totalFunded;
    }

    function getContractStatus() external view returns (
        bool isPaused,
        uint256 totalProposals,
        uint256 totalParameterProposals,
        uint256 totalMultiSigProposals,
        uint256 daoBalance,
        uint256 activeInvestorsCount
    ) {
        return (
            paused,
            proposalCount,
            parameterProposalCount,
            multiSigProposalCount,
            governanceToken.balanceOf(address(this)),
            activeInvestorCount
        );
    }

    function getCurrentProposalFeeAmount() external view returns (uint256) {
        return minTokensForProposal;
    }

    function getCurrentBlock() external view returns (uint256) {
        return block.number;
    }

    function getBlocksUntilEnd(uint256 _proposalId) external view returns (uint256) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        
        if (block.number >= proposal.endBlock) {
            return 0;
        }
        return proposal.endBlock - block.number;
    }

    function estimateTimeUntilEnd(uint256 _proposalId) external view returns (uint256 secondsRemaining) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        
        if (block.number >= proposal.endBlock) {
            return 0;
        }
        uint256 blocksRemaining = proposal.endBlock - block.number;
        return blocksRemaining * DAOConstants.AVERAGE_BLOCK_TIME;
    }

    function getVotingDurationInfo() external view returns (
        uint256 defaultDurationBlocks,
        uint256 defaultDurationSeconds,
        uint256 minDurationBlocks,
        uint256 maxDurationBlocks,
        uint256 currentVotingDuration
    ) {
        return (
            DAOConstants.DEFAULT_VOTING_DURATION,
            DAOConstants.DEFAULT_VOTING_DURATION * DAOConstants.AVERAGE_BLOCK_TIME,
            DAOConstants.MIN_VOTING_DURATION,
            DAOConstants.MAX_VOTING_DURATION,
            votingDuration
        );
    }
}