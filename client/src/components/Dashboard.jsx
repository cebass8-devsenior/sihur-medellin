import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import RegistroHurto from './RegistroHurto';
import RegistroPersonaIndividualizada from './RegistroPersonaIndividualizada';
import ConsultaCaso from './ConsultaCaso';

// Debounce utility function
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};

function Dashboard({ userRole }) {
  const [stats, setStats] = useState(null);
  const [topStats, setTopStats] = useState(null);
  const [topVehiculos, setTopVehiculos] = useState(null);
  const [todayCases, setTodayCases] = useState([]);
  const [error, setError] = useState('');
  const [showHurtoForm, setShowHurtoForm] = useState(false);
  const [showPersonaForm, setShowPersonaForm] = useState(false);
  const [editingCase, setEditingCase] = useState(null); // State for the case being edited
  const [searchQuery, setSearchQuery] = useState({
    placa_hurtado: '',
    placa_implicado: '',
    nombre_victima: '',
    cedula_persona: '',
    nombre_persona: '',
  });
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // State for Change Password form
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordMessage, setChangePasswordMessage] = useState('');

  const API_URL = 'http://localhost:3001';
  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsResponse, topStatsResponse, topVehiculosResponse, casesResponse] = await Promise.all([
        axios.get(`${API_URL}/api/statistics`, { headers }),
        axios.get(`${API_URL}/api/statistics/top`, { headers }),
        axios.get(`${API_URL}/api/statistics/top/vehiculos`, { headers }),
        axios.get(`${API_URL}/api/casos/today`, { headers })
      ]);
      setStats(statsResponse.data);
      setTopStats(topStatsResponse.data);
      setTopVehiculos(topVehiculosResponse.data);
      setTodayCases(casesResponse.data);
    } catch (err) {
      setError('Error al cargar los datos. Por favor, intente de nuevo más tarde.');
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const handleCaseAdded = (newCase) => {
    setTodayCases([newCase, ...todayCases]);
    fetchData(); // Re-fetch all data to update stats
    setShowHurtoForm(false);
  };

  const handleCaseUpdated = (updatedCase) => {
    const updateList = (list) => list.map(c => (c.id === updatedCase.id ? updatedCase : c));
    setTodayCases(updateList(todayCases));
    setSearchResults(updateList(searchResults));
    setEditingCase(null); // Close the edit form
    fetchData(); // Optionally re-fetch all data to ensure consistency
  };

  const handleEdit = async (caseId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/casos/${caseId}`, { headers });
      setEditingCase(response.data);
      setShowHurtoForm(false); // Hide the create form if it's open
      setShowChangePasswordForm(false); // Hide change password form
    } catch (err) {
      setError('Error al cargar los datos del caso para editar.');
      console.error(err);
    }
  };

  const handleCancelEdit = () => {
    setEditingCase(null);
  };

  // Debounced search function
  const performSearch = useCallback(debounce(async (query) => {
    setError('');
    setSelectedCaseId(null);
    setSearchResults([]);

    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value));

    if (params.toString() === '') {
      // If query is empty, clear search results and don't make API call
      setSearchResults([]);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/casos/search?${params.toString()}`, { headers });
      setSearchResults(response.data);
      if (response.data.length === 0) {
        setError('No se encontraron casos con los criterios de búsqueda.');
      }
    } catch (err) {
      setError('Error al realizar la búsqueda. Por favor, intente de nuevo.');
      console.error(err);
    }
  }, 500), [token, API_URL]); // Debounce delay of 500ms

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    const newSearchQuery = { ...searchQuery, [name]: value };
    setSearchQuery(newSearchQuery);
    performSearch(newSearchQuery); // Trigger debounced search
  };

  // Keep handleSearch for explicit button click if desired, or remove
  const handleSearchButtonClick = () => {
    performSearch(searchQuery); // Explicit search on button click
  };

  const handleDelete = async (caseId) => {
    if (window.confirm('¿Está seguro de que desea eliminar este caso? Esta acción no se puede deshacer.')) {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        await axios.delete(`${API_URL}/api/casos/${caseId}`, { headers });
        setTodayCases(todayCases.filter(c => c.id !== caseId));
        setSearchResults(searchResults.filter(c => c.id !== caseId));
      } catch (err) {
        setError('Error al eliminar el caso. Por favor, intente de nuevo.');
        console.error(err);
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordMessage('');
    setError('');

    if (newPassword !== confirmNewPassword) {
      setChangePasswordMessage('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_URL}/api/user/change-password`, {
        currentPassword,
        newPassword,
      }, { headers });
      setChangePasswordMessage(response.data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setChangePasswordMessage(err.response?.data?.message || 'Error al cambiar la contraseña.');
      console.error(err);
    }
  };

  const renderTopList = (data, title) => (
    <div>
      <h4>{title}</h4>
      <ol>
        {data && data.map((item, index) => (
          <li key={index}>{item.comuna || item.barrio || item.marca}: {item.count}</li>
        ))}
      </ol>
    </div>
  );

  return (
    <div>
      <h2>Dashboard</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {(userRole === 'admin' || userRole === 'visualizer') && (
        <button onClick={() => { setShowHurtoForm(!showHurtoForm); setEditingCase(null); setShowChangePasswordForm(false); }}>
          {showHurtoForm ? 'Cancelar Registro Hurto' : 'Registrar Nuevo Hurto'}
        </button>
      )}

      {(userRole === 'admin' || userRole === 'visualizer') && (
        <button onClick={() => setShowPersonaForm(!showPersonaForm)}>
          {showPersonaForm ? 'Cancelar Registro Persona' : 'Registrar Persona Individualizada'}
        </button>
      )}

      {token && (
        <button onClick={() => { setShowChangePasswordForm(!showChangePasswordForm); setShowHurtoForm(false); setEditingCase(null); }}>
          {showChangePasswordForm ? 'Cancelar Cambio de Contraseña' : 'Cambiar Contraseña'}
        </button>
      )}

      {/* --- FORMS SECTION --- */}
      {showHurtoForm && !editingCase && !showChangePasswordForm && (
        <RegistroHurto 
          token={token} 
          onCaseAdded={handleCaseAdded} 
          onCancel={() => setShowHurtoForm(false)}
        />
      )}
      {editingCase && !showHurtoForm && !showChangePasswordForm && (
        <RegistroHurto 
          token={token} 
          caseToEdit={editingCase} 
          onCaseUpdated={handleCaseUpdated} 
          onCancel={handleCancelEdit}
        />
      )}
      {showPersonaForm && !showHurtoForm && !editingCase && !showChangePasswordForm && <RegistroPersonaIndividualizada token={token} />}

      {showChangePasswordForm && (
        <div style={{ border: '2px solid #007bff', padding: '20px', margin: '20px 0', borderRadius: '10px' }}>
          <h3>Cambiar Contraseña</h3>
          <form onSubmit={handleChangePassword}>
            <label>Contraseña Actual:</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
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
            <button type="submit">Guardar Contraseña</button>
            {changePasswordMessage && <p>{changePasswordMessage}</p>}
          </form>
          <button onClick={() => setShowChangePasswordForm(false)} style={{ marginTop: '10px' }}>Cancelar</button>
        </div>
      )}

      {/* --- SEARCH SECTION --- */}
      <div>
        <h4>Buscar Casos</h4>
        <input type="text" name="placa_hurtado" placeholder="Placa Vehículo Hurtado" value={searchQuery.placa_hurtado} onChange={handleSearchChange} />
        <input type="text" name="placa_implicado" placeholder="Placa Vehículo Implicado" value={searchQuery.placa_implicado} onChange={handleSearchChange} />
        <input type="text" name="nombre_victima" placeholder="Nombre Víctima" value={searchQuery.nombre_victima} onChange={handleSearchChange} />
        <input type="text" name="cedula_persona" placeholder="Cédula Persona Individualizada" value={searchQuery.cedula_persona} onChange={handleSearchChange} />
        <input type="text" name="nombre_persona" placeholder="Nombre Persona Individualizada" value={searchQuery.nombre_persona} onChange={handleSearchChange} />
        <button onClick={handleSearchButtonClick}>Buscar Casos</button>

        {searchResults.length > 0 && (
          <div>
            <h5>Resultados de la Búsqueda:</h5>
            <ul>
              {searchResults.map(caseItem => (
                <li key={caseItem.id}>
                  Caso ID: {caseItem.id} - Código: {caseItem.codigo_caso} - Dirección: {caseItem.direccion}
                  <button onClick={() => setSelectedCaseId(caseItem.id)}>Ver Detalles</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {selectedCaseId && <ConsultaCaso token={token} caseId={selectedCaseId} />}

      {/* --- STATS SECTION --- */}
      <div className="estadisticas">
        <h3>Tarjetas de Datos Estadísticos</h3>
        {stats ? (
          <div className="stats-cards">
            <div className="card"><h4>Hurtos del día</h4><p>{stats.hurtos_dia}</p></div>
            <div className="card"><h4>Hurtos del mes</h4><p>{stats.hurtos_mes_acumulado}</p></div>
            <div className="card"><h4>Hurtos del año</h4><p>{stats.hurtos_ano_acumulado}</p></div>
          </div>
        ) : (
          <p>Cargando estadísticas...</p>
        )}
      </div>

      <div className="top-stats">
        <h3>Top 3</h3>
        {topStats || topVehiculos ? (
          <div className="top-stats-container">
            <div className="top-stat-card">{renderTopList(topStats?.top_comunas_dia, 'Comunas (Día)')}</div>
            <div className="top-stat-card">{renderTopList(topStats?.top_comunas_mes, 'Comunas (Mes)')}</div>
            <div className="top-stat-card">{renderTopList(topStats?.top_comunas_ano, 'Comunas (Año)')}</div>
            <div className="top-stat-card">{renderTopList(topStats?.top_barrios_dia, 'Barrios (Día)')}</div>
            <div className="top-stat-card">{renderTopList(topStats?.top_barrios_mes, 'Barrios (Mes)')}</div>
            <div className="top-stat-card">{renderTopList(topStats?.top_barrios_ano, 'Barrios (Año)')}</div>
            <div className="top-stat-card">{renderTopList(topVehiculos, 'Marcas de Vehículos')}</div>
          </div>
        ) : (
          <p>Cargando top estadísticas...</p>
        )}
      </div>

      {/* --- CASES TABLE --- */}
      <div className="registros">
        <h3>Tabla de Registros del Día</h3>
        {todayCases.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Código Caso</th>
                <th>Fecha</th>
                <th>Comuna</th>
                <th>Barrio</th>
                <th>Dirección</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {todayCases.map(c => (
                <tr key={c.id}>
                  <td>{c.codigo_caso}</td>
                  <td>{new Date(c.fecha).toLocaleString()}</td>
                  <td>{c.comuna}</td>
                  <td>{c.barrio}</td>
                  <td>{c.direccion}</td>
                  <td>
                    {(userRole === 'admin' || userRole === 'visualizer') && (
                      <button onClick={() => handleEdit(c.id)}>Editar</button>
                    )}
                    {userRole === 'admin' && (
                      <button onClick={() => handleDelete(c.id)}>Eliminar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay registros para el día de hoy.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
