import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Renamed props for clarity
function RegistroHurto({ token, onCaseAdded, onCaseUpdated, caseToEdit, onCancel }) {
  const [formData, setFormData] = useState({
    fecha: '',
    comuna: '',
    barrio: '',
    direccion: '',
    latitud: '',
    longitud: '',
  });
  const [victimas, setVictimas] = useState([]);
  const [vehiculosImplicados, setVehiculosImplicados] = useState([]);
  const [camarasSeguridad, setCamarasSeguridad] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isEditMode = Boolean(caseToEdit);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const direccionInputRef = useRef(null);

  const comunasData = {
    "Comuna 1 - Popular": ["Popular", "Santo Domingo Savio", "Granizal", "Moscú No. 1", "Villa Guadalupe"],
    "Comuna 2 - Santa Cruz": ["Santa Cruz", "La Francia", "Berlín", "San Pedro", "La Isla"],
    "Comuna 3 - Manrique": ["Manrique Central No. 1", "El Pomar", "La Salle", "Versalles", "Campo Valdés No. 2"],
    "Comuna 4 - Aranjuez": ["Aranjuez", "San Isidro", "Palermo", "Bermejal-Los Álamos", "Miranda"],
    "Comuna 5 - Castilla": ["Castilla", "Tricentenario", "La Paralela", "Las Brisas", "Moravia"],
    "Comuna 6 - Doce de Octubre": ["Doce de Octubre No. 1", "Pedregal", "La Esperanza", "Progreso", "Kennedy"],
    "Comuna 7 - Robledo": ["Robledo", "La Pola", "El Diamante", "Aures No. 1", "Pajarito"],
    "Comuna 8 - Villa Hermosa": ["Villa Hermosa", "San Antonio", "Enciso", "Sucre", "La Ladera"],
    "Comuna 9 - Buenos Aires": ["Buenos Aires", "Caicedo", "La Milagrosa", "El Salvador", "Las Lomas"],
    "Comuna 10 - La Candelaria": ["La Candelaria", "Prado", "Estación Villa", "San Benito", "Corpus Christi"],
    "Comuna 11 - Laureles-Estadio": ["Laureles", "Estadio", "Conquistadores", "Carlos E. Restrepo", "Bolivariana"],
    "Comuna 12 - La América": ["La América", "Ferrini", "Calasanz", "San Javier", "Santa Lucía"],
    "Comuna 13 - San Javier": ["San Javier", "La Loma", "El Salado", "Blanquizal", "Eduardo Santos"],
    "Comuna 14 - El Poblado": ["El Poblado", "Castropol", "Manila", "Patio Bonito", "El Tesoro"],
    "Comuna 15 - Guayabal": ["Guayabal", "La Colina", "Santa Fe", "San Rafael", "Cristo Rey"],
    "Comuna 16 - Belén": ["Belén", "Fátima", "Rosales", "Las Playas", "La Mota"],
    "Comuna 50 - Altavista": ["Altavista", "La Loma del Indio", "San José de la Montaña", "El Corazón", "Aguas Frías"],
    "Comuna 60 - San Antonio de Prado": ["San Antonio de Prado", "La Verde", "El Salado", "San José", "La Tablaza"],
    "Comuna 70 - San Cristóbal": ["San Cristóbal", "La Cuchilla", "El Llano", "La Palma", "El Picacho"],
    "Comuna 80 - Palmitas": ["Palmitas", "La Aldea", "La Sucia", "La Frisolera", "La Potrera"],
    "Comuna 90 - Santa Elena": ["Santa Elena", "El Plan", "El Cerro", "El Llano", "El Rosario"],
  };

  // Effect to populate form when in edit mode
  useEffect(() => {
    if (isEditMode && caseToEdit) {
      const { victimas, vehiculos_implicados, camaras_seguridad, ...mainData } = caseToEdit;
      // Format date for datetime-local input
      const formattedDate = new Date(mainData.fecha).toISOString().slice(0, 16);
      setFormData({ ...mainData, fecha: formattedDate });
      setVictimas(victimas || []);
      setVehiculosImplicados(vehiculos_implicados || []);
      setCamarasSeguridad(camaras_seguridad || []);
    }
  }, [caseToEdit, isEditMode]);

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
        } else {
          setFormData(prevData => ({
            ...prevData,
            direccion: place.name,
            latitud: '',
            longitud: '',
          }));
        }
      });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));

    if (name === 'comuna') {
      setFormData(prevData => ({
        ...prevData,
        barrio: '' // Reset barrio when comuna changes
      }));
    }
  };

  // All other handlers (handleVictimaChange, handleAddVehiculo, etc.) remain the same
  const handleAddVictima = () => {
    setVictimas([...victimas, {
      nombres_apellidos: '',
      telefono_movil: '',
      nacionalidad: '',
      elementos_hurtados: '',
      vehiculo_hurtado: false,
      vehiculos: [],
    }]);
  };

  const handleVictimaChange = (index, e) => {
    const newVictimas = [...victimas];
    if (e.target.name === 'vehiculo_hurtado') {
      newVictimas[index][e.target.name] = e.target.checked;
      if (!e.target.checked) {
        newVictimas[index].vehiculos = []; // Clear vehicles if checkbox is unchecked
      }
    } else {
      newVictimas[index][e.target.name] = e.target.value;
    }
    setVictimas(newVictimas);
  };

  const handleAddVehiculo = (victimaIndex) => {
    const newVictimas = [...victimas];
    newVictimas[victimaIndex].vehiculos.push({
      clase_vehiculo: '',
      placa: '',
      tipo_servicio: '',
      marca: '',
    });
    setVictimas(newVictimas);
  };

  const handleVehiculoChange = (victimaIndex, vehiculoIndex, e) => {
    const newVictimas = [...victimas];
    newVictimas[victimaIndex].vehiculos[vehiculoIndex][e.target.name] = e.target.value;
    setVictimas(newVictimas);
  };

  const handleAddVehiculoImplicado = () => {
    setVehiculosImplicados([...vehiculosImplicados, {
      placa: '',
      clase_servicio: '',
      clase_vehiculo: '',
      organismo_transito: '',
      marca_color: '',
      capacidad_pasajeros: '',
      carroceria: '',
      tipo_numero_identificacion: '',
      nombres_apellidos_propietario: '',
      direccion_propietario: '',
      telefono_propietario: '',
      celular_propietario: '',
    }]);
  };

  const handleVehiculoImplicadoChange = (index, e) => {
    const newVehiculosImplicados = [...vehiculosImplicados];
    newVehiculosImplicados[index][e.target.name] = e.target.value;
    setVehiculosImplicados(newVehiculosImplicados);
  };

  const handleAddCamara = () => {
    setCamarasSeguridad([...camarasSeguridad, {
      direccion_numero_camara: '',
      hora_video_inicio: '',
      hora_video_final: '',
      fotografia: '',
      observacion_general: '',
      observacion_detallada: '',
    }]);
  };

  const handleCamaraChange = (index, e) => {
    const newCamaras = [...camarasSeguridad];
    if (e.target.name === 'fotografia') {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newCamaras[index].fotografia = reader.result;
          setCamarasSeguridad(newCamaras);
        };
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
        // Update existing case
        await axios.put(`${API_URL}/api/v1/casos/${caseToEdit.id}`, payload, { headers });
        setSuccess('Caso actualizado exitosamente.');
        if (onCaseUpdated) onCaseUpdated({ ...caseToEdit, ...payload });
      } else {
        // Create new case
        const response = await axios.post(`${API_URL}/api/v1/casos`, payload, { headers });
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
        });
        setVictimas([]);
        setVehiculosImplicados([]);
        setCamarasSeguridad([]);
      }
    } catch (err) {
      setError(`Error al ${isEditMode ? 'actualizar' : 'registrar'} el caso. Por favor, intente de nuevo.`);
      console.error(err);
    }
  };

  return (
    <div style={{ border: '2px solid #007bff', padding: '20px', margin: '20px 0', borderRadius: '10px' }}>
      <h3>{isEditMode ? 'Editar Caso' : 'Registrar Nuevo Hurto'}</h3>
      <form onSubmit={handleSubmit}>
        {/* Form fields are the same, just populated with data in edit mode */}
        <h4>Ubicación del Hecho</h4>
        <label>Fecha:</label>
        <input type="datetime-local" name="fecha" value={formData.fecha} onChange={handleChange} required />
        <label>Comuna:</label>
        <select name="comuna" value={formData.comuna} onChange={handleChange} required>
          <option value="">Seleccione una Comuna</option>
          {Object.keys(comunasData).map(comunaName => (
            <option key={comunaName} value={comunaName}>{comunaName}</option>
          ))}
        </select>
        <label>Barrio:</label>
        <select name="barrio" value={formData.barrio} onChange={handleChange} required disabled={!formData.comuna}>
          <option value="">Seleccione un Barrio</option>
          {formData.comuna && comunasData[formData.comuna] && comunasData[formData.comuna].map(barrioName => (
            <option key={barrioName} value={barrioName}>{barrioName}</option>
          ))}
        </select>
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
            <h5>Víctima {victimaIndex + 1}</h5>
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
            <h5>Vehículo Implicado {index + 1}</h5>
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
            <h5>Cámara {index + 1}</h5>
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
