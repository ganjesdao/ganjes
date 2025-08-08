import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect } from 'react';
import { initializeSecurity } from './utils/securityHeaders';
import { WalletProvider } from './context/WalletContext';
import Landing from './pages/Landing/Landing';
import Marketplace from './pages/Landing/Marketplace';
import Signin from './pages/proposer/Signin';
import Dashboard from './pages/proposer/Dashboard';
import Register from './pages/proposer/Register';
import CreateProposal from './pages/proposer/CreateProposal';
import ProposalCreate from './pages/proposer/ProposalCreate';
import Login from './pages/Investor/Login';
import Signup from './pages/Investor/Signup';
import InvestorDashboard from './pages/Investor/Dashboard';
import Join from './pages/Landing/Join';
import JoinInvestor from './pages/Investor/JoinInvestor';
import Analytics from './pages/Investor/Analytics';
import Proposal from './pages/Landing/Proposal';
import Vote from './pages/Investor/Vote';
import MyVoting from './pages/Investor/MyVoting';
import ProposalDetails from './pages/proposer/ProposalDetails';
import AdminApp from './admin/AdminApp';





function App() {
  // Initialize security features on app load
  useEffect(() => {
    initializeSecurity();
  }, []);

  return (
    <>
      <WalletProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/join" element={<Join />} />
            <Route path="/proposal" element={<Proposal />} />




            {/* proposer routes */}
            <Route path="/signin" element={<Signin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-proposal" element={<CreateProposal />} />
            <Route path="/proposal-create" element={<ProposalCreate />} />
            <Route path="/proposal-details" element={<ProposalDetails />} />

            {/* Investor routes */}
            <Route path="/investor-login" element={<Login />} />
            <Route path="/investor-register" element={<Signup />} />
            <Route path="/investor-dashboard" element={<InvestorDashboard />} />
            <Route path="/investor-analytics" element={<Analytics />} />
            <Route path="/investor-vote" element={<Vote />} />
            <Route path="/investor-voting-data" element={<MyVoting />} />

            <Route path="/investor-join" element={<JoinInvestor />} />

            {/* Admin routes */}
            <Route path="/admin/*" element={<AdminApp />} />

          </Routes>
        </Router>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </WalletProvider>
    </>
  );
}

export default App;
