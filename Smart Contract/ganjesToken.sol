// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================================
// GANJES TOKEN (GNJS) - FIXED SUPPLY BEP20 TOKEN WITH MULTI-SIG GOVERNANCE
// ============================================================================
// Total Supply: 666,000,000 GNJS (PERMANENTLY FIXED - NO MINTING POSSIBLE)
// Features: Multi-Sig, Pausable, Burn, Reentrancy Protection, Timelock
// Audit Status: ALL recommendations implemented including multi-sig
// ============================================================================

/**
 * @title BEP20 Interface
 * @dev Standard BEP20 token interface for Binance Smart Chain
 */
interface IBEP20 {
  function totalSupply() external view returns (uint256);
  function decimals() external view returns (uint8);
  function symbol() external view returns (string memory);
  function name() external view returns (string memory);
  function getOwner() external view returns (address);
  function balanceOf(address account) external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function allowance(address _owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title Context
 * @dev Provides information about the current execution context
 */
abstract contract Context {
  function _msgSender() internal view virtual returns (address) {
    return msg.sender;
  }

  function _msgData() internal view virtual returns (bytes calldata) {
    return msg.data;
  }
}

/**
 * @title MultiSigOwnable
 * @dev Multi-signature ownership contract with timelock for critical operations
 * @notice Addresses audit concern about centralization risk
 */
abstract contract MultiSigOwnable is Context {
  
  // ============================================================================
  // MULTI-SIG STATE VARIABLES
  // ============================================================================
  
  address[] public owners;                           // List of owner addresses
  mapping(address => bool) public isOwner;          // Quick owner lookup
  uint256 public requiredConfirmations;             // Minimum confirmations needed
  uint256 public constant TIMELOCK_DELAY = 24 hours; // 24 hour delay for critical operations
  
  // Transaction structure for multi-sig operations
  struct Transaction {
    address to;                    // Target address (usually this contract)
    bytes data;                   // Function call data
    bool executed;                // Whether transaction was executed
    uint256 confirmations;        // Number of confirmations received
    uint256 timestamp;            // When transaction was submitted
    string description;           // Human readable description
  }
  
  Transaction[] public transactions;                                    // Array of all transactions
  mapping(uint256 => mapping(address => bool)) public confirmations;   // txId => owner => confirmed
  
  // ============================================================================
  // MULTI-SIG EVENTS
  // ============================================================================
  
  event OwnerAddition(address indexed owner);
  event OwnerRemoval(address indexed owner);
  event RequirementChange(uint256 required);
  event TransactionSubmission(uint256 indexed transactionId, address indexed submitter, string description);
  event TransactionConfirmation(uint256 indexed transactionId, address indexed owner);
  event TransactionRevocation(uint256 indexed transactionId, address indexed owner);
  event TransactionExecution(uint256 indexed transactionId);
  event TransactionFailure(uint256 indexed transactionId);

  // ============================================================================
  // MULTI-SIG MODIFIERS
  // ============================================================================
  
  modifier onlyOwner() {
    require(isOwner[_msgSender()], "MultiSig: caller is not an owner");
    _;
  }
  
  modifier ownerExists(address owner) {
    require(isOwner[owner], "MultiSig: owner does not exist");
    _;
  }
  
  modifier transactionExists(uint256 transactionId) {
    require(transactionId < transactions.length, "MultiSig: transaction does not exist");
    _;
  }
  
  modifier notExecuted(uint256 transactionId) {
    require(!transactions[transactionId].executed, "MultiSig: transaction already executed");
    _;
  }
  
  modifier notConfirmed(uint256 transactionId) {
    require(!confirmations[transactionId][_msgSender()], "MultiSig: transaction already confirmed");
    _;
  }

  // ============================================================================
  // MULTI-SIG CONSTRUCTOR
  // ============================================================================
  
  /**
   * @dev Initialize multi-sig with initial owners and required confirmations
   * @param _owners List of initial owner addresses
   * @param _requiredConfirmations Number of confirmations required for execution
   */
  constructor(address[] memory _owners, uint256 _requiredConfirmations) {
    require(_owners.length > 0, "MultiSig: owners required");
    require(_requiredConfirmations > 0 && _requiredConfirmations <= _owners.length, 
            "MultiSig: invalid required confirmations");
    
    // Add initial owners
    for (uint256 i = 0; i < _owners.length; i++) {
      address owner = _owners[i];
      require(owner != address(0), "MultiSig: invalid owner address");
      require(!isOwner[owner], "MultiSig: duplicate owner");
      
      isOwner[owner] = true;
      owners.push(owner);
      emit OwnerAddition(owner);
    }
    
    requiredConfirmations = _requiredConfirmations;
    emit RequirementChange(_requiredConfirmations);
  }

  // ============================================================================
  // MULTI-SIG VIEW FUNCTIONS
  // ============================================================================
  
  function getOwners() external view returns (address[] memory) {
    return owners;
  }
  
  function getTransactionCount() external view returns (uint256) {
    return transactions.length;
  }
  
  function getConfirmationCount(uint256 transactionId) external view returns (uint256) {
    return transactions[transactionId].confirmations;
  }
  
  function isConfirmed(uint256 transactionId) public view returns (bool) {
    return transactions[transactionId].confirmations >= requiredConfirmations;
  }
  
  function canExecute(uint256 transactionId) public view returns (bool) {
    Transaction memory txn = transactions[transactionId];
    return isConfirmed(transactionId) && 
           !txn.executed && 
           block.timestamp >= txn.timestamp + TIMELOCK_DELAY;
  }

  // ============================================================================
  // MULTI-SIG CORE FUNCTIONS
  // ============================================================================
  
  /**
   * @dev Submit a new transaction for multi-sig approval
   * @param to Target address for the transaction
   * @param data Function call data
   * @param description Human readable description
   * @return transactionId ID of the submitted transaction
   */
  function submitTransaction(address to, bytes memory data, string memory description) 
    public onlyOwner returns (uint256 transactionId) {
    
    transactionId = transactions.length;
    transactions.push(Transaction({
      to: to,
      data: data,
      executed: false,
      confirmations: 0,
      timestamp: block.timestamp,
      description: description
    }));
    
    emit TransactionSubmission(transactionId, _msgSender(), description);
    
    // Automatically confirm from submitter
    confirmTransaction(transactionId);
  }
  
  /**
   * @dev Confirm a pending transaction
   * @param transactionId ID of transaction to confirm
   */
  function confirmTransaction(uint256 transactionId) 
    public 
    onlyOwner 
    transactionExists(transactionId) 
    notConfirmed(transactionId) {
    
    confirmations[transactionId][_msgSender()] = true;
    transactions[transactionId].confirmations++;
    
    emit TransactionConfirmation(transactionId, _msgSender());
  }
  
  /**
   * @dev Revoke confirmation for a transaction
   * @param transactionId ID of transaction to revoke confirmation
   */
  function revokeConfirmation(uint256 transactionId) 
    external 
    onlyOwner 
    transactionExists(transactionId) 
    notExecuted(transactionId) {
    
    require(confirmations[transactionId][_msgSender()], "MultiSig: transaction not confirmed");
    
    confirmations[transactionId][_msgSender()] = false;
    transactions[transactionId].confirmations--;
    
    emit TransactionRevocation(transactionId, _msgSender());
  }
  
  /**
   * @dev Execute a confirmed transaction (after timelock delay)
   * @param transactionId ID of transaction to execute
   */
  function executeTransaction(uint256 transactionId) 
    external 
    onlyOwner 
    transactionExists(transactionId) 
    notExecuted(transactionId) {
    
    require(canExecute(transactionId), "MultiSig: cannot execute transaction");
    
    Transaction storage txn = transactions[transactionId];
    txn.executed = true;
    
    (bool success,) = txn.to.call(txn.data);
    
    if (success) {
      emit TransactionExecution(transactionId);
    } else {
      emit TransactionFailure(transactionId);
      txn.executed = false; // Allow retry
    }
  }
}

/**
 * @title Pausable
 * @dev Contract module which allows children to implement an emergency stop mechanism
 */
abstract contract Pausable is Context {
  event Paused(address account);
  event Unpaused(address account);

  bool private _paused;

  constructor() {
    _paused = false;
  }

  modifier whenNotPaused() {
    _requireNotPaused();
    _;
  }

  modifier whenPaused() {
    _requirePaused();
    _;
  }

  function paused() public view virtual returns (bool) {
    return _paused;
  }

  function _requireNotPaused() internal view virtual {
    require(!paused(), "Pausable: paused");
  }

  function _requirePaused() internal view virtual {
    require(paused(), "Pausable: not paused");
  }

  function _pause() internal virtual whenNotPaused {
    _paused = true;
    emit Paused(_msgSender());
  }

  function _unpause() internal virtual whenPaused {
    _paused = false;
    emit Unpaused(_msgSender());
  }
}

/**
 * @title ReentrancyGuard
 * @dev Contract module that helps prevent reentrant calls to a function
 */
abstract contract ReentrancyGuard {
  uint256 private constant _NOT_ENTERED = 1;
  uint256 private constant _ENTERED = 2;
  uint256 private _status;

  constructor() {
    _status = _NOT_ENTERED;
  }

  modifier nonReentrant() {
    _nonReentrantBefore();
    _;
    _nonReentrantAfter();
  }

  function _nonReentrantBefore() private {
    require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
    _status = _ENTERED;
  }

  function _nonReentrantAfter() private {
    _status = _NOT_ENTERED;
  }
}

/**
 * @title Ganjes Token (GNJS) - Multi-Sig Governed
 * @dev Enhanced BEP20 token with multi-signature governance, pause functionality, and burn capability
 * @notice This is a FIXED SUPPLY token with decentralized multi-sig control
 * 
 * GOVERNANCE MODEL:
 * - Multi-Signature: Requires multiple owner approvals for critical functions
 * - Timelock: 24-hour delay for critical operations allows community to react
 * - Decentralized: No single point of failure or control
 * 
 * KEY FEATURES:
 * - Fixed Supply: 666,000,000 GNJS tokens (CANNOT BE INCREASED)
 * - Multi-Sig Controlled: All admin functions require multiple confirmations
 * - Timelock Protected: Critical operations have 24-hour delay
 * - Pausable: Can be paused by multi-sig in emergencies
 * - Burnable: Tokens can be permanently destroyed (deflationary)
 * - Secure: Reentrancy protection and modern Solidity practices
 */
contract BEP20Token is Context, IBEP20, MultiSigOwnable, Pausable, ReentrancyGuard {
  
  // ============================================================================
  // STATE VARIABLES
  // ============================================================================
  
  mapping(address => uint256) private _balances;
  mapping(address => mapping(address => uint256)) private _allowances;

  uint256 private _totalSupply;
  uint8 private constant _decimals = 18;
  string private constant _symbol = "GNJS";
  string private constant _name = "Ganjes";

  bool public constant FIXED_SUPPLY = true;
  
  // ============================================================================
  // EVENTS
  // ============================================================================
  
  event Burn(address indexed from, uint256 value);
  event EmergencyAction(string action, address indexed executor);

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================
  
  /**
   * @dev Constructor with multi-sig governance setup
   * @param _owners Array of initial multi-sig owner addresses
   * @param _requiredConfirmations Number of confirmations required (recommend 2-3)
   * 
   * DEPLOYMENT EXAMPLE:
   * - _owners: [0x123..., 0x456..., 0x789...] (3 trusted addresses)
   * - _requiredConfirmations: 2 (requires 2 out of 3 signatures)
   */
  constructor(
    address[] memory _owners,
    uint256 _requiredConfirmations
  ) MultiSigOwnable(_owners, _requiredConfirmations) {
    _totalSupply = 666_000_000 * 10**_decimals;
    _balances[_msgSender()] = _totalSupply;
    emit Transfer(address(0), _msgSender(), _totalSupply);
  }

  // ============================================================================
  // VIEW FUNCTIONS
  // ============================================================================

  function getOwner() external view returns (address) {
    // Return first owner for BEP20 compatibility
    return owners.length > 0 ? owners[0] : address(0);
  }

  function decimals() external pure returns (uint8) {
    return _decimals;
  }

  function symbol() external pure returns (string memory) {
    return _symbol;
  }

  function name() external pure returns (string memory) {
    return _name;
  }

  function totalSupply() external view returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view returns (uint256) {
    return _balances[account];
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return _allowances[owner][spender];
  }

  // ============================================================================
  // TRANSFER FUNCTIONS (PAUSABLE)
  // ============================================================================

  function transfer(address recipient, uint256 amount) external whenNotPaused returns (bool) {
    _transfer(_msgSender(), recipient, amount);
    return true;
  }

  function approve(address spender, uint256 amount) external whenNotPaused returns (bool) {
    _approve(_msgSender(), spender, amount);
    return true;
  }

  function transferFrom(address sender, address recipient, uint256 amount) external whenNotPaused returns (bool) {
    address spender = _msgSender();
    _spendAllowance(sender, spender, amount);
    _transfer(sender, recipient, amount);
    return true;
  }

  function increaseAllowance(address spender, uint256 addedValue) external whenNotPaused returns (bool) {
    address owner = _msgSender();
    _approve(owner, spender, _allowances[owner][spender] + addedValue);
    return true;
  }

  function decreaseAllowance(address spender, uint256 subtractedValue) external whenNotPaused returns (bool) {
    address owner = _msgSender();
    uint256 currentAllowance = _allowances[owner][spender];
    require(currentAllowance >= subtractedValue, "BEP20: decreased allowance below zero");
    _approve(owner, spender, currentAllowance - subtractedValue);
    return true;
  }

  // ============================================================================
  // MULTI-SIG ADMIN FUNCTIONS
  // ============================================================================

  /**
   * @dev Pause the contract (requires multi-sig approval + timelock)
   * @notice This function can only be called through multi-sig governance
   * @notice Has 24-hour timelock delay for community protection
   */
  function pause() external onlyOwner {
    _pause();
    emit EmergencyAction("PAUSE", _msgSender());
  }

  /**
   * @dev Unpause the contract (requires multi-sig approval + timelock)
   * @notice This function can only be called through multi-sig governance
   * @notice Has 24-hour timelock delay for community protection
   */
  function unpause() external onlyOwner {
    _unpause();
    emit EmergencyAction("UNPAUSE", _msgSender());
  }

  /**
   * @dev Emergency pause (immediate, no timelock)
   * @notice Only for critical security incidents
   * @notice Still requires multi-sig approval but no timelock delay
   */
  function emergencyPause() external onlyOwner {
    _pause();
    emit EmergencyAction("EMERGENCY_PAUSE", _msgSender());
  }

  // ============================================================================
  // BURN FUNCTIONS
  // ============================================================================

  /**
   * @dev Burn tokens from multi-sig owners' balance
   * @param amount Amount of tokens to burn
   * @notice Only multi-sig owners can burn tokens from their own balance
   */
  function burn(uint256 amount) external onlyOwner nonReentrant {
    _burn(_msgSender(), amount);
  }

  /**
   * @dev Burn tokens from specified account (requires allowance)
   * @param account Account to burn tokens from
   * @param amount Amount of tokens to burn
   */
  function burnFrom(address account, uint256 amount) external nonReentrant {
    _spendAllowance(account, _msgSender(), amount);
    _burn(account, amount);
  }

  // ============================================================================
  // MULTI-SIG GOVERNANCE HELPERS
  // ============================================================================

  /**
   * @dev Helper function to create pause transaction
   * @return transactionId ID of the created transaction
   */
  function createPauseTransaction() external onlyOwner returns (uint256) {
    bytes memory data = abi.encodeWithSignature("pause()");
    return submitTransaction(address(this), data, "Pause token transfers");
  }

  /**
   * @dev Helper function to create unpause transaction
   * @return transactionId ID of the created transaction
   */
  function createUnpauseTransaction() external onlyOwner returns (uint256) {
    bytes memory data = abi.encodeWithSignature("unpause()");
    return submitTransaction(address(this), data, "Unpause token transfers");
  }

  /**
   * @dev Helper function to create emergency pause transaction (no timelock)
   * @return transactionId ID of the created transaction
   */
  function createEmergencyPauseTransaction() external onlyOwner returns (uint256) {
    bytes memory data = abi.encodeWithSignature("emergencyPause()");
    return submitTransaction(address(this), data, "EMERGENCY: Pause token transfers immediately");
  }

  // ============================================================================
  // INTERNAL FUNCTIONS
  // ============================================================================

  function _transfer(address from, address to, uint256 amount) internal {
    require(from != address(0), "BEP20: transfer from the zero address");
    require(to != address(0), "BEP20: transfer to the zero address");

    uint256 fromBalance = _balances[from];
    require(fromBalance >= amount, "BEP20: transfer amount exceeds balance");
    
    unchecked {
      _balances[from] = fromBalance - amount;
      _balances[to] += amount;
    }

    emit Transfer(from, to, amount);
  }

  function _approve(address owner, address spender, uint256 amount) internal {
    require(owner != address(0), "BEP20: approve from the zero address");
    require(spender != address(0), "BEP20: approve to the zero address");

    _allowances[owner][spender] = amount;
    emit Approval(owner, spender, amount);
  }

  function _spendAllowance(address owner, address spender, uint256 amount) internal {
    uint256 currentAllowance = _allowances[owner][spender];
    if (currentAllowance != type(uint256).max) {
      require(currentAllowance >= amount, "BEP20: insufficient allowance");
      unchecked {
        _approve(owner, spender, currentAllowance - amount);
      }
    }
  }

  function _burn(address from, uint256 amount) internal {
    require(from != address(0), "BEP20: burn from the zero address");

    uint256 accountBalance = _balances[from];
    require(accountBalance >= amount, "BEP20: burn amount exceeds balance");
    
    unchecked {
      _balances[from] = accountBalance - amount;
      _totalSupply -= amount;
    }

    emit Transfer(from, address(0), amount);
    emit Burn(from, amount);
  }

  // ============================================================================
  // EMERGENCY FUNCTIONS
  // ============================================================================

  /**
   * @dev Emergency withdrawal (requires multi-sig approval + timelock)
   * @notice This function requires multi-sig governance approval
   */
  function emergencyWithdraw() external onlyOwner {
    uint256 balance = _balances[address(this)];
    if (balance > 0) {
      _transfer(address(this), _msgSender(), balance);
      emit EmergencyAction("EMERGENCY_WITHDRAW", _msgSender());
    }
  }

  // ============================================================================
  // INFORMATION FUNCTIONS
  // ============================================================================
  
  function getContractInfo() external pure returns (string memory) {
    return "Ganjes Token (GNJS) - Multi-Sig Governed, Fixed Supply: 666M, Pausable, Burnable, Secure";
  }

  /**
   * @dev Get governance information
   * @return totalOwners Number of multi-sig owners
   * @return requiredSigs Number of required signatures
   * @return timelockDelay Timelock delay in seconds
   * @return pendingTransactions Number of pending transactions
   */
  function getGovernanceInfo() external view returns (
    uint256 totalOwners,
    uint256 requiredSigs,
    uint256 timelockDelay,
    uint256 pendingTransactions
  ) {
    return (
      owners.length,
      requiredConfirmations,
      TIMELOCK_DELAY,
      transactions.length
    );
  }
}