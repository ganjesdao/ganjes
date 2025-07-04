import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Landing from './pages/Landing/Landing';
import Marketplace from './pages/Landing/Marketplace';
import Signin from './pages/proposer/Signin';
import Dashboard from './pages/proposer/Dashbaord';
import Register from './pages/proposer/Register';
import CreateProposal from './pages/proposer/CreateProposal';
import Project from './pages/Landing/Peoject';
import Proposalcreate from './pages/proposer/ProposalCreate';
import Login from './pages/Investor/Login';
import Signup from './pages/Investor/Signup';
import InvestorDashboard from './pages/Investor/Dashboard';
import Join from './pages/Landing/Join';
import Joininvestor from './pages/Investor/Joininvestor';
import Analytics from './pages/Investor/Analytics';
import Proposal from './pages/Landing/Proposal';



//investor routes


function App() {
  return (
   <>
   <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/join" element={<Join />} />
        <Route path="/proposal" element={<Proposal />} />




        //proposer routes
        <Route path="/signin" element={<Signin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/project" element={<Project />} />
        <Route path="/create-proposal" element={<CreateProposal />} />
        <Route path="/proposal-create" element={<Proposalcreate />} />


        //Investor routestor routes  
        <Route path="/investor-login" element={<Login />} />
        <Route path="/investor-register" element={<Signup />} />
        <Route path="/investor-dashboard" element={<InvestorDashboard />} />
        <Route path="/investor-analytics" element={<Analytics />} />

        <Route path="/investor-join" element={<Joininvestor />} />
        


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
   </>
  );
}

export default App;
