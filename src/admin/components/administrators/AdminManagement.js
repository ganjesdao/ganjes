/**
 * Admin Management Component
 * Manage DAO administrators - Add, Remove, and View Admin Details
 */

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectAuth } from '../../store/slices/authSlice';
import AdminPageLayout from '../common/AdminPageLayout';
import { daoABI } from '../../../Auth/Abi';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getContractAddress, getRpcUrl, NETWORKS } from '../../../utils/networks';

const AdminManagement = () => {
  const auth = useSelector(selectAuth);
  const [adminList, setAdminList] = useState([]);
  const [daoContract, setDaoContract] = useState(null);
  const [daoContractWithSigner, setDaoContractWithSigner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [primaryAdmin, setPrimaryAdmin] = useState('');
  const [adminCount, setAdminCount] = useState(0);
  
  // Form states
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [removeAdminAddress, setRemoveAdminAddress] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isRemovingAdmin, setIsRemovingAdmin] = useState(false);
  
  // Admin activity logs
  const [adminLogs, setAdminLogs] = useState([]);

  // Custom styles
  useEffect(() => {
    const customStyles = `
      .admin-management-card {
        background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
        border: 2px solid transparent;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      
      .admin-management-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #8b5cf6, #3b82f6, #06b6d4, #10b981);
        background-size: 300% 300%;
        animation: gradientMove 3s ease infinite;
      }
      
      .admin-management-card:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(139, 92, 246, 0.1) !important;
        border-color: rgba(139, 92, 246, 0.2);
      }
      
      .admin-badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 25px;
        font-size: 0.875rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }
      
      .primary-admin-badge {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
      }
      
      .admin-input {
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 14px;
        transition: all 0.3s ease;
        background: rgba(255, 255, 255, 0.8);
        width: 100%;
      }
      
      .admin-input:focus {
        outline: none;
        border-color: #8b5cf6;
        box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        background: white;
      }
      
      .admin-btn {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        font-weight: 600;
        border-radius: 12px;
        padding: 12px 24px;
        border: none;
        cursor: pointer;
      }
      
      .admin-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }
      
      .admin-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed !important;
        transform: none !important;
        box-shadow: none !important;
      }
      
      .add-admin-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
      }
      
      .remove-admin-btn {
        background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
        color: white;
      }
      
      .admin-card {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid #e5e7eb;
        backdrop-filter: blur(10px);
      }
      
      .admin-list-item {
        background: linear-gradient(145deg, #f8fafc 0%, #ffffff 100%);
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 20px;
        margin: 12px 0;
        transition: all 0.3s ease;
        position: relative;
      }
      
      .admin-list-item:hover {
        transform: translateX(8px);
        box-shadow: 0 12px 28px rgba(0,0,0,0.1);
        border-color: #8b5cf6;
      }
      
      @keyframes gradientMove {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      
      .pulse-animation {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: .8; }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.innerText = customStyles;
    styleSheet.id = 'admin-management-styles';

    const existingStyles = document.getElementById('admin-management-styles');
    if (!existingStyles) {
      document.head.appendChild(styleSheet);
    }

    return () => {
      const styleElement = document.getElementById('admin-management-styles');
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  // Initialize on component mount
  useEffect(() => {
    if (auth.isAuthenticated) {
      checkWalletConnection();
    }
  }, [auth.isAuthenticated]);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const chainId = '0x' + network.chainId.toString(16);

        const networkConfig = Object.values(NETWORKS).find(n => n.chainId === chainId);
        if (networkConfig) {
          setCurrentNetwork(networkConfig);
          const address = getContractAddress(chainId);
          setContractAddress(address);
          await initializeContract(networkConfig, address);
        }
      } catch (error) {
        toast.info("Please connect your wallet and select a network");
      }
    }
  };

  const initializeContract = async (network, contractAddr) => {
    if (!contractAddr || contractAddr === '0x0000000000000000000000000000000000000000') {
      setDaoContract(null);
      setAdminList([]);
      return;
    }

    if (typeof window.ethereum === 'undefined') {
      toast.error("Please install MetaMask!");
      return;
    }

    try {
      setLoading(true);

      // Read-only contract with RPC provider
      const rpcUrl = getRpcUrl(network.chainId);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const readOnlyContract = new ethers.Contract(contractAddr, daoABI, provider);
      setDaoContract(readOnlyContract);

      // Contract with signer for transactions
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const signer = await browserProvider.getSigner();
      const signerContract = new ethers.Contract(contractAddr, daoABI, signer);
      setDaoContractWithSigner(signerContract);

      const address = await signer.getAddress();
      setUserAddress(address);

      // Fetch admin data
      await fetchAdminData(readOnlyContract, address);

      toast.success(`Connected to DAO contract on ${network.chainName}`);
    } catch (error) {
      console.error("Init error:", error.message);
      toast.error(`Failed to initialize contract: ${error.message}`);
      setDaoContract(null);
      setAdminList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async (contract, currentUserAddr) => {
    try {
      // Get primary admin
      const primaryAdminAddr = await contract.admin();
      setPrimaryAdmin(primaryAdminAddr);

      // Get admin count
      const count = await contract.adminCount();
      setAdminCount(Number(count));

      // Check if current user is admin
      const isAdmin = await contract.admins(currentUserAddr);
      setIsCurrentUserAdmin(isAdmin);

      // Fetch admin events to build admin list and history
      await fetchAdminEvents(contract, primaryAdminAddr);
      
    } catch (error) {
      console.error("Error fetching admin data:", error);
      setAdminList([]);
    }
  };

  const fetchAdminEvents = async (contract, primaryAdminAddr) => {
    try {
      const currentBlock = await contract.runner.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks

      // Fetch AdminAdded events
      const adminAddedFilter = contract.filters.AdminAdded();
      const adminAddedEvents = await contract.queryFilter(adminAddedFilter, fromBlock, currentBlock);

      // Fetch AdminRemoved events  
      const adminRemovedFilter = contract.filters.AdminRemoved();
      const adminRemovedEvents = await contract.queryFilter(adminRemovedFilter, fromBlock, currentBlock);

      // Process events to build admin list and activity log
      const adminData = [];
      const activityLog = [];
      const processedAdmins = new Set();

      // Add primary admin first
      adminData.push({
        address: primaryAdminAddr,
        isPrimary: true,
        addedBy: 'System',
        timestamp: 'Contract Creation',
        isActive: true
      });
      processedAdmins.add(primaryAdminAddr.toLowerCase());

      // Process AdminAdded events
      for (const event of adminAddedEvents) {
        const { newAdmin, addedBy, timestamp } = event.args;
        
        if (!processedAdmins.has(newAdmin.toLowerCase())) {
          // Check if this admin is still active (not removed later)
          const isRemoved = adminRemovedEvents.some(removeEvent => 
            removeEvent.args.removedAdmin.toLowerCase() === newAdmin.toLowerCase() &&
            removeEvent.blockNumber > event.blockNumber
          );

          if (!isRemoved) {
            adminData.push({
              address: newAdmin,
              isPrimary: false,
              addedBy: `${addedBy.slice(0, 8)}...${addedBy.slice(-6)}`,
              timestamp: new Date(Number(timestamp) * 1000).toLocaleDateString(),
              blockNumber: event.blockNumber,
              isActive: true
            });
          }
          processedAdmins.add(newAdmin.toLowerCase());
        }

        activityLog.push({
          type: 'admin_added',
          admin: newAdmin,
          actor: addedBy,
          timestamp: Number(timestamp),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          formattedTime: new Date(Number(timestamp) * 1000).toLocaleString()
        });
      }

      // Process AdminRemoved events
      for (const event of adminRemovedEvents) {
        const { removedAdmin, removedBy, timestamp } = event.args;
        
        activityLog.push({
          type: 'admin_removed',
          admin: removedAdmin,
          actor: removedBy,
          timestamp: Number(timestamp),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          formattedTime: new Date(Number(timestamp) * 1000).toLocaleString()
        });
      }

      // Sort activity log by timestamp (newest first)
      activityLog.sort((a, b) => b.timestamp - a.timestamp);

      setAdminList(adminData);
      setAdminLogs(activityLog);
      
    } catch (error) {
      console.error("Error fetching admin events:", error);
      // Fallback to basic admin list
      const primaryAdminAddr = await contract.admin();
      setAdminList([{
        address: primaryAdminAddr,
        isPrimary: true,
        addedBy: 'System',
        timestamp: 'Contract Creation',
        isActive: true
      }]);
    }
  };

  const addAdmin = async () => {
    if (!newAdminAddress || !ethers.isAddress(newAdminAddress)) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    if (!daoContractWithSigner) {
      toast.error("Contract not initialized with signer");
      return;
    }

    try {
      setIsAddingAdmin(true);
      toast.info("Adding admin. Please confirm the transaction...");

      const tx = await daoContractWithSigner.addAdmin(newAdminAddress);
      toast.info("Transaction submitted. Waiting for confirmation...");
      await tx.wait();

      toast.success(`Admin ${newAdminAddress} added successfully!`);
      setNewAdminAddress('');
      
      // Refresh admin data
      await fetchAdminData(daoContract, userAddress);
      
    } catch (error) {
      console.error('Error adding admin:', error);
      if (error.message.includes("user rejected")) {
        toast.error('Transaction rejected by user.');
      } else if (error.message.includes("Unauthorized")) {
        toast.error('Only admins can add new administrators.');
      } else if (error.message.includes("ZeroAddress")) {
        toast.error('Cannot add zero address as admin.');
      } else {
        toast.error(`Failed to add admin: ${error.message}`);
      }
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const removeAdmin = async () => {
    if (!removeAdminAddress || !ethers.isAddress(removeAdminAddress)) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    if (!daoContractWithSigner) {
      toast.error("Contract not initialized with signer");
      return;
    }

    try {
      setIsRemovingAdmin(true);
      toast.info("Removing admin. Please confirm the transaction...");

      const tx = await daoContractWithSigner.removeAdmin(removeAdminAddress);
      toast.info("Transaction submitted. Waiting for confirmation...");
      await tx.wait();

      toast.success(`Admin ${removeAdminAddress} removed successfully!`);
      setRemoveAdminAddress('');
      
      // Refresh admin data
      await fetchAdminData(daoContract, userAddress);
      
    } catch (error) {
      console.error('Error removing admin:', error);
      if (error.message.includes("user rejected")) {
        toast.error('Transaction rejected by user.');
      } else if (error.message.includes("Unauthorized")) {
        toast.error('Only admins can remove administrators.');
      } else {
        toast.error(`Failed to remove admin: ${error.message}`);
      }
    } finally {
      setIsRemovingAdmin(false);
    }
  };

  const handleNetworkChange = async (network) => {
    setCurrentNetwork(network);
    const address = getContractAddress(network.chainId);
    setContractAddress(address);
    await initializeContract(network, address);
  };

  const isNetworkSupported = () => {
    return currentNetwork && contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';
  };

  if (!auth.isAuthenticated) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <h2>Please log in to access Admin Management</h2>
        </div>
      </div>
    );
  }

  return (
    <AdminPageLayout onNetworkChange={handleNetworkChange}>
      {({ isMobile }) => (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: isMobile ? '2rem' : '3rem' }}>
              <div style={{
                width: isMobile ? '3rem' : '4rem',
                height: isMobile ? '3rem' : '4rem',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #8b5cf6',
                borderRadius: '50%',
                margin: '0 auto 1rem',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>Loading admin data from blockchain...</p>
            </div>
          ) : isNetworkSupported() ? (
            <>
              {/* Page Header */}
              <div style={{
                marginBottom: '2rem',
                padding: '2rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #667eea 100%)',
                borderRadius: '20px',
                color: 'white',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-50%',
                  width: '200px',
                  height: '200px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }}></div>
                <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2.5rem', fontWeight: '700', position: 'relative', zIndex: 1 }}>
                  🔐 Administrator Management
                </h1>
                <p style={{ margin: '1rem 0 0 0', opacity: '0.9', fontSize: isMobile ? '0.9rem' : '1.1rem', position: 'relative', zIndex: 1 }}>
                  Manage DAO administrators, permissions, and access control
                </p>
              </div>

              {/* Admin Statistics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: isMobile ? '1rem' : '1.5rem',
                marginBottom: '2rem'
              }}>
                <div className="admin-card" style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    👥 Total Admins
                  </h3>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937' }}>{adminCount}</div>
                </div>

                <div className="admin-card" style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ color: '#f59e0b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    👑 Primary Admin
                  </h3>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1f2937', fontFamily: 'monospace' }}>
                    {primaryAdmin ? `${primaryAdmin.slice(0, 10)}...${primaryAdmin.slice(-8)}` : 'Loading...'}
                  </div>
                </div>

                <div className="admin-card" style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ color: isCurrentUserAdmin ? '#10b981' : '#dc2626', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isCurrentUserAdmin ? '✅' : '❌'} Your Status
                  </h3>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600', color: isCurrentUserAdmin ? '#10b981' : '#dc2626' }}>
                    {isCurrentUserAdmin ? 'Admin' : 'Not Admin'}
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              {isCurrentUserAdmin && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '2rem',
                  marginBottom: '2rem'
                }}>
                  {/* Add Admin */}
                  <div className="admin-management-card" style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    padding: '2rem',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ 
                      margin: '0 0 1.5rem 0', 
                      color: '#10b981', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      fontSize: '1.25rem',
                      fontWeight: '700'
                    }}>
                      ➕ Add New Administrator
                    </h3>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Administrator Address
                      </label>
                      <input
                        type="text"
                        placeholder="0x1234567890123456789012345678901234567890"
                        value={newAdminAddress}
                        onChange={(e) => setNewAdminAddress(e.target.value)}
                        className="admin-input"
                        disabled={isAddingAdmin}
                      />
                    </div>
                    <button
                      onClick={addAdmin}
                      disabled={isAddingAdmin || !newAdminAddress}
                      className={`admin-btn add-admin-btn ${(isAddingAdmin || !newAdminAddress) ? 'pulse-animation' : ''}`}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      {isAddingAdmin ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Adding Admin...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-plus"></i>
                          Add Administrator
                        </>
                      )}
                    </button>
                  </div>

                  {/* Remove Admin */}
                  <div className="admin-management-card" style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    padding: '2rem',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ 
                      margin: '0 0 1.5rem 0', 
                      color: '#dc2626', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      fontSize: '1.25rem',
                      fontWeight: '700'
                    }}>
                      ➖ Remove Administrator
                    </h3>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Administrator Address
                      </label>
                      <input
                        type="text"
                        placeholder="0x1234567890123456789012345678901234567890"
                        value={removeAdminAddress}
                        onChange={(e) => setRemoveAdminAddress(e.target.value)}
                        className="admin-input"
                        disabled={isRemovingAdmin}
                      />
                    </div>
                    <button
                      onClick={removeAdmin}
                      disabled={isRemovingAdmin || !removeAdminAddress}
                      className={`admin-btn remove-admin-btn ${(isRemovingAdmin || !removeAdminAddress) ? 'pulse-animation' : ''}`}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      {isRemovingAdmin ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Removing Admin...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-minus"></i>
                          Remove Administrator
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Admin List */}
              <div className="admin-management-card" style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                marginBottom: '2rem'
              }}>
                <h3 style={{ 
                  margin: '0 0 2rem 0', 
                  color: '#8b5cf6', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  fontSize: '1.25rem',
                  fontWeight: '700'
                }}>
                  👥 Current Administrators
                </h3>

                {adminList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
                    <h4>No administrators found</h4>
                    <p>Loading admin data or no admins configured yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {adminList.filter(admin => admin.isActive).map((admin, index) => (
                      <div key={index} className="admin-list-item">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                              <span className={`admin-badge ${admin.isPrimary ? 'primary-admin-badge' : ''}`}>
                                {admin.isPrimary ? '👑 Primary Admin' : '👤 Administrator'}
                              </span>
                            </div>
                            <div style={{ 
                              fontFamily: 'monospace', 
                              fontSize: '1rem', 
                              fontWeight: '600', 
                              color: '#1f2937',
                              marginBottom: '0.25rem'
                            }}>
                              {admin.address}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              Added by: {admin.addedBy} • {admin.timestamp}
                              {admin.blockNumber && (
                                <span style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', background: '#f3f4f6', borderRadius: '4px', fontSize: '0.75rem' }}>
                                  Block #{admin.blockNumber}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {admin.address.toLowerCase() === userAddress.toLowerCase() && (
                              <span style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '20px',
                                fontSize: '0.875rem',
                                fontWeight: '600'
                              }}>
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Activity Log */}
              <div className="admin-management-card" style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ 
                  margin: '0 0 2rem 0', 
                  color: '#f59e0b', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  fontSize: '1.25rem',
                  fontWeight: '700'
                }}>
                  📋 Admin Activity History
                </h3>

                {adminLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📝</div>
                    <h4>No activity logs found</h4>
                    <p>Admin activity will appear here as it happens.</p>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1rem',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    paddingRight: '0.5rem'
                  }}>
                    {adminLogs.slice(0, 50).map((log, index) => (
                      <div key={index} style={{
                        background: log.type === 'admin_added' ? '#ecfdf5' : '#fef2f2',
                        border: `1px solid ${log.type === 'admin_added' ? '#d1fae5' : '#fecaca'}`,
                        borderRadius: '12px',
                        padding: '1rem',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontSize: '1.25rem'
                            }}>
                              {log.type === 'admin_added' ? '✅' : '❌'}
                            </span>
                            <span style={{
                              fontWeight: '600',
                              color: log.type === 'admin_added' ? '#059669' : '#dc2626',
                              textTransform: 'capitalize'
                            }}>
                              {log.type.replace('_', ' ')}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            fontWeight: '500'
                          }}>
                            {log.formattedTime}
                          </span>
                        </div>
                        
                        <div style={{ marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>
                            <strong>Admin:</strong> 
                            <span style={{ fontFamily: 'monospace', marginLeft: '0.5rem' }}>
                              {log.admin.slice(0, 12)}...{log.admin.slice(-10)}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                            <strong>{log.type === 'admin_added' ? 'Added by' : 'Removed by'}:</strong> 
                            <span style={{ fontFamily: 'monospace', marginLeft: '0.5rem' }}>
                              {log.actor.slice(0, 12)}...{log.actor.slice(-10)}
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                          <span>Block #{log.blockNumber}</span>
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            background: '#f3f4f6', 
                            borderRadius: '4px',
                            fontFamily: 'monospace'
                          }}>
                            {log.transactionHash.slice(0, 10)}...{log.transactionHash.slice(-8)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="admin-card" style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌐</div>
              <h3>Select a Network</h3>
              <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                Please connect your wallet and select a network to manage administrators
              </p>
            </div>
          )}

          {/* Spinner Animation */}
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </>
      )}
    </AdminPageLayout>
  );
};

export default AdminManagement;