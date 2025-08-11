import React, { useState } from 'react';
import axios from 'axios';

function Signin() {
  const baseurl = process.env.REACT_APP_BASE_API_URL;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertType, setAlertType] = useState(null); // 'success' or 'error'

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlertType(null);
    try {
      const response = await axios.post(`${baseurl}/login`, {
        email,
        password,
      });
      console.log(response.data);
      if (response.data.status) {
        setAlertType('success');
        sessionStorage.setItem('authToken', response.data.token);
        window.location.href = "/dashboard";
      } else {
        setAlertType('error');
      }
    } catch (error) {
      console.error(error);
      setAlertType('error');
    } finally {
      setLoading(false);
    }
  };
  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="col-lg-5">

        <div className="card mb-0">
          <div className="p-sm-8 p-md-10 card-body">
            <div className="text-center mb-4">
              <a href="" className="logos">
                <img src="assets/image/logo/light-logo.png" loading="lazy" alt="Logo" width={200} />
              </a>
            </div>
            <h4 className="mb-2 text-gradient fw-bold text-center">Welcome Back, Ganjes!</h4>
            <p className="mb-3 text-center text-muted">
              Don't have an account?{" "}
              <a href="/register" className="link link-primary">
                Sign Up
              </a>
            </p>

            {alertType === 'success' && (
              <div className="alert alert-success alert-dismissible" role="alert">
                <span>You've successfully signed in!</span>
                <button type="button" className="btn-close" onClick={() => setAlertType(null)} />
              </div>
            )}
            {alertType === 'error' && (
              <div className="alert alert-danger alert-dismissible" role="alert">
                <span>Invalid email or password</span>
                <button type="button" className="btn-close" onClick={() => setAlertType(null)} />
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="row g-4 mt-3">
                <div className="col-12 mt-0">
                  <label htmlFor="emailInput" className="form-label">Email Or Username</label>
                  <input
                    type="text"
                    id="emailInput"
                    placeholder="Enter your email or username"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="col-12">
                  <label htmlFor="passwordInput" className="form-label">Password</label>
                  <div className="position-relative">
                    <input type={showPassword ? 'text' : 'password'} id="passwordInput" className="form-control pe-8" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <div className="position-absolute top-50 end-0 me-3 translate-middle-y text-muted cursor-pointer" onClick={togglePassword} style={{ cursor: 'pointer' }}>
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                          <path d="M2.062 12.348a1 1 0 0 1 0-.696A10.75 10.75 0 0 1 21.938 12a1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                          <circle cx={12} cy={12} r={3} />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off">
                          <path d="M10.733 5.076A10.744 10.744 0 0 1 21.938 12a1 1 0 0 1 0 .696A10.747 10.747 0 0 1 20.494 15.186" />
                          <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                          <path d="M17.479 17.499A10.75 10.75 0 0 1 2.062 12a1 1 0 0 1 0-.696A10.75 10.75 0 0 1 6.508 6.161" />
                          <path d="M2 2l20 20" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-12 d-flex justify-content-between align-items-center">
                  <div className="form-check check-primary">
                    <input type="checkbox" id="rememberMe" className="form-check-input" />
                    <label htmlFor="rememberMe" className="form-check-label">Remember me</label>
                  </div>
                  <a href="auth-forgot-password-basic.html" className="fs-sm">Forgot Password?</a>
                </div>

                <div className="col-12 mb-5">
                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : null}
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Signin;
