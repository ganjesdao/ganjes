import React, { useState } from 'react';
import axios from 'axios';

function Register() {
  const baseurl = process.env.REACT_APP_BASE_API_URL;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: null, message: '' });

  const validatePasswordStrength = (password) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return regex.test(password);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert({ type: null, message: '' });

    const fullName = `${firstName} ${lastName}`.trim();

    if (!termsAccepted) {
      setAlert({ type: 'error', message: 'You must accept the Terms and Conditions.' });
      setLoading(false);
      return;
    }

    if (!validatePasswordStrength(password)) {
      setAlert({
        type: 'error',
        message:
          'Password must be at least 8 characters long and include 1 uppercase, 1 number, and 1 special character.',
      });
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${baseurl}/register`, {
        name: fullName,
        email,
        password,
      });

      if (response.data.status) {
        setAlert({ type: 'success', message: 'Registration successful!' });
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setTermsAccepted(false);
      } else {
        setAlert({ type: 'error', message: response.data.message || 'Something went wrong' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setAlert({ type: 'error', message: 'Server error. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="col-lg-5">
        <div className="card">
          <div className="card-body p-4">
            <div className="text-center mb-4">
              <img src="assets/image/logo/light-logo.png" width={150} alt="Logo" />
            </div>

            <h4 className="text-center fw-bold text-gradient mb-2">Join Ganjes</h4>
            <p className="text-muted text-center mb-4">
              Already have an account? <a href="/signin">Sign In</a>
            </p>

            {alert.type && (
              <div className={`alert alert-${alert.type === 'success' ? 'success' : 'danger'}`}>
                {alert.message}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Password</label>
                  <div className="position-relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control pe-5"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 special, 1 number"
                      required
                    />
                    <span
                      className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ cursor: 'pointer' }}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </span>
                  </div>
                </div>

                <div className="col-12">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={() => setTermsAccepted(!termsAccepted)}
                      id="termsCheck"
                      required
                    />
                    <label className="form-check-label" htmlFor="termsCheck">
                      I accept the <a href="/terms" target="_blank">Terms and Conditions</a>
                    </label>
                  </div>
                </div>

                <div className="col-12">
                  <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                    {loading ? 'Registering...' : 'Sign Up'}
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

export default Register;
