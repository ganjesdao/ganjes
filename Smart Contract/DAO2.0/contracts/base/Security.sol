// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Security
 * @dev Base contract for security features (ReentrancyGuard, Pausable, MultiSig)
 */
abstract contract Security {
    // Custom ReentrancyGuard logic
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    // Pausable state
    bool public paused;

    // Multi-Sig Variables
    mapping(address => bool) public owners;
    uint256 public requiredApprovals;
    uint256 public constant MIN_OWNERS = 3;
    uint256 public constant MAX_OWNERS = 10;

    // Events
    event Paused(address indexed owner, uint256 blockNumber, uint256 timestamp);
    event Unpaused(address indexed owner, uint256 blockNumber, uint256 timestamp);

    // Modifiers
    modifier onlyOwner() {
        require(owners[msg.sender], "Only owner can perform this action");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier onlyEmergency() {
        require(paused, "Only available during emergency pause");
        _;
    }

    /**
     * @dev Initialize security features
     */
    function _initializeSecurity(address[] memory _initialOwners, uint256 _requiredApprovals) internal {
        require(_initialOwners.length >= MIN_OWNERS, "At least 3 owners required");
        require(_initialOwners.length <= MAX_OWNERS, "Too many owners");
        require(_requiredApprovals > 0 && _requiredApprovals <= _initialOwners.length, "Invalid required approvals");

        for (uint256 i = 0; i < _initialOwners.length; i++) {
            require(_initialOwners[i] != address(0), "Invalid owner address");
            require(!owners[_initialOwners[i]], "Duplicate owner");
            owners[_initialOwners[i]] = true;
        }
        
        requiredApprovals = _requiredApprovals;
        _status = _NOT_ENTERED;
        paused = false;
    }

    /**
     * @dev Pause the contract (multi-sig controlled)
     */
    function _pause() internal {
        require(!paused, "Contract already paused");
        paused = true;
        emit Paused(msg.sender, block.number, block.timestamp);
    }

    /**
     * @dev Unpause the contract (multi-sig controlled)
     */
    function _unpause() internal {
        require(paused, "Contract not paused");
        paused = false;
        emit Unpaused(msg.sender, block.number, block.timestamp);
    }

    // View functions
    function isOwner(address account) external view returns (bool) {
        return owners[account];
    }

    function getRequiredApprovals() external view returns (uint256) {
        return requiredApprovals;
    }
}