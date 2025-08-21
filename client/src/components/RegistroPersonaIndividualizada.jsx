import React, { useState } from 'react';
import axios from 'axios';

function RegistroPersonaIndividualizada({ token }) {
  const [formData, setFormData] = useState({
    nombres_apellidos: '',
    cedula: '',
    telefono_movil: '',
    direccion: '',
    fotografia: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, fotografia: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_URL}/api/v1/personas_individualizadas`, formData, { headers });
      setSuccess('Persona individualizada registrada exitosamente.');
      // Clear form
      setFormData({
        nombres_apellidos: '',
        cedula: '',
        telefono_movil: '',
        direccion: '',
        fotografia: '',
      });
    } catch (err) {
      setError('Error al registrar persona individualizada. Por favor, intente de nuevo.');
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setSearchResults([]);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/v1/personas_individualizadas/search?query=${searchQuery}`, { headers });
      setSearchResults(response.data);
    } catch (err) {
      setError('Error al buscar personas individualizadas. Por favor, intente de nuevo.');
      console.error(err);
    }
  };

  const handleAssociate = async (personaId) => {
    if (!selectedCaseId) {
      setError('Por favor, ingrese un ID de caso para asociar.');
      return;
    }
    setError('');
    setSuccess('');

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/v1/casos/${selectedCaseId}/personas_individualizadas`, { id_persona_individualizada: personaId }, { headers });
      setSuccess('Persona individualizada asociada al caso exitosamente.');
    } catch (err) {
      setError('Error al asociar persona individualizada al caso. Por favor, intente de nuevo.');
      console.error(err);
    }
  };

  return (
    <div>
      <h3>Registro de Personas Individualizadas</h3>
      <form onSubmit={handleRegister}>
        <h4>Registrar Nueva Persona</h4>
        <label>Nombres y Apellidos:</label>
        <input type="text" name="nombres_apellidos" value={formData.nombres_apellidos} onChange={handleChange} required />
        <label>Cédula:</label>
        <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} required />
        <label>Teléfono Móvil:</label>
        <input type="number" name="telefono_movil" value={formData.telefono_movil} onChange={handleChange} required minLength="10" />
        <label>Dirección:</label>
        <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} required />
        <label>Fotografía:</label>
        <input type="file" name="fotografia" accept="image/jpeg,image/png" onChange={handleFileChange} />
        {formData.fotografia && <img src={formData.fotografia} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px' }} />}
        <button type="submit">Registrar Persona</button>
      </form>

      <hr />

      <h4>Buscar y Asociar Persona Existente</h4>
      <form onSubmit={handleSearch}>
        <label>Buscar por Nombre, Cédula o Teléfono:</label>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <button type="submit">Buscar</button>
      </form>

      {searchResults.length > 0 && (
        <div>
          <h5>Resultados de la Búsqueda:</h5>
          <label>ID del Caso para Asociar:</label>
          <input type="text" value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} placeholder="Ej: 123" />
          <ul>
            {searchResults.map(person => (
              <li key={person.id}>
                {person.nombres_apellidos} ({person.cedula}) - {person.telefono_movil}
                <button onClick={() => handleAssociate(person.id)}>Asociar al Caso</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  );
}

export default RegistroPersonaIndividualizada;
