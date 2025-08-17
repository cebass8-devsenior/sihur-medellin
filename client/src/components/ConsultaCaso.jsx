import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ConsultaCaso({ token, caseId }) {
  const [caseDetails, setCaseDetails] = useState(null);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const fetchCaseDetails = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(`${API_URL}/api/casos/${caseId}`, { headers });
        setCaseDetails(response.data);
      } catch (err) {
        setError('Error al cargar los detalles del caso. Por favor, intente de nuevo más tarde.');
        console.error(err);
      }
    };

    if (token && caseId) {
      fetchCaseDetails();
    }
  }, [token, caseId]);

  const handlePrint = () => {
    window.print();
  };

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (!caseDetails) {
    return <p>Cargando detalles del caso...</p>;
  }

  return (
    <div className="consulta-caso">
      <h3>Detalles del Caso: {caseDetails.codigo_caso}</h3>
      <button onClick={handlePrint}>Imprimir Caso</button>

      <h4>Ubicación del Hecho</h4>
      <p><strong>Fecha:</strong> {new Date(caseDetails.fecha).toLocaleString()}</p>
      <p><strong>Comuna:</strong> {caseDetails.comuna}</p>
      <p><strong>Barrio:</strong> {caseDetails.barrio}</p>
      <p><strong>Dirección:</strong> {caseDetails.direccion}</p>
      <p><strong>Latitud:</strong> {caseDetails.latitud}</p>
      <p><strong>Longitud:</strong> {caseDetails.longitud}</p>

      {caseDetails.victimas && caseDetails.victimas.length > 0 && (
        <>
          <h4>Víctimas</h4>
          {caseDetails.victimas.map((victima, index) => (
            <div key={index} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px' }}>
              <h5>Víctima {index + 1}</h5>
              <p><strong>Nombres y Apellidos:</strong> {victima.nombres_apellidos}</p>
              <p><strong>Teléfono Móvil:</strong> {victima.telefono_movil}</p>
              <p><strong>Nacionalidad:</strong> {victima.nacionalidad}</p>
              <p><strong>Elementos Hurtados:</strong> {victima.elementos_hurtados}</p>
              <p><strong>Vehículo Hurtado:</strong> {victima.vehiculo_hurtado ? 'Sí' : 'No'}</p>

              {victima.vehiculo_hurtado && victima.vehiculos && victima.vehiculos.length > 0 && (
                <div>
                  <h6>Datos del Vehículo Hurtado</h6>
                  {victima.vehiculos.map((vehiculo, vhIndex) => (
                    <div key={vhIndex} style={{ border: '1px dashed #ddd', padding: '5px', marginBottom: '5px' }}>
                      <p><strong>Clase de Vehículo:</strong> {vehiculo.clase_vehiculo}</p>
                      <p><strong>Placa:</strong> {vehiculo.placa}</p>
                      <p><strong>Tipo de Servicio:</strong> {vehiculo.tipo_servicio}</p>
                      <p><strong>Marca:</strong> {vehiculo.marca}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {caseDetails.vehiculos_implicados && caseDetails.vehiculos_implicados.length > 0 && (
        <>
          <h4>Vehículo(s) Implicados en el Hurto</h4>
          {caseDetails.vehiculos_implicados.map((vehiculo, index) => (
            <div key={index} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px' }}>
              <h5>Vehículo Implicado {index + 1}</h5>
              <p><strong>Placa:</strong> {vehiculo.placa}</p>
              <p><strong>Clase de Servicio:</strong> {vehiculo.clase_servicio}</p>
              <p><strong>Clase de Vehículo:</strong> {vehiculo.clase_vehiculo}</p>
              <p><strong>Organismo de Tránsito:</strong> {vehiculo.organismo_transito}</p>
              <p><strong>Marca y Color:</strong> {vehiculo.marca_color}</p>
              <p><strong>Capacidad de Pasajeros:</strong> {vehiculo.capacidad_pasajeros}</p>
              <p><strong>Carrocería:</strong> {vehiculo.carroceria}</p>
              <h6>Datos del Propietario (RUNT)</h6>
              <p><strong>Tipo y Número de Identificación:</strong> {vehiculo.tipo_numero_identificacion}</p>
              <p><strong>Nombres y Apellidos Propietario:</strong> {vehiculo.nombres_apellidos_propietario}</p>
              <p><strong>Dirección Propietario:</strong> {vehiculo.direccion_propietario}</p>
              <p><strong>Teléfono Propietario:</strong> {vehiculo.telefono_propietario}</p>
              <p><strong>Celular Propietario:</strong> {vehiculo.celular_propietario}</p>
            </div>
          ))}
        </>
      )}

      {caseDetails.camaras_seguridad && caseDetails.camaras_seguridad.length > 0 && (
        <>
          <h4>Trazabilidad de Cámaras de Seguridad</h4>
          {caseDetails.camaras_seguridad.map((camara, index) => (
            <div key={index} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px' }}>
              <h5>Cámara {index + 1}</h5>
              <p><strong>Dirección y Número de Cámara:</strong> {camara.direccion_numero_camara}</p>
              <p><strong>Hora Video Inicio:</strong> {camara.hora_video_inicio}</p>
              <p><strong>Hora Video Final:</strong> {camara.hora_video_final}</p>
              {camara.fotografia && <img src={camara.fotografia} alt="Evidencia" style={{ maxWidth: '200px', maxHeight: '200px' }} />}
              <p><strong>Observación General:</strong> {camara.observacion_general}</p>
              <p><strong>Observación Detallada:</strong> {camara.observacion_detallada}</p>
            </div>
          ))}
        </>
      )}

      {caseDetails.personas_individualizadas && caseDetails.personas_individualizadas.length > 0 && (
        <>
          <h4>Personas Individualizadas Asociadas</h4>
          {caseDetails.personas_individualizadas.map((persona, index) => (
            <div key={index} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px' }}>
              <h5>Persona {index + 1}</h5>
              <p><strong>Nombres y Apellidos:</strong> {persona.nombres_apellidos}</p>
              <p><strong>Cédula:</strong> {persona.cedula}</p>
              <p><strong>Teléfono Móvil:</strong> {persona.telefono_movil}</p>
              <p><strong>Dirección:</strong> {persona.direccion}</p>
              {persona.fotografia && <img src={persona.fotografia} alt="Fotografía" style={{ maxWidth: '100px', maxHeight: '100px' }} />}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default ConsultaCaso;