// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Security.sol";
import "./DAOStorage.sol";

/**
 * @title ProposalManager
 * @dev Manages funding proposals creation, voting, and execution
 */
abstract contract ProposalManager is Security, DAOStorage {
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        string projectName,
        string projectUrl,
        uint256 fundingGoal,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    event Voted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight,
        uint256 investmentAmount,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        bool passed,
        uint256 amountAllocated,
        uint256 actualAmountTransferred,
        bool isFullyFunded,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    event ProposalFeeCollected(
        uint256 indexed proposalId,
        address indexed proposer,
        uint256 amount,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    event ProposalFeeRefunded(
        uint256 indexed proposalId,
        address indexed proposer,
        uint256 amount,
        uint256 blockNumber,
        uint256 timestamp
    );

    event VotingDurationIncreased(
        uint256 indexed proposalId,
        uint256 oldEndBlock,
        uint256 newEndBlock,
        uint256 addedSeconds,
        uint256 blockNumber,
        uint256 timestamp
    );

    event VotingDurationDecreased(
        uint256 indexed proposalId,
        uint256 oldEndBlock,
        uint256 newEndBlock,
        uint256 removedSeconds,
        uint256 blockNumber,
        uint256 timestamp
    );


    /**
     * @dev Create a funding proposal
     */
    function createProposal(
        string memory _description,
        string memory _projectName,
        string memory _projectUrl,
        uint256 _fundingGoal
    ) external onlyTokenHolder(true) nonReentrant whenNotPaused {
        require(_fundingGoal > 0, "Funding goal must be greater than zero");
        require(bytes(_projectName).length > 0, "Project name cannot be empty");
        require(bytes(_projectUrl).length > 0, "Project URL cannot be empty");
        
        // Collect proposal fee
        require(governanceToken.transferFrom(msg.sender, address(this), minTokensForProposal), "Proposal fee transfer failed");

        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];
        
        // Track proposal fee
        proposalFees[proposalCount] = minTokensForProposal;
        totalProposalFeesPaid[msg.sender] += minTokensForProposal;
        
        newProposal.id = proposalCount;
        newProposal.proposer = msg.sender;
        newProposal.description = _description;
        newProposal.projectName = _projectName;
        newProposal.projectUrl = _projectUrl;
        newProposal.fundingGoal = _fundingGoal;
        newProposal.endBlock = block.number + votingDuration;
        newProposal.executed = false;
        newProposal.passed = false;
        newProposal.votersFor = 0;
        newProposal.votersAgainst = 0;
        newProposal.totalInvested = 0;

        allProposalIds.push(proposalCount);
        proposalsByProposer[msg.sender].push(proposalCount);

        emit ProposalCreated(proposalCount, msg.sender, _description, _projectName, _projectUrl, _fundingGoal, block.number, block.timestamp);
        emit ProposalFeeCollected(proposalCount, msg.sender, minTokensForProposal, block.number, block.timestamp);
    }

    /**
     * @dev Vote on a funding proposal
     */
    function vote(uint256 _proposalId, bool _support, uint256 _investmentAmount) 
        external 
        onlyTokenHolder(false) 
        nonReentrant 
        whenNotPaused 
    {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(msg.sender != proposal.proposer, "Proposer cannot vote on own proposal");
        require(block.number < proposal.endBlock, "Voting period has ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.executed, "Proposal already executed");
        require(_investmentAmount >= minInvestmentAmount, "Investment below minimum amount");
        require(_investmentAmount <= proposal.fundingGoal, "Investment exceeds funding goal");
        require(governanceToken.transferFrom(msg.sender, address(this), _investmentAmount), "Investment transfer failed");

        proposal.hasVoted[msg.sender] = true;
        proposal.voteBlock[msg.sender] = block.number;
        proposal.investments[msg.sender] = _investmentAmount;
        proposal.totalInvested += _investmentAmount;

        uint256 voterBalance = governanceToken.balanceOf(msg.sender);
        if (_support) {
            proposal.totalVotesFor += voterBalance;
            proposal.votersFor += 1;
        } else {
            proposal.totalVotesAgainst += voterBalance;
            proposal.votersAgainst += 1;
        }

        votesByInvestor[msg.sender].push(VoteRecord({
            proposalId: _proposalId,
            support: _support,
            investmentAmount: _investmentAmount,
            blockNumber: block.number
        }));

        emit Voted(_proposalId, msg.sender, _support, voterBalance, _investmentAmount, block.number, block.timestamp);
    }

    /**
     * @dev Internal function to refund proposal fee
     */
    function _refundProposalFee(uint256 _proposalId, address proposer) internal {
        uint256 feeAmount = proposalFees[_proposalId];
        if (feeAmount > 0) {
            proposalFees[_proposalId] = 0; // Prevent double refund
            require(governanceToken.transfer(proposer, feeAmount), "Fee refund transfer failed");
            emit ProposalFeeRefunded(_proposalId, proposer, feeAmount, block.number, block.timestamp);
        }
    }

    /**
     * @dev Increase voting duration for a proposal (Admin only)
     * @param _proposalId The proposal ID to extend
     * @param _additionalSeconds Additional time in seconds to add
     */
    function increaseVotingDuration(uint256 _proposalId, uint256 _additionalSeconds) 
        external 
        onlyOwner 
        nonReentrant 
        whenNotPaused 
    {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(_additionalSeconds > 0, "Additional time must be positive");
        
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.executed, "Cannot modify executed proposal");
        require(block.number < proposal.endBlock, "Voting period already ended");
        
        // Convert seconds to blocks
        uint256 additionalBlocks = _additionalSeconds / DAOConstants.AVERAGE_BLOCK_TIME;
        require(additionalBlocks > 0, "Additional time too small");
        
        uint256 oldEndBlock = proposal.endBlock;
        uint256 newEndBlock = oldEndBlock + additionalBlocks;
        
        // Ensure new duration doesn't exceed maximum
        uint256 totalDuration = newEndBlock - (oldEndBlock - votingDuration);
        require(totalDuration <= DAOConstants.MAX_VOTING_DURATION, "New duration exceeds maximum allowed");
        
        proposal.endBlock = newEndBlock;
        
        emit VotingDurationIncreased(
            _proposalId,
            oldEndBlock,
            newEndBlock,
            _additionalSeconds,
            block.number,
            block.timestamp
        );
    }

    /**
     * @dev Decrease voting duration for a proposal (Admin only)
     * @param _proposalId The proposal ID to shorten
     * @param _reductionSeconds Time in seconds to remove
     */
    function decreaseVotingDuration(uint256 _proposalId, uint256 _reductionSeconds) 
        external 
        onlyOwner 
        nonReentrant 
        whenNotPaused 
    {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(_reductionSeconds > 0, "Reduction time must be positive");
        
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.executed, "Cannot modify executed proposal");
        require(block.number < proposal.endBlock, "Voting period already ended");
        
        // Convert seconds to blocks
        uint256 reductionBlocks = _reductionSeconds / DAOConstants.AVERAGE_BLOCK_TIME;
        require(reductionBlocks > 0, "Reduction time too small");
        
        uint256 oldEndBlock = proposal.endBlock;
        uint256 newEndBlock;
        
        // Ensure new end block is not in the past and meets minimum duration
        uint256 minimumEndBlock = block.number + DAOConstants.MIN_VOTING_DURATION;
        
        if (oldEndBlock > reductionBlocks) {
            newEndBlock = oldEndBlock - reductionBlocks;
        } else {
            newEndBlock = minimumEndBlock;
        }
        
        require(newEndBlock >= minimumEndBlock, "New duration below minimum allowed");
        require(newEndBlock > block.number, "New end block must be in the future");
        
        proposal.endBlock = newEndBlock;
        
        emit VotingDurationDecreased(
            _proposalId,
            oldEndBlock,
            newEndBlock,
            _reductionSeconds,
            block.number,
            block.timestamp
        );
    }

    // View functions
    function getProposalBasicDetails(uint256 _proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory description,
        string memory projectName,
        string memory projectUrl,
        uint256 fundingGoal,
        uint256 endBlock,
        bool executed,
        bool passed
    ) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.description,
            proposal.projectName,
            proposal.projectUrl,
            proposal.fundingGoal,
            proposal.endBlock,
            proposal.executed,
            proposal.passed
        );
    }

    function getProposalVotingDetails(uint256 _proposalId) external view returns (
        uint256 totalVotesFor,
        uint256 totalVotesAgainst,
        uint256 votersFor,
        uint256 votersAgainst,
        uint256 totalInvested
    ) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.totalVotesFor,
            proposal.totalVotesAgainst,
            proposal.votersFor,
            proposal.votersAgainst,
            proposal.totalInvested
        );
    }

    function isProposalActive(uint256 _proposalId) external view returns (bool) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        return !proposal.executed && block.number < proposal.endBlock;
    }

    function getProposalFee(uint256 _proposalId) external view returns (uint256) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        return proposalFees[_proposalId];
    }

    function getTotalProposalFeesPaid(address proposer) external view returns (uint256) {
        return totalProposalFeesPaid[proposer];
    }
}