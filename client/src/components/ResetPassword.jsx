import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function ResetPassword({ API_URL }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const { token } = useParams(); // Get token from URL
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmNewPassword) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        newPassword,
      });
      setMessage(response.data.message);
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/'); // Navigate to login page
      }, 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error al restablecer la contraseña.');
      console.error(error);
    }
  };

  return (
    <div style={{ border: '2px solid #007bff', padding: '20px', margin: '20px auto', borderRadius: '10px', maxWidth: '400px' }}>
      <h2>Restablecer Contraseña</h2>
      <form onSubmit={handleSubmit}>
        <label>Nueva Contraseña:</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <label>Confirmar Nueva Contraseña:</label>
        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          required
        />
        <button type="submit">Restablecer Contraseña</button>
        {message && <p>{message}</p>}
      </form>
    </div>
  );
}

export default ResetPassword;
