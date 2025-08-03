// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Security.sol";
import "./DAOStorage.sol";

/**
 * @title ParameterManager
 * @dev Manages governance parameter proposals and updates
 */
abstract contract ParameterManager is Security, DAOStorage {
    
    // Events
    event ParameterProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string parameter,
        uint256 value,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    event ParameterProposalVoted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    event ParameterProposalExecuted(
        uint256 indexed proposalId,
        string parameter,
        uint256 value,
        bool passed,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    event VotingDurationSet(uint256 duration, uint256 blockNumber, uint256 timestamp);
    event MinInvestmentAmountSet(uint256 amount, uint256 blockNumber, uint256 timestamp);
    event MinTokensForProposalSet(uint256 amount, uint256 blockNumber, uint256 timestamp);
    event MinVotingTokensSet(uint256 amount, uint256 blockNumber, uint256 timestamp);
    event MinQuorumPercentSet(uint256 percent, uint256 blockNumber, uint256 timestamp);


    /**
     * @dev Create a Parameter Proposal
     */
    function createParameterProposal(string memory _parameter, uint256 _value)
        external
        onlyTokenHolder(true)
        nonReentrant
        whenNotPaused
    {
        require(_isValidParameter(_parameter), "Invalid parameter");

        // Convert _value to blocks for votingDuration
        uint256 valueInBlocks = _value;
        if (keccak256(abi.encodePacked(_parameter)) == keccak256(abi.encodePacked("votingDuration"))) {
            valueInBlocks = _value / DAOConstants.AVERAGE_BLOCK_TIME; // Convert seconds to blocks
            require(valueInBlocks >= DAOConstants.MIN_VOTING_DURATION, "Voting duration too short");
            require(valueInBlocks <= DAOConstants.MAX_VOTING_DURATION, "Voting duration too long");
        }

        parameterProposalCount++;
        ParameterProposal storage newProposal = parameterProposals[parameterProposalCount];
        newProposal.id = parameterProposalCount;
        newProposal.parameter = _parameter;
        newProposal.value = valueInBlocks; // Store in blocks for votingDuration
        newProposal.endBlock = block.number + votingDuration;
        newProposal.executed = false;
        newProposal.passed = false;

        allParameterProposalIds.push(parameterProposalCount);

        emit ParameterProposalCreated(parameterProposalCount, msg.sender, _parameter, _value, block.number, block.timestamp);
    }

    /**
     * @dev Vote on a Parameter Proposal
     */
    function voteParameterProposal(uint256 _proposalId, bool _support)
        external
        onlyTokenHolder(false)
        nonReentrant
        whenNotPaused
    {
        ParameterProposal storage proposal = parameterProposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= parameterProposalCount, "Invalid proposal ID");
        require(block.number < proposal.endBlock, "Voting period has ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.executed, "Proposal already executed");

        uint256 voterBalance = governanceToken.balanceOf(msg.sender);
        proposal.hasVoted[msg.sender] = true;
        if (_support) {
            proposal.totalVotesFor += voterBalance;
            proposal.votersFor += 1;
        } else {
            proposal.totalVotesAgainst += voterBalance;
            proposal.votersAgainst += 1;
        }

        emit ParameterProposalVoted(_proposalId, msg.sender, _support, voterBalance, block.number, block.timestamp);
    }

    /**
     * @dev Execute a Parameter Proposal
     */
    function executeParameterProposal(uint256 _proposalId) external onlyOwner nonReentrant whenNotPaused {
        ParameterProposal storage proposal = parameterProposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= parameterProposalCount, "Invalid proposal ID");
        require(!proposal.executed, "Proposal already executed");
        require(block.number >= proposal.endBlock, "Voting period not ended");

        proposal.executed = true;

        uint256 totalSupply = governanceToken.totalSupply();
        uint256 totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
        uint256 quorum = (totalSupply * minQuorumPercent) / 100;

        if (totalVotes >= quorum && proposal.totalVotesFor > proposal.totalVotesAgainst) {
            proposal.passed = true;
            _updateParameter(proposal.parameter, proposal.value);
        }

        emit ParameterProposalExecuted(_proposalId, proposal.parameter, proposal.value, proposal.passed, block.number, block.timestamp);
    }

    /**
     * @dev Internal function to update parameters
     */
    function _updateParameter(string memory parameter, uint256 value) internal {
        if (keccak256(abi.encodePacked(parameter)) == keccak256(abi.encodePacked("votingDuration"))) {
            votingDuration = value; // Already in blocks
            emit VotingDurationSet(value, block.number, block.timestamp);
        } else if (keccak256(abi.encodePacked(parameter)) == keccak256(abi.encodePacked("minInvestmentAmount"))) {
            require(value > 0, "Minimum investment must be greater than zero");
            minInvestmentAmount = value;
            emit MinInvestmentAmountSet(value, block.number, block.timestamp);
        } else if (keccak256(abi.encodePacked(parameter)) == keccak256(abi.encodePacked("minTokensForProposal"))) {
            require(value >= DAOConstants.MIN_PROPOSAL_TOKEN_THRESHOLD, "Proposal token threshold too low");
            minTokensForProposal = value;
            emit MinTokensForProposalSet(value, block.number, block.timestamp);
        } else if (keccak256(abi.encodePacked(parameter)) == keccak256(abi.encodePacked("minVotingTokens"))) {
            require(value >= DAOConstants.MIN_VOTING_TOKEN_THRESHOLD, "Voting token threshold too low");
            minVotingTokens = value;
            emit MinVotingTokensSet(value, block.number, block.timestamp);
        } else if (keccak256(abi.encodePacked(parameter)) == keccak256(abi.encodePacked("minQuorumPercent"))) {
            require(value >= DAOConstants.MIN_QUORUM_PERCENT_THRESHOLD && value <= DAOConstants.MAX_QUORUM_PERCENT_THRESHOLD, "Quorum percent out of range");
            minQuorumPercent = value;
            emit MinQuorumPercentSet(value, block.number, block.timestamp);
        }
    }

    /**
     * @dev Check if parameter is valid
     */
    function _isValidParameter(string memory _parameter) internal pure returns (bool) {
        return (
            keccak256(abi.encodePacked(_parameter)) == keccak256(abi.encodePacked("votingDuration")) ||
            keccak256(abi.encodePacked(_parameter)) == keccak256(abi.encodePacked("minInvestmentAmount")) ||
            keccak256(abi.encodePacked(_parameter)) == keccak256(abi.encodePacked("minTokensForProposal")) ||
            keccak256(abi.encodePacked(_parameter)) == keccak256(abi.encodePacked("minVotingTokens")) ||
            keccak256(abi.encodePacked(_parameter)) == keccak256(abi.encodePacked("minQuorumPercent"))
        );
    }

    // View functions
    function getParameterProposalDetails(uint256 _proposalId) external view returns (
        uint256 id,
        string memory parameter,
        uint256 value,
        uint256 totalVotesFor,
        uint256 totalVotesAgainst,
        uint256 votersFor,
        uint256 votersAgainst,
        uint256 endBlock,
        bool executed,
        bool passed
    ) {
        require(_proposalId > 0 && _proposalId <= parameterProposalCount, "Invalid proposal ID");
        ParameterProposal storage proposal = parameterProposals[_proposalId];
        return (
            proposal.id,
            proposal.parameter,
            proposal.value,
            proposal.totalVotesFor,
            proposal.totalVotesAgainst,
            proposal.votersFor,
            proposal.votersAgainst,
            proposal.endBlock,
            proposal.executed,
            proposal.passed
        );
    }

    function getGovernanceParameters() external view returns (
        uint256 _minInvestmentAmount,
        uint256 _votingDuration,
        uint256 _minTokensForProposal,
        uint256 _minVotingTokens,
        uint256 _minQuorumPercent
    ) {
        return (
            minInvestmentAmount,
            votingDuration,
            minTokensForProposal,
            minVotingTokens,
            minQuorumPercent
        );
    }
}