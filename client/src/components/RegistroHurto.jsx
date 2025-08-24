import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function RegistroHurto({ token, onCaseAdded, onCaseUpdated, caseToEdit, onCancel }) {
  const [formData, setFormData] = useState({
    fecha: '',
    comuna: '', // Will store Comuna Name for submission
    barrio: '',
    direccion: '',
    latitud: '',
    longitud: '',
    notas_investigador: '',
  });

  // State for dynamic dropdowns
  const [comunas, setComunas] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [selectedComunaId, setSelectedComunaId] = useState('');

  // State for adding a new barrio
  const [showAddBarrio, setShowAddBarrio] = useState(false);
  const [newBarrioName, setNewBarrioName] = useState('');

  const [victimas, setVictimas] = useState([]);
  const [vehiculosImplicados, setVehiculosImplicados] = useState([]);
  const [camarasSeguridad, setCamarasSeguridad] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isEditMode = Boolean(caseToEdit);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const direccionInputRef = useRef(null);

  // Fetch all comunas on component mount
  useEffect(() => {
    const fetchComunas = async () => {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(`${API_URL}/api/comunas`, { headers });
        setComunas(response.data);
      } catch (err) {
        setError('Error al cargar las comunas.');
      }
    };
    fetchComunas();
  }, [token, API_URL]);

  // Effect to populate form when in edit mode
  useEffect(() => {
    if (isEditMode && caseToEdit && comunas.length > 0) {
      const { victimas, vehiculos_implicados, camaras_seguridad, ...mainData } = caseToEdit;
      const formattedDate = new Date(mainData.fecha).toISOString().slice(0, 16);
      
      const currentComuna = comunas.find(c => c.nombre === mainData.comuna);
      if (currentComuna) {
        setSelectedComunaId(currentComuna.id);
      }

      setFormData({ ...mainData, fecha: formattedDate, notas_investigador: mainData.notas_investigador || '' });
      setVictimas(victimas || []);
      setVehiculosImplicados(vehiculos_implicados || []);
      setCamarasSeguridad(camaras_seguridad || []);
    }
  }, [caseToEdit, isEditMode, comunas]);

  // Fetch barrios when a comuna is selected
  useEffect(() => {
    const fetchBarrios = async () => {
      if (selectedComunaId) {
        try {
          const headers = { Authorization: `Bearer ${token}` };
          const response = await axios.get(`${API_URL}/api/comunas/${selectedComunaId}/barrios`, { headers });
          setBarrios(response.data);
        } catch (err) {
          setError('Error al cargar los barrios.');
        }
      }
    };
    fetchBarrios();
  }, [selectedComunaId, token, API_URL]);

  // Google Maps Autocomplete
  useEffect(() => {
    if (window.google && direccionInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        direccionInputRef.current,
        { types: ['address'], componentRestrictions: { country: 'co' } }
      );
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          setFormData(prevData => ({
            ...prevData,
            direccion: place.formatted_address,
            latitud: place.geometry.location.lat(),
            longitud: place.geometry.location.lng(),
          }));
        }
      });
    }
  }, []);

  const handleComunaChange = (e) => {
    const comunaId = e.target.value;
    const comunaName = e.target.options[e.target.selectedIndex].text;
    setSelectedComunaId(comunaId);
    setFormData(prev => ({ ...prev, comuna: comunaName, barrio: '' }));
    setBarrios([]);
    setShowAddBarrio(false);
  };

  const handleBarrioChange = (e) => {
    setFormData(prev => ({ ...prev, barrio: e.target.value }));
  };

  const handleSaveNewBarrio = async () => {
    if (!newBarrioName.trim() || !selectedComunaId) {
      setError('El nombre del nuevo barrio no puede estar vacío.');
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_URL}/api/barrios`, { nombre: newBarrioName, id_comuna: selectedComunaId }, { headers });
      const newBarrio = response.data;
      setBarrios(prevBarrios => [...prevBarrios, newBarrio].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setFormData(prev => ({ ...prev, barrio: newBarrio.nombre }));
      setNewBarrioName('');
      setShowAddBarrio(false);
      setError('');
    } catch (err) {
      setError('Error al guardar el nuevo barrio.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleAddVictima = () => setVictimas([...victimas, { nombres_apellidos: '', telefono_movil: '', nacionalidad: '', elementos_hurtados: '', vehiculo_hurtado: false, vehiculos: [] }]);
  const handleRemoveVictima = (index) => setVictimas(victimas.filter((_, i) => i !== index));
  const handleVictimaChange = (index, e) => {
    const newVictimas = [...victimas];
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      newVictimas[index][name] = checked;
      if (name === 'vehiculo_hurtado' && !checked) newVictimas[index].vehiculos = [];
    } else {
      newVictimas[index][name] = value;
    }
    setVictimas(newVictimas);
  };

  const handleAddVehiculo = (victimaIndex) => {
    const newVictimas = [...victimas];
    newVictimas[victimaIndex].vehiculos.push({ clase_vehiculo: '', placa: '', tipo_servicio: '', marca: '' });
    setVictimas(newVictimas);
  };
  const handleRemoveVehiculo = (victimaIndex, vehiculoIndex) => {
    const newVictimas = [...victimas];
    newVictimas[victimaIndex].vehiculos = newVictimas[victimaIndex].vehiculos.filter((_, i) => i !== vehiculoIndex);
    setVictimas(newVictimas);
  };
  const handleVehiculoChange = (victimaIndex, vehiculoIndex, e) => {
    const newVictimas = [...victimas];
    newVictimas[victimaIndex].vehiculos[vehiculoIndex][e.target.name] = e.target.value;
    setVictimas(newVictimas);
  };

  const handleAddVehiculoImplicado = () => setVehiculosImplicados([...vehiculosImplicados, { placa: '', clase_servicio: '', clase_vehiculo: '', organismo_transito: '', marca_color: '', capacidad_pasajeros: '', carroceria: '', tipo_numero_identificacion: '', nombres_apellidos_propietario: '', direccion_propietario: '', telefono_propietario: '', celular_propietario: '' }]);
  const handleRemoveVehiculoImplicado = (index) => setVehiculosImplicados(vehiculosImplicados.filter((_, i) => i !== index));
  const handleVehiculoImplicadoChange = (index, e) => {
    const newVehiculosImplicados = [...vehiculosImplicados];
    newVehiculosImplicados[index][e.target.name] = e.target.value;
    setVehiculosImplicados(newVehiculosImplicados);
  };

  const handleAddCamara = () => setCamarasSeguridad([...camarasSeguridad, { direccion_numero_camara: '', hora_video_inicio: '', hora_video_final: '', fotografia: '', observacion_general: '', observacion_detallada: '' }]);
  const handleRemoveCamara = (index) => setCamarasSeguridad(camarasSeguridad.filter((_, i) => i !== index));
  const handleCamaraChange = (index, e) => {
    const newCamaras = [...camarasSeguridad];
    if (e.target.name === 'fotografia') {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => { newCamaras[index].fotografia = reader.result; setCamarasSeguridad(newCamaras); };
        reader.readAsDataURL(file);
      }
    } else {
      newCamaras[index][e.target.name] = e.target.value;
    }
    setCamarasSeguridad(newCamaras);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const payload = { ...formData, victimas, vehiculos_implicados: vehiculosImplicados, camaras_seguridad: camarasSeguridad };
    const headers = { Authorization: `Bearer ${token}` };
    try {
      if (isEditMode) {
        await axios.put(`${API_URL}/api/casos/${caseToEdit.id}`, payload, { headers });
        setSuccess('Caso actualizado exitosamente.');
        if (onCaseUpdated) onCaseUpdated({ ...caseToEdit, ...payload });
      } else {
        const response = await axios.post(`${API_URL}/api/casos`, payload, { headers });
        setSuccess('Caso registrado exitosamente.');
        if (onCaseAdded) onCaseAdded(response.data);
        setFormData({ fecha: '', comuna: '', barrio: '', direccion: '', latitud: '', longitud: '', notas_investigador: '' });
        setVictimas([]);
        setVehiculosImplicados([]);
        setCamarasSeguridad([]);
        setSelectedComunaId('');
        setBarrios([]);
      }
    } catch (err) {
      setError(`Error al ${isEditMode ? 'actualizar' : 'registrar'} el caso.`);
      console.error(err);
    }
  };

  return (
    <div style={{ border: '2px solid #007bff', padding: '20px', margin: '20px 0', borderRadius: '10px' }}>
      <h3>{isEditMode ? 'Editar Caso' : 'Registrar Nuevo Hurto'}</h3>
      <form onSubmit={handleSubmit}>
        <h4>Ubicación del Hecho</h4>
        <label>Fecha:</label>
        <input type="datetime-local" name="fecha" value={formData.fecha} onChange={handleChange} required />
        
        <label>Comuna:</label>
        <select value={selectedComunaId} onChange={handleComunaChange} required>
          <option value="">Seleccione una Comuna</option>
          {comunas.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <label>Barrio:</label>
        <select name="barrio" value={formData.barrio} onChange={handleBarrioChange} required disabled={!selectedComunaId}>
          <option value="">Seleccione un Barrio</option>
          {barrios.map(b => (
            <option key={b.id} value={b.nombre}>{b.nombre}</option>
          ))}
        </select>
        
        {selectedComunaId && (
            <div style={{margin: '10px 0'}}>
                <button type="button" onClick={() => setShowAddBarrio(!showAddBarrio)}>
                    {showAddBarrio ? 'Cancelar' : 'Añadir nuevo barrio...'}
                </button>
                {showAddBarrio && (
                    <div style={{marginTop: '5px'}}>
                        <input 
                            type="text" 
                            value={newBarrioName} 
                            onChange={(e) => setNewBarrioName(e.target.value)} 
                            placeholder="Nombre del nuevo barrio"
                        />
                        <button type="button" onClick={handleSaveNewBarrio}>Guardar Barrio</button>
                    </div>
                )}
            </div>
        )}

        <label>Dirección:</label>
        <input type="text" name="direccion" ref={direccionInputRef} defaultValue={formData.direccion} onChange={handleChange} required />
        <label>Latitud:</label>
        <input type="text" name="latitud" value={formData.latitud} readOnly />
        <label>Longitud:</label>
        <input type="text" name="longitud" value={formData.longitud} readOnly />

        {/* --- VICTIMAS, VEHICULOS, CAMARAS sections are unchanged --- */}
        {/* ... existing JSX for victimas ... */}
        {/* ... existing JSX for vehiculosImplicados ... */}
        {/* ... existing JSX for camarasSeguridad ... */}

        {/* --- NOTAS INVESTIGADOR --- */}
        <h4>Notas del Investigador</h4>
        <textarea
          name="notas_investigador"
          value={formData.notas_investigador}
          onChange={handleChange}
          placeholder="Añada notas o detalles adicionales sobre el caso..."
          style={{ width: '100%', height: '80px', marginTop: '10px' }}
        />

        <div style={{ marginTop: '20px' }}>
          <button type="submit">{isEditMode ? 'Guardar Cambios' : 'Registrar Caso'}</button>
          {onCancel && <button type="button" onClick={onCancel} style={{ marginLeft: '10px' }}>Cancelar</button>}
        </div>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  );
}

export default RegistroHurto;
