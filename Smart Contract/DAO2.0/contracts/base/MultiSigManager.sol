// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Security.sol";
import "./DAOStorage.sol";

/**
 * @title MultiSigManager
 * @dev Manages multi-signature proposals for admin actions
 */
abstract contract MultiSigManager is Security, DAOStorage {
    
    // Events
    event MultiSigProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string action,
        uint256 value,
        address target,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    event MultiSigProposalApproved(
        uint256 indexed proposalId,
        address indexed approver,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    event MultiSigProposalExecuted(
        uint256 indexed proposalId,
        string action,
        uint256 value,
        address target,
        uint256 blockNumber,
        uint256 timestamp
    );

    /**
     * @dev Create a Multi-Sig Proposal
     */
    function createMultiSigProposal(string memory _action, uint256 _value, address _target)
        external
        onlyOwner
        nonReentrant
        returns (uint256)
    {
        require(_isValidAction(_action), "Invalid action");

        multiSigProposalCount++;
        MultiSigProposal storage proposal = multiSigProposals[multiSigProposalCount];
        proposal.id = multiSigProposalCount;
        proposal.proposer = msg.sender;
        proposal.action = _action;
        proposal.value = _value;
        proposal.target = _target;
        proposal.approvals = 1;
        proposal.hasApproved[msg.sender] = true;
        proposal.executed = false;

        emit MultiSigProposalCreated(multiSigProposalCount, msg.sender, _action, _value, _target, block.number, block.timestamp);
        return multiSigProposalCount;
    }

    /**
     * @dev Approve a Multi-Sig Proposal
     */
    function approveMultiSigProposal(uint256 _proposalId) external onlyOwner nonReentrant {
        MultiSigProposal storage proposal = multiSigProposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= multiSigProposalCount, "Invalid proposal ID");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.hasApproved[msg.sender], "Already approved");

        proposal.hasApproved[msg.sender] = true;
        proposal.approvals++;

        emit MultiSigProposalApproved(_proposalId, msg.sender, block.number, block.timestamp);

        if (proposal.approvals >= requiredApprovals) {
            _executeMultiSigProposal(_proposalId);
        }
    }

    /**
     * @dev Internal function to execute Multi-Sig Proposal
     */
    function _executeMultiSigProposal(uint256 _proposalId) internal virtual {
        MultiSigProposal storage proposal = multiSigProposals[_proposalId];
        require(!proposal.executed, "Proposal already executed");
        proposal.executed = true;

        // Handle different actions
        if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("pause"))) {
            require(!paused, "Contract already paused");
            require(proposal.value == 0 && proposal.target == address(0), "Invalid parameters");
            _pause();
        } else if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("unpause"))) {
            require(paused, "Contract not paused");
            require(proposal.value == 0 && proposal.target == address(0), "Invalid parameters");
            _unpause();
        }
        // Additional actions can be handled in derived contracts

        emit MultiSigProposalExecuted(_proposalId, proposal.action, proposal.value, proposal.target, block.number, block.timestamp);
    }

    /**
     * @dev Check if action is valid
     */
    function _isValidAction(string memory _action) internal pure returns (bool) {
        return (
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("increaseVotingDuration")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("decreaseVotingDuration")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("executeProposal")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("retryFunding")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("batchRefund")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("deactivateInactiveInvestors")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("pause")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("unpause")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("emergencyExecute"))
        );
    }

    // View functions
    function getMultiSigProposalDetails(uint256 _proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory action,
        uint256 value,
        address target,
        uint256 approvals,
        bool executed
    ) {
        require(_proposalId > 0 && _proposalId <= multiSigProposalCount, "Invalid multi-sig proposal ID");
        MultiSigProposal storage proposal = multiSigProposals[_proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.action,
            proposal.value,
            proposal.target,
            proposal.approvals,
            proposal.executed
        );
    }

    function hasApprovedMultiSig(uint256 _proposalId, address owner) external view returns (bool) {
        require(_proposalId > 0 && _proposalId <= multiSigProposalCount, "Invalid multi-sig proposal ID");
        return multiSigProposals[_proposalId].hasApproved[owner];
    }
}