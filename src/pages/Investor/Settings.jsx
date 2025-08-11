import React, { useCallback, useEffect, useState } from 'react';
import Header from './component/Header';
import Sidebar from './component/Sidebar';
import Footer from './component/Footer';
import Auth from '../../Auth/Auth';
import { toast } from 'react-toastify';
import { getContractAddress, getRpcUrl, isTestnet, getNetworkByChainId, NETWORKS } from '../../utils/networks';
import { daoABI } from '../../Auth/Abi';
import { tokenABI } from '../../utils/Tokenabi';
import { ethers } from 'ethers';
import { 
  FaCog, FaUser, FaBell, FaShieldAlt, FaNetworkWired, FaSave, 
  FaEye, FaEyeSlash, FaWallet, FaGlobe, FaLock, FaEnvelope, 
  FaMobile, FaDesktop, FaToggleOn, FaToggleOff, FaCheckCircle,
  FaTimes, FaExclamationTriangle, FaInfoCircle
} from 'react-icons/fa';

function InvestorSettings() {
  const [isToggle, setIsToggle] = useState(false);
  const [authToken] = useState(sessionStorage.getItem('authToken'));
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Profile Settings
  const [profileSettings, setProfileSettings] = useState({
    displayName: '',
    email: '',
    avatar: '',
    bio: '',
    publicProfile: true,
    showWalletAddress: false
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    proposalAlerts: true,
    votingReminders: true,
    investmentUpdates: true,
    systemUpdates: false,
    marketingEmails: false
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    loginAlerts: true,
    sessionTimeout: '30', // minutes
    autoLogout: true,
    hideBalances: false
  });

  // Network & Preferences
  const [preferences, setPreferences] = useState({
    defaultNetwork: 'BSC_TESTNET',
    autoConnect: true,
    gasPreference: 'medium',
    currency: 'USD',
    language: 'en',
    theme: 'light'
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add custom styles
  useEffect(() => {
    const customStyles = `
      .settings-card {
        background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
        border: none;
        border-radius: 15px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        transition: all 0.3s ease;
      }
      .settings-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .tab-navigation {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-bottom: 1px solid #dee2e6;
      }
      .tab-button {
        border: none;
        background: transparent;
        padding: 1rem 1.5rem;
        border-radius: 0;
        transition: all 0.3s ease;
        color: #6c757d;
        font-weight: 500;
      }
      .tab-button:hover {
        background-color: rgba(102, 126, 234, 0.1);
        color: #667eea;
      }
      .tab-button.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-bottom: 3px solid #495057;
      }
      .setting-item {
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 10px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        transition: all 0.3s ease;
      }
      .setting-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      }
      .toggle-switch {
        cursor: pointer;
        font-size: 1.5rem;
        transition: all 0.3s ease;
      }
      .toggle-switch.on {
        color: #28a745;
      }
      .toggle-switch.off {
        color: #6c757d;
      }
      .save-button {
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        border: none;
        border-radius: 25px;
        padding: 12px 30px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: all 0.3s ease;
      }
      .save-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(40, 167, 69, 0.3);
      }
      .network-badge {
        padding: 0.5rem 1rem;
        border-radius: 20px;
        border: 2px solid transparent;
        transition: all 0.3s ease;
        cursor: pointer;
      }
      .network-badge:hover {
        transform: translateY(-2px);
      }
      .network-badge.selected {
        border-color: #667eea;
        background: rgba(102, 126, 234, 0.1);
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = customStyles;
    styleSheet.id = 'investor-settings-styles';

    if (!document.getElementById('investor-settings-styles')) {
      document.head.appendChild(styleSheet);
    }

    return () => {
      const styleElement = document.getElementById('investor-settings-styles');
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  // Load settings from localStorage on component mount
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('investorProfileSettings');
      const savedNotifications = localStorage.getItem('investorNotificationSettings');
      const savedSecurity = localStorage.getItem('investorSecuritySettings');
      const savedPreferences = localStorage.getItem('investorPreferences');

      if (savedProfile) setProfileSettings(JSON.parse(savedProfile));
      if (savedNotifications) setNotificationSettings(JSON.parse(savedNotifications));
      if (savedSecurity) setSecuritySettings(JSON.parse(savedSecurity));
      if (savedPreferences) setPreferences(JSON.parse(savedPreferences));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Handle profile data from Auth
  const handleProfileDataFetched = (data) => {
    // Optional: Handle Auth result
  };

  // Handle network change
  const handleNetworkChange = useCallback((network) => {
    setCurrentNetwork(network);
    if (network) {
      setPreferences(prev => ({ ...prev, defaultNetwork: network.chainName }));
    }
  }, []);

  // Check wallet connection
  useEffect(() => {
    const checkWalletConnected = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setProfileSettings(prev => ({ 
            ...prev, 
            displayName: prev.displayName || `Investor ${accounts[0].substring(0, 8)}...`
          }));
        }
      } catch (error) {
        console.error('Failed to check connected accounts:', error);
      }
    };

    checkWalletConnected();

    window.ethereum?.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setWalletAddress(null);
      }
    });

    return () => {
      window.ethereum?.removeListener('accountsChanged', () => { });
    };
  }, []);

  // Save settings
  const saveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Save to localStorage
      localStorage.setItem('investorProfileSettings', JSON.stringify(profileSettings));
      localStorage.setItem('investorNotificationSettings', JSON.stringify(notificationSettings));
      localStorage.setItem('investorSecuritySettings', JSON.stringify(securitySettings));
      localStorage.setItem('investorPreferences', JSON.stringify(preferences));
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle functions
  const toggleNotificationSetting = (key) => {
    setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSecuritySetting = (key) => {
    setSecuritySettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleProfileSetting = (key) => {
    setProfileSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Render toggle switch
  const renderToggle = (isOn, onClick) => (
    <span className={`toggle-switch ${isOn ? 'on' : 'off'}`} onClick={onClick}>
      {isOn ? <FaToggleOn /> : <FaToggleOff />}
    </span>
  );

  // Tab content renderers
  const renderProfileTab = () => (
    <div className="row">
      <div className="col-md-8">
        <div className="setting-item">
          <h5 className="mb-3">
            <FaUser className="me-2 text-primary" />
            Profile Information
          </h5>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Display Name</label>
              <input
                type="text"
                className="form-control"
                value={profileSettings.displayName}
                onChange={(e) => setProfileSettings(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Enter your display name"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={profileSettings.email}
                onChange={(e) => setProfileSettings(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
              />
            </div>
            <div className="col-12 mb-3">
              <label className="form-label">Bio</label>
              <textarea
                className="form-control"
                rows="3"
                value={profileSettings.bio}
                onChange={(e) => setProfileSettings(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>
        </div>

        <div className="setting-item">
          <h5 className="mb-3">
            <FaEye className="me-2 text-info" />
            Privacy Settings
          </h5>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <strong>Public Profile</strong>
              <div className="text-muted small">Allow others to see your profile</div>
            </div>
            {renderToggle(profileSettings.publicProfile, () => toggleProfileSetting('publicProfile'))}
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Show Wallet Address</strong>
              <div className="text-muted small">Display wallet address on public profile</div>
            </div>
            {renderToggle(profileSettings.showWalletAddress, () => toggleProfileSetting('showWalletAddress'))}
          </div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="setting-item text-center">
          <h5 className="mb-3">
            <FaWallet className="me-2 text-success" />
            Connected Wallet
          </h5>
          {walletAddress ? (
            <div>
              <div className="bg-light p-3 rounded mb-3">
                <div className="small text-muted">Wallet Address</div>
                <div className="font-monospace fw-bold" style={{ fontSize: '0.9rem' }}>
                  {walletAddress.substring(0, 8)}...{walletAddress.slice(-8)}
                </div>
              </div>
              <div className="text-success">
                <FaCheckCircle className="me-1" />
                Connected
              </div>
            </div>
          ) : (
            <div>
              <div className="text-warning mb-3">
                <FaExclamationTriangle className="me-1" />
                No wallet connected
              </div>
              <button className="btn btn-primary btn-sm">
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="row">
      <div className="col-md-6">
        <div className="setting-item">
          <h5 className="mb-3">
            <FaBell className="me-2 text-warning" />
            General Notifications
          </h5>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <strong>Email Notifications</strong>
              <div className="text-muted small">Receive notifications via email</div>
            </div>
            {renderToggle(notificationSettings.emailNotifications, () => toggleNotificationSetting('emailNotifications'))}
          </div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <strong>Push Notifications</strong>
              <div className="text-muted small">Browser push notifications</div>
            </div>
            {renderToggle(notificationSettings.pushNotifications, () => toggleNotificationSetting('pushNotifications'))}
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>System Updates</strong>
              <div className="text-muted small">Platform updates and maintenance</div>
            </div>
            {renderToggle(notificationSettings.systemUpdates, () => toggleNotificationSetting('systemUpdates'))}
          </div>
        </div>
      </div>
      <div className="col-md-6">
        <div className="setting-item">
          <h5 className="mb-3">
            <FaMobile className="me-2 text-info" />
            DAO Activity Alerts
          </h5>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <strong>New Proposals</strong>
              <div className="text-muted small">Alert when new proposals are created</div>
            </div>
            {renderToggle(notificationSettings.proposalAlerts, () => toggleNotificationSetting('proposalAlerts'))}
          </div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <strong>Voting Reminders</strong>
              <div className="text-muted small">Remind me to vote on proposals</div>
            </div>
            {renderToggle(notificationSettings.votingReminders, () => toggleNotificationSetting('votingReminders'))}
          </div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <strong>Investment Updates</strong>
              <div className="text-muted small">Updates on your investments</div>
            </div>
            {renderToggle(notificationSettings.investmentUpdates, () => toggleNotificationSetting('investmentUpdates'))}
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Marketing Emails</strong>
              <div className="text-muted small">Promotional content and news</div>
            </div>
            {renderToggle(notificationSettings.marketingEmails, () => toggleNotificationSetting('marketingEmails'))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="row">
      <div className="col-md-6">
        <div className="setting-item">
          <h5 className="mb-3">
            <FaShieldAlt className="me-2 text-danger" />
            Security Features
          </h5>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <strong>Two-Factor Authentication</strong>
              <div className="text-muted small">Additional security for your account</div>
            </div>
            {renderToggle(securitySettings.twoFactorAuth, () => toggleSecuritySetting('twoFactorAuth'))}
          </div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <strong>Login Alerts</strong>
              <div className="text-muted small">Notify on new device login</div>
            </div>
            {renderToggle(securitySettings.loginAlerts, () => toggleSecuritySetting('loginAlerts'))}
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Auto Logout</strong>
              <div className="text-muted small">Automatically log out after inactivity</div>
            </div>
            {renderToggle(securitySettings.autoLogout, () => toggleSecuritySetting('autoLogout'))}
          </div>
        </div>
      </div>
      <div className="col-md-6">
        <div className="setting-item">
          <h5 className="mb-3">
            <FaLock className="me-2 text-secondary" />
            Privacy Options
          </h5>
          <div className="mb-3">
            <label className="form-label">Session Timeout</label>
            <select
              className="form-select"
              value={securitySettings.sessionTimeout}
              onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: e.target.value }))}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="0">Never</option>
            </select>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Hide Balance</strong>
              <div className="text-muted small">Hide token balances on dashboard</div>
            </div>
            {renderToggle(securitySettings.hideBalances, () => toggleSecuritySetting('hideBalances'))}
          </div>
        </div>
        
        <div className="setting-item">
          <div className="alert alert-info">
            <FaInfoCircle className="me-2" />
            <strong>Security Tip:</strong> Enable 2FA and use strong passwords to protect your account.
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="row">
      <div className="col-md-6">
        <div className="setting-item">
          <h5 className="mb-3">
            <FaNetworkWired className="me-2 text-primary" />
            Network Preferences
          </h5>
          <div className="mb-3">
            <label className="form-label">Preferred Network</label>
            <div className="row">
              {Object.entries(NETWORKS).map(([key, network]) => (
                <div className="col-6 mb-2" key={key}>
                  <div
                    className={`network-badge text-center ${preferences.defaultNetwork === key ? 'selected' : 'border'}`}
                    onClick={() => setPreferences(prev => ({ ...prev, defaultNetwork: key }))}
                  >
                    <div className="fw-bold">{network.chainName}</div>
                    <small className="text-muted">{isTestnet(network.chainId) ? 'Testnet' : 'Mainnet'}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Auto Connect</strong>
              <div className="text-muted small">Automatically connect to wallet</div>
            </div>
            {renderToggle(preferences.autoConnect, () => setPreferences(prev => ({ ...prev, autoConnect: !prev.autoConnect })))}
          </div>
        </div>
      </div>
      <div className="col-md-6">
        <div className="setting-item">
          <h5 className="mb-3">
            <FaGlobe className="me-2 text-success" />
            General Preferences
          </h5>
          <div className="mb-3">
            <label className="form-label">Gas Price Preference</label>
            <select
              className="form-select"
              value={preferences.gasPreference}
              onChange={(e) => setPreferences(prev => ({ ...prev, gasPreference: e.target.value }))}
            >
              <option value="low">Low (Slower)</option>
              <option value="medium">Medium (Recommended)</option>
              <option value="high">High (Faster)</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Display Currency</label>
            <select
              className="form-select"
              value={preferences.currency}
              onChange={(e) => setPreferences(prev => ({ ...prev, currency: e.target.value }))}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="BTC">BTC (₿)</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Language</label>
            <select
              className="form-select"
              value={preferences.language}
              onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {!authToken && <Auth onProfileDataFetched={handleProfileDataFetched} />}
      <div className={isToggle ? 'sb-nav-fixed sb-sidenav-toggled' : 'sb-nav-fixed'}>
        <Header isToggle={isToggle} setIsToggle={setIsToggle} onNetworkChange={handleNetworkChange} />
        <div id="layoutSidenav">
          <div id="layoutSidenav_nav">
            <nav className="sb-sidenav accordion sb-sidenav-dark" id="sidenavAccordion">
              <Sidebar />
            </nav>
          </div>
          <div id="layoutSidenav_content">
            <main>
              <div className="container-fluid px-4">
                <h1 className="mt-4">Settings</h1>
                <ol className="breadcrumb mb-4">
                  <li className="breadcrumb-item active">Account Settings</li>
                </ol>

                {/* Settings Card */}
                <div className="settings-card">
                  {/* Header */}
                  <div className="settings-header py-4 px-4">
                    <h3 className="mb-0">
                      <FaCog className="me-2" />
                      Account Settings
                    </h3>
                    <p className="mb-0 opacity-75">Manage your profile, notifications, and preferences</p>
                  </div>

                  {/* Tab Navigation */}
                  <div className="tab-navigation px-4">
                    <div className="d-flex">
                      {[
                        { id: 'profile', label: 'Profile', icon: FaUser },
                        { id: 'notifications', label: 'Notifications', icon: FaBell },
                        { id: 'security', label: 'Security', icon: FaShieldAlt },
                        { id: 'preferences', label: 'Preferences', icon: FaCog }
                      ].map(tab => {
                        const IconComponent = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                          >
                            <IconComponent className="me-2" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="p-4">
                    {activeTab === 'profile' && renderProfileTab()}
                    {activeTab === 'notifications' && renderNotificationsTab()}
                    {activeTab === 'security' && renderSecurityTab()}
                    {activeTab === 'preferences' && renderPreferencesTab()}

                    {/* Save Button */}
                    <div className="text-center mt-4">
                      <button
                        className="save-button btn text-white px-5"
                        onClick={saveSettings}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <div className="spinner-border spinner-border-sm me-2" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <FaSave className="me-2" />
                            Save Settings
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
}

export default InvestorSettings;