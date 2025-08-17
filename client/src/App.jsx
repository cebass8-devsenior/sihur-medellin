import { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import ReCAPTCHA from "react-google-recaptcha"; // Import reCAPTCHA
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // Import routing components
import Dashboard from './components/Dashboard';
import ResetPassword from './components/ResetPassword'; // Import new ResetPassword component
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userRole, setUserRole] = useState(null);
  const [message, setMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null); // State for captcha token

  // State for Forgot Password form
  const [showForgotPasswordForm, setShowForgotPasswordForm] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

  // State for Remember Me checkbox
  const [rememberMe, setRememberMe] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  // TODO: Replace with your actual site key in a .env file for production
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setUserRole(decodedToken.role);
      } catch (error) {
        console.error("Error decoding token:", error);
        handleLogout(); // Clear invalid token
      }
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!captchaToken) {
      setMessage('Por favor, complete el Captcha.');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/login`, { 
        username, 
        password, 
        captchaToken, 
        rememberMe // Send rememberMe status
      });
      const newToken = response.data.token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      const decodedToken = jwtDecode(newToken);
      setUserRole(decodedToken.role);
      setMessage('Login successful!');
    } catch (error) {
      console.error('Login error:', error);
      setMessage(error.response?.data?.message || 'Login failed');
      // Reset captcha on login failure
      if (window.grecaptcha) {
        window.grecaptcha.reset();
      }
      setCaptchaToken(null);
    }
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage('');
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, { email: forgotPasswordEmail });
      setForgotPasswordMessage(response.data.message);
      setForgotPasswordEmail('');
    } catch (error) {
      setForgotPasswordMessage(error.response?.data?.message || 'Error al solicitar restablecimiento de contraseña.');
      console.error(error);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    setUserRole(null);
    setMessage('Logged out.');
  };

  return (
    <BrowserRouter>
      <div className="App">
        <header className="App-header">
          <img src="/Recurso 1.png" className="App-logo" alt="logo SIHUR" />
          <img src="/Recurso 2.png" className="App-logo" alt="logo Alcaldía de Medellín" />
          <h1>Sistema de Información para la gestión del hurto en Medellín (SIHUR)</h1>
        </header>
        <Routes>
          <Route path="/" element={
            !token ? (
              showForgotPasswordForm ? (
                <form onSubmit={handleForgotPasswordRequest}>
                  <h2>Restablecer Contraseña</h2>
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                  />
                  <button type="submit">Enviar Enlace de Restablecimiento</button>
                  {forgotPasswordMessage && <p>{forgotPasswordMessage}</p>}
                  <button type="button" onClick={() => setShowForgotPasswordForm(false)}>Volver al Login</button>
                </form>
              ) : (
                <form onSubmit={handleLogin}>
                  <h2>Login</h2>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div style={{ margin: '15px 0' }}>
                    <ReCAPTCHA
                      sitekey={RECAPTCHA_SITE_KEY}
                      onChange={(token) => setCaptchaToken(token)}
                      onExpired={() => setCaptchaToken(null)}
                    />
                  </div>
                  <div style={{ margin: '10px 0' }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      Recordarme
                    </label>
                  </div>
                  <button type="submit" disabled={!captchaToken}>Login</button>
                  {message && <p>{message}</p>}
                  <p><a href="#" onClick={() => setShowForgotPasswordForm(true)}>Olvidé mi contraseña</a></p>
                </form>
              )
            ) : (
              <div>
                <Dashboard userRole={userRole} />
                <button onClick={handleLogout}>Logout</button>
              </div>
            )
          } />
          <Route path="/reset-password/:token" element={<ResetPassword API_URL={API_URL} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;