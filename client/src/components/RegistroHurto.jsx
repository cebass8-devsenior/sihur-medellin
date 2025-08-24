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

  const handleSaveNewNacionalidad = async () => {
    if (!newNacionalidadName.trim()) {
      setError('El nombre de la nueva nacionalidad no puede estar vacío.');
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_URL}/api/nacionalidades`, { nombre: newNacionalidadName }, { headers });
      const newNacionalidad = response.data;
      setNacionalidades(prevNacionalidades => [...prevNacionalidades, newNacionalidad].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNewNacionalidadName('');
      setShowAddNacionalidad(false);
      setError('');
    } catch (err) {
      setError('Error al guardar la nueva nacionalidad.');
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

    // Convert date to UTC ISO string before sending
    const payload = { 
      ...formData, 
      fecha: new Date(formData.fecha).toISOString(),
      victimas, 
      vehiculos_implicados: vehiculosImplicados, 
      camaras_seguridad: camarasSeguridad 
    };

    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (isEditMode) {
        // Update existing case
        await axios.put(`${API_URL}/api/casos/${caseToEdit.id}`, payload, { headers });
        setSuccess('Caso actualizado exitosamente.');
        if (onCaseUpdated) onCaseUpdated({ ...caseToEdit, ...payload });
      } else {
        // Create new case
        const response = await axios.post(`${API_URL}/api/casos`, payload, { headers });
        setSuccess('Caso registrado exitosamente.');
        if (onCaseAdded) onCaseAdded(response.data);
        // Clear form only on successful creation
        setFormData({
          fecha: '',
          comuna: '',
          barrio: '',
          direccion: '',
          latitud: '',
          longitud: '',
          notas_investigador: '',
        });
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

        {/* --- VICTIMAS --- */}
        <h4>Víctimas</h4>
        {victimas.map((victima, victimaIndex) => (
          <div key={victimaIndex} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h5>Víctima {victimaIndex + 1}</h5>
              <button type="button" onClick={() => handleRemoveVictima(victimaIndex)}>Quitar Víctima</button>
            </div>
            <label>Nombres y Apellidos:</label>
            <input type="text" name="nombres_apellidos" value={victima.nombres_apellidos} onChange={(e) => handleVictimaChange(victimaIndex, e)} required />
            <label>Teléfono Móvil:</label>
            <input type="number" name="telefono_movil" value={victima.telefono_movil} onChange={(e) => handleVictimaChange(victimaIndex, e)} required minLength="10" />
            <label>Nacionalidad:</label>
            <input type="text" name="nacionalidad" value={victima.nacionalidad} onChange={(e) => handleVictimaChange(victimaIndex, e)} required />
            <label>Elementos Hurtados:</label>
            <input type="text" name="elementos_hurtados" value={victima.elementos_hurtados} onChange={(e) => handleVictimaChange(victimaIndex, e)} required />
            <label>
              <input type="checkbox" name="vehiculo_hurtado" checked={victima.vehiculo_hurtado} onChange={(e) => handleVictimaChange(victimaIndex, e)} />
              ¿Vehículo hurtado?
            </label>

            {victima.vehiculo_hurtado && (
              <div>
                <h6>Datos del Vehículo Hurtado</h6>
                {victima.vehiculos && victima.vehiculos.map((vehiculo, vehiculoIndex) => (
                  <div key={vehiculoIndex} style={{ border: '1px dashed #eee', padding: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <p>Vehículo {vehiculoIndex + 1}</p>
                       <button type="button" onClick={() => handleRemoveVehiculo(victimaIndex, vehiculoIndex)}>Quitar Vehículo</button>
                    </div>
                    <label>Clase de Vehículo:</label>
                    <input type="text" name="clase_vehiculo" value={vehiculo.clase_vehiculo} onChange={(e) => handleVehiculoChange(victimaIndex, vehiculoIndex, e)} required />
                    <label>Placa:</label>
                    <input type="text" name="placa" value={vehiculo.placa} onChange={(e) => handleVehiculoChange(victimaIndex, vehiculoIndex, e)} required />
                    <label>Tipo de Servicio:</label>
                    <select name="tipo_servicio" value={vehiculo.tipo_servicio} onChange={(e) => handleVehiculoChange(victimaIndex, vehiculoIndex, e)} required>
                      <option value="">Seleccione</option>
                      <option value="Público">Público</option>
                      <option value="Particular">Particular</option>
                    </select>
                    <label>Marca:</label>
                    <input type="text" name="marca" value={vehiculo.marca} onChange={(e) => handleVehiculoChange(victimaIndex, vehiculoIndex, e)} required />
                  </div>
                ))}
                <button type="button" onClick={() => handleAddVehiculo(victimaIndex)}>Adicionar Vehículo</button>
              </div>
            )}
          </div>
        ))}
        <button type="button" onClick={handleAddVictima}>Adicionar Víctima</button>

        {/* --- VEHICULOS IMPLICADOS --- */}
        <h4>Vehículo(s) Implicados en el Hurto</h4>
        {vehiculosImplicados.map((vehiculo, index) => (
          <div key={index} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h5>Vehículo Implicado {index + 1}</h5>
              <button type="button" onClick={() => handleRemoveVehiculoImplicado(index)}>Quitar Vehículo Implicado</button>
            </div>
            <label>Placa:</label>
            <input type="text" name="placa" value={vehiculo.placa} onChange={(e) => handleVehiculoImplicadoChange(index, e)} required />
            <label>Clase de Servicio:</label>
            <select name="clase_servicio" value={vehiculo.clase_servicio} onChange={(e) => handleVehiculoImplicadoChange(index, e)} required>
              <option value="">Seleccione</option>
              <option value="Público">Público</option>
              <option value="Particular">Particular</option>
            </select>
            <label>Clase de Vehículo:</label>
            <input type="text" name="clase_vehiculo" value={vehiculo.clase_vehiculo} onChange={(e) => handleVehiculoImplicadoChange(index, e)} required />
            <label>Organismo de Tránsito:</label>
            <input type="text" name="organismo_transito" value={vehiculo.organismo_transito} onChange={(e) => handleVehiculoImplicadoChange(index, e)} required />
            <label>Marca y Color:</label>
            <input type="text" name="marca_color" value={vehiculo.marca_color} onChange={(e) => handleVehiculoImplicadoChange(index, e)} required />
            <label>Capacidad de Pasajeros:</label>
            <input type="number" name="capacidad_pasajeros" value={vehiculo.capacidad_pasajeros} onChange={(e) => handleVehiculoImplicadoChange(index, e)} required />
            <label>Carrocería:</label>
            <input type="text" name="carroceria" value={vehiculo.carroceria} onChange={(e) => handleVehiculoImplicadoChange(index, e)} required />
            <h6>Datos del Propietario (RUNT)</h6>
            <label>Tipo y Número de Identificación:</label>
            <input type="text" name="tipo_numero_identificacion" value={vehiculo.tipo_numero_identificacion} onChange={(e) => handleVehiculoImplicadoChange(index, e)} required />
            <label>Nombres y Apellidos Propietario:</label>
            <input type="text" name="nombres_apellidos_propietario" value={vehiculo.nombres_apellidos_propietario} onChange={(e) => handleVehiculoImplicadoChange(index, e)} required />
            <label>Dirección Propietario:</label>
            <input type="text" name="direccion_propietario" value={vehiculo.direccion_propietario} onChange={(e) => handleVehiculoImplicadoChange(index, e)} required />
            <label>Teléfono Propietario:</label>
            <input type="text" name="telefono_propietario" value={vehiculo.telefono_propietario} onChange={(e) => handleVehiculoImplicadoChange(index, e)} required />
            <label>Celular Propietario:</label>
            <input type="text" name="celular_propietario" value={vehiculo.celular_propietario} onChange={(e) => handleVehiculoImplicadoChange(index, e)} required />
          </div>
        ))}
        <button type="button" onClick={handleAddVehiculoImplicado}>Adicionar Vehículo Implicado</button>

        {/* --- CAMARAS --- */}
        <h4>Trazabilidad de Cámaras de Seguridad</h4>
        {camarasSeguridad.map((camara, index) => (
          <div key={index} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h5>Cámara {index + 1}</h5>
              <button type="button" onClick={() => handleRemoveCamara(index)}>Quitar Cámara</button>
            </div>
            <label>Dirección y Número de Cámara:</label>
            <input type="text" name="direccion_numero_camara" value={camara.direccion_numero_camara} onChange={(e) => handleCamaraChange(index, e)} required />
            <label>Hora Video Inicio:</label>
            <input type="time" name="hora_video_inicio" value={camara.hora_video_inicio} onChange={(e) => handleCamaraChange(index, e)} required />
            <label>Hora Video Final:</label>
            <input type="time" name="hora_video_final" value={camara.hora_video_final} onChange={(e) => handleCamaraChange(index, e)} required />
            <label>Fotografía:</label>
            <input type="file" name="fotografia" accept="image/jpeg,image/png" onChange={(e) => handleCamaraChange(index, e)} />
            {camara.fotografia && <img src={camara.fotografia} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px' }} />}
            <label>Observación General:</label>
            <input type="text" name="observacion_general" value={camara.observacion_general} onChange={(e) => handleCamaraChange(index, e)} />
            <label>Observación Detallada:</label>
            <textarea name="observacion_detallada" value={camara.observacion_detallada} onChange={(e) => handleCamaraChange(index, e)}></textarea>
          </div>
        ))}
        <button type="button" onClick={handleAddCamara}>Adicionar Cámara</button>

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
