const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const crypto = require('crypto'); // Import crypto for token generation
const { initializeDatabase } = require('./database.js');

const app = express();
const port = 3001;

// Middleware
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Secret keys - IMPORTANT: Use environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || 'YOUR_SECRET_KEY_HERE';

// This function will set up all routes and start the server
const startServer = (db) => {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  app.get('/test', (req, res) => {
    res.status(200).send('API test OK');
  });

  // Basic route
  app.get('/', (req, res) => {
    res.send('Hello from the SIHUR API!');
  });

  // Login route with reCAPTCHA
  app.post('/login', async (req, res) => {
    const { username, password, captchaToken, rememberMe } = req.body;

    // if (!captchaToken) {
    //   return res.status(400).json({ message: 'Por favor, complete el Captcha.' });
    // }

    try {
      // const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
      // const recaptchaRes = await axios.post(verifyUrl);

      // if (!recaptchaRes.data.success) {
      //   return res.status(400).json({ message: 'Falló la verificación del Captcha. Intente de nuevo.' });
      // }

      const sql = "SELECT * FROM users WHERE username = ?";
      db.get(sql, [username], (err, user) => {
        if (err) {
          return res.status(500).json({ message: 'Server error' });
        }

        if (!user || !bcrypt.compareSync(password, user.password)) {
          return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const expiresIn = rememberMe ? '7d' : '1h';

        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn } 
        );

        res.json({ token });
      });

    } catch (error) {
      console.error("reCAPTCHA verification error:", error);
      return res.status(500).json({ message: 'Error durante la verificación del Captcha.' });
    }
  });

  const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      req.user = user;
      next();
    });
  };

  app.get('/protected', verifyToken, (req, res) => {
    res.json({ message: `Welcome, ${req.user.username}! You are a ${req.user.role}. This is protected data.` });
  });

  app.post('/api/user/change-password', verifyToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    db.get("SELECT password FROM users WHERE id = ?", [userId], (err, row) => {
      if (err) {
        return res.status(500).json({ message: 'Error del servidor al buscar usuario.' });
      }
      if (!row) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      if (!bcrypt.compareSync(currentPassword, row.password)) {
        return res.status(401).json({ message: 'Contraseña actual incorrecta.' });
      }

      const newHashedPassword = bcrypt.hashSync(newPassword, 10);

      db.run("UPDATE users SET password = ? WHERE id = ?", [newHashedPassword, userId], function(err) {
        if (err) {
          return res.status(500).json({ message: 'Error del servidor al actualizar contraseña.' });
        }
        res.json({ message: 'Contraseña actualizada exitosamente.' });
      });
    });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiresAt = Date.now() + 3600000;

    db.get("SELECT id FROM users WHERE username = ?", [email], (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Server error.' });
      }
      if (!user) {
        return res.json({ message: 'Si el correo electrónico está registrado, se ha enviado un enlace de restablecimiento.' });
      }

      db.run("UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?",
        [resetToken, resetTokenExpiresAt, user.id], (err) => {
          if (err) {
            return res.status(500).json({ message: 'Error al guardar el token de restablecimiento.' });
          }
          console.log(`Password Reset Link for ${email}: http://localhost:5173/reset-password/${resetToken}`);
          res.json({ message: 'Si el correo electrónico está registrado, se ha enviado un enlace de restablecimiento.' });
        });
    });
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    db.get("SELECT id, reset_token_expires_at FROM users WHERE reset_token = ?", [token], (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Server error.' });
      }
      if (!user || user.reset_token_expires_at < Date.now()) {
        return res.status(400).json({ message: 'Token inválido o expirado.' });
      }

      const newHashedPassword = bcrypt.hashSync(newPassword, 10);

      db.run("UPDATE users SET password = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?",
        [newHashedPassword, user.id], (err) => {
          if (err) {
            return res.status(500).json({ message: 'Error al restablecer la contraseña.' });
          }
          res.json({ message: 'Contraseña restablecida exitosamente.' });
        });
    });
  });

  app.get('/api/casos/today', verifyToken, (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sql = "SELECT * FROM casos WHERE fecha >= ? AND fecha < ?";
    db.all(sql, [today.toISOString(), tomorrow.toISOString()], (err, rows) => {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      res.json(rows);
    });
  });

  app.post('/api/casos', verifyToken, (req, res) => {
    const { fecha, comuna, barrio, direccion, victimas, vehiculos_implicados, camaras_seguridad } = req.body;
    const codigo_caso = `CASO-${Date.now()}`;

    const sql = 'INSERT INTO casos (codigo_caso, fecha, comuna, barrio, direccion) VALUES (?,?,?,?,?)';
    db.run(sql, [codigo_caso, fecha, comuna, barrio, direccion], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      const id_caso = this.lastID;
      if (victimas && victimas.length > 0) {
        const sql_victimas = 'INSERT INTO victimas (id_caso, nombres_apellidos, telefono_movil, nacionalidad, elementos_hurtados, vehiculo_hurtado) VALUES (?,?,?,?,?,?)';
        victimas.forEach(v => {
          db.run(sql_victimas, [id_caso, v.nombres_apellidos, v.telefono_movil, v.nacionalidad, v.elementos_hurtados, v.vehiculo_hurtado], function(err) {
            if (err) {
              console.error("Error inserting victim:", err);
              return;
            }
            const id_victima = this.lastID;
            if (v.vehiculo_hurtado && v.vehiculos && v.vehiculos.length > 0) {
              const sql_vehiculos = 'INSERT INTO vehiculos_hurtados (id_victima, clase_vehiculo, placa, tipo_servicio, marca) VALUES (?,?,?,?,?)';
              v.vehiculos.forEach(vh => {
                db.run(sql_vehiculos, [id_victima, vh.clase_vehiculo, vh.placa, vh.tipo_servicio, vh.marca]);
              });
            }
          });
        });
      }

      if (vehiculos_implicados && vehiculos_implicados.length > 0) {
        const sql_implicados = 'INSERT INTO vehiculos_implicados (id_caso, placa, clase_servicio, clase_vehiculo, organismo_transito, marca_color, capacidad_pasajeros, carroceria, tipo_numero_identificacion, nombres_apellidos_propietario, direccion_propietario, telefono_propietario, celular_propietario) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)';
        vehiculos_implicados.forEach(vi => {
          db.run(sql_implicados, [
            id_caso, vi.placa, vi.clase_servicio, vi.clase_vehiculo, vi.organismo_transito,
            vi.marca_color, vi.capacidad_pasajeros, vi.carroceria, vi.tipo_numero_identificacion,
            vi.nombres_apellidos_propietario, vi.direccion_propietario, vi.telefono_propietario, vi.celular_propietario
          ]);
        });
      }

      if (camaras_seguridad && camaras_seguridad.length > 0) {
        const sql_camaras = 'INSERT INTO camaras_seguridad (id_caso, direccion_numero_camara, hora_video_inicio, hora_video_final, fotografia, observacion_general, observacion_detallada) VALUES (?,?,?,?,?,?,?)';
        camaras_seguridad.forEach(cs => {
          db.run(sql_camaras, [
            id_caso, cs.direccion_numero_camara, cs.hora_video_inicio, cs.hora_video_final,
            cs.fotografia, cs.observacion_general, cs.observacion_detallada
          ]);
        });
      }

      res.status(201).json({ id: id_caso, codigo_caso, fecha, comuna, barrio, direccion });
    });
  });

  app.post('/api/personas_individualizadas', verifyToken, (req, res) => {
    const { nombres_apellidos, cedula, telefono_movil, direccion, fotografia } = req.body;

    const sql = 'INSERT INTO personas_individualizadas (nombres_apellidos, cedula, telefono_movil, direccion, fotografia) VALUES (?,?,?,?,?)';
    db.run(sql, [nombres_apellidos, cedula, telefono_movil, direccion, fotografia], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Error al registrar persona individualizada', error: err.message });
      }
      res.status(201).json({ id: this.lastID, nombres_apellidos, cedula, telefono_movil, direccion, fotografia });
    });
  });

  app.get('/api/personas_individualizadas/search', verifyToken, (req, res) => {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    const sql = `SELECT * FROM personas_individualizadas WHERE nombres_apellidos LIKE ? OR cedula LIKE ? OR telefono_movil LIKE ?`;
    const searchTerm = `%${query}%`;
    db.all(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
      if (err) {
        return res.status(500).json({ message: 'Error al buscar personas individualizadas', error: err.message });
      }
      res.json(rows);
    });
  });

  app.post('/api/casos/:id/personas_individualizadas', verifyToken, (req, res) => {
    const id_caso = req.params.id;
    const { id_persona_individualizada } = req.body;

    const sql = 'INSERT INTO casos_personas_individualizadas (id_caso, id_persona_individualizada) VALUES (?,?)';
    db.run(sql, [id_caso, id_persona_individualizada], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Error al asociar persona individualizada con caso', error: err.message });
      }
      res.status(201).json({ message: 'Persona individualizada asociada exitosamente', id_caso, id_persona_individualizada });
    });
  });

  app.get('/api/casos/search', verifyToken, async (req, res) => {
    process.stderr.write(`[${new Date().toISOString()}] Received request for /api/casos/search with query: ${JSON.stringify(req.query)}
`);
    const { placa_hurtado, placa_implicado, nombre_victima, cedula_persona, nombre_persona } = req.query;

    let criterioSelect = ''; // This will hold the column for the search criterion

    const params = [];
    const joins = [];
    const conditions = [];

    if (placa_hurtado) {
      if (!criterioSelect) criterioSelect = ', vh.placa AS criterio_busqueda';
      joins.push(`JOIN victimas v ON c.id = v.id_caso`);
      joins.push(`JOIN vehiculos_hurtados vh ON v.id = vh.id_victima`);
      conditions.push(`vh.placa LIKE ?`);
      params.push(`%${placa_hurtado}%`);
    }
    if (placa_implicado) {
      if (!criterioSelect) criterioSelect = ', vi.placa AS criterio_busqueda';
      joins.push(`JOIN vehiculos_implicados vi ON c.id = vi.id_caso`);
      conditions.push(`vi.placa LIKE ?`);
      params.push(`%${placa_implicado}%`);
    }
    if (nombre_victima) {
      if (!criterioSelect) criterioSelect = ', v2.nombres_apellidos AS criterio_busqueda';
      joins.push(`JOIN victimas v2 ON c.id = v2.id_caso`);
      conditions.push(`v2.nombres_apellidos LIKE ?`);
      params.push(`%${nombre_victima}%`);
    }
    if (cedula_persona || nombre_persona) {
      joins.push(`JOIN casos_personas_individualizadas cpi ON c.id = cpi.id_caso`);
      joins.push(`JOIN personas_individualizadas pi ON cpi.id_persona_individualizada = pi.id`);
      if (cedula_persona) {
        if (!criterioSelect) criterioSelect = ', pi.cedula AS criterio_busqueda';
        conditions.push(`pi.cedula LIKE ?`);
        params.push(`%${cedula_persona}%`);
      }
      if (nombre_persona) {
        if (!criterioSelect) criterioSelect = ', pi.nombres_apellidos AS criterio_busqueda';
        conditions.push(`pi.nombres_apellidos LIKE ?`);
        params.push(`%${nombre_persona}%`);
      }
    }

    let sql = `SELECT DISTINCT c.*${criterioSelect} FROM casos c`;

    if (joins.length > 0) {
      sql += ` ${[...new Set(joins)].join(' ')}`;
    }
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      res.json(rows);
    });
  });

  app.get('/api/casos/:id', verifyToken, async (req, res) => {
    const id_caso = req.params.id;

    try {
      const caseDetails = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM casos WHERE id = ?", [id_caso], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!caseDetails) {
        return res.status(404).json({ message: 'Caso no encontrado' });
      }

      const victims = await new Promise((resolve, reject) => {
        db.all("SELECT * FROM victimas WHERE id_caso = ?", [id_caso], async (err, rows) => {
          if (err) reject(err);
          const victimsWithVehicles = await Promise.all(rows.map(async (victim) => {
            if (victim.vehiculo_hurtado) {
              const vehicles = await new Promise((resolve, reject) => {
                db.all("SELECT * FROM vehiculos_hurtados WHERE id_victima = ?", [victim.id], (err, vhRows) => {
                  if (err) reject(err);
                  resolve(vhRows);
                });
              });
              return { ...victim, vehiculos: vehicles };
            }
            return victim;
          }));
          resolve(victimsWithVehicles);
        });
      });

      const involvedVehicles = await new Promise((resolve, reject) => {
        db.all("SELECT * FROM vehiculos_implicados WHERE id_caso = ?", [id_caso], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });

      const securityCameras = await new Promise((resolve, reject) => {
        db.all("SELECT * FROM camaras_seguridad WHERE id_caso = ?", [id_caso], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });

      const associatedIndividuals = await new Promise((resolve, reject) => {
        db.all(`SELECT pi.* FROM personas_individualizadas pi
                JOIN casos_personas_individualizadas cpi ON pi.id = cpi.id_persona_individualizada
                WHERE cpi.id_caso = ?`, [id_caso], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });

      res.json({
        ...caseDetails,
        victimas: victims,
        vehiculos_implicados: involvedVehicles,
        camaras_seguridad: securityCameras,
        personas_individualizadas: associatedIndividuals,
      });

    } catch (err) {
      res.status(500).json({ message: 'Error al obtener los detalles del caso', error: err.message });
    }
  });

  app.put('/api/casos/:id', verifyToken, (req, res) => {
    const id_caso = req.params.id;
    const { fecha, comuna, barrio, direccion, victimas, vehiculos_implicados, camaras_seguridad } = req.body;

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      const sql_update_caso = `UPDATE casos SET fecha = ?, comuna = ?, barrio = ?, direccion = ? WHERE id = ?`;
      db.run(sql_update_caso, [fecha, comuna, barrio, direccion, id_caso], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ message: 'Error al actualizar el caso', error: err.message });
        }
      });

      db.run("DELETE FROM victimas WHERE id_caso = ?", [id_caso]);
      db.run("DELETE FROM vehiculos_implicados WHERE id_caso = ?", [id_caso]);
      db.run("DELETE FROM camaras_seguridad WHERE id_caso = ?", [id_caso]);

      if (victimas && victimas.length > 0) {
        const sql_victimas = 'INSERT INTO victimas (id_caso, nombres_apellidos, telefono_movil, nacionalidad, elementos_hurtados, vehiculo_hurtado) VALUES (?,?,?,?,?,?)';
        victimas.forEach(v => {
          db.run(sql_victimas, [id_caso, v.nombres_apellidos, v.telefono_movil, v.nacionalidad, v.elementos_hurtados, v.vehiculo_hurtado], function(err) {
            if (err) return;
            const id_victima = this.lastID;
            if (v.vehiculo_hurtado && v.vehiculos && v.vehiculos.length > 0) {
              const sql_vehiculos = 'INSERT INTO vehiculos_hurtados (id_victima, clase_vehiculo, placa, tipo_servicio, marca) VALUES (?,?,?,?,?)';
              v.vehiculos.forEach(vh => {
                db.run(sql_vehiculos, [id_victima, vh.clase_vehiculo, vh.placa, vh.tipo_servicio, vh.marca]);
              });
            }
          });
        });
      }

      if (vehiculos_implicados && vehiculos_implicados.length > 0) {
        const sql_implicados = 'INSERT INTO vehiculos_implicados (id_caso, placa, clase_servicio, clase_vehiculo, organismo_transito, marca_color, capacidad_pasajeros, carroceria, tipo_numero_identificacion, nombres_apellidos_propietario, direccion_propietario, telefono_propietario, celular_propietario) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)';
        vehiculos_implicados.forEach(vi => {
          db.run(sql_implicados, [
            id_caso, vi.placa, vi.clase_servicio, vi.clase_vehiculo, vi.organismo_transito,
            vi.marca_color, vi.capacidad_pasajeros, vi.carroceria, vi.tipo_numero_identificacion,
            vi.nombres_apellidos_propietario, vi.direccion_propietario, vi.telefono_propietario, vi.celular_propietario
          ]);
        });
      }

      if (camaras_seguridad && camaras_seguridad.length > 0) {
        const sql_camaras = 'INSERT INTO camaras_seguridad (id_caso, direccion_numero_camara, hora_video_inicio, hora_video_final, fotografia, observacion_general, observacion_detallada) VALUES (?,?,?,?,?,?,?)';
        camaras_seguridad.forEach(cs => {
          db.run(sql_camaras, [
            id_caso, cs.direccion_numero_camara, cs.hora_video_inicio, cs.hora_video_final,
            cs.fotografia, cs.observacion_general, cs.observacion_detallada
          ]);
        });
      }

      db.run('COMMIT', (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error al commitear la transacción', error: err.message });
        }
        res.json({ message: 'Caso actualizado exitosamente' });
      });
    });
  });

  app.delete('/api/casos/:id', verifyToken, (req, res) => {
    const id_caso = req.params.id;

    db.run("DELETE FROM casos WHERE id = ?", [id_caso], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Error al eliminar el caso', error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Caso no encontrado' });
      }
      res.json({ message: 'Caso eliminado exitosamente' });
    });
  });

  app.get('/api/statistics', verifyToken, (req, res) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const sqlDay = "SELECT COUNT(*) as count FROM casos WHERE fecha >= ?";
    const sqlMonth = "SELECT COUNT(*) as count FROM casos WHERE fecha >= ?";
    const sqlYear = "SELECT COUNT(*) as count FROM casos WHERE fecha >= ?";

    const getDayCount = new Promise((resolve, reject) => {
      db.get(sqlDay, [startOfDay.toISOString()], (err, row) => {
        if (err) reject(err);
        resolve(row ? row.count : 0);
      });
    });

    const getMonthCount = new Promise((resolve, reject) => {
      db.get(sqlMonth, [startOfMonth.toISOString()], (err, row) => {
        if (err) reject(err);
        resolve(row ? row.count : 0);
      });
    });

    const getYearCount = new Promise((resolve, reject) => {
      db.get(sqlYear, [startOfYear.toISOString()], (err, row) => {
        if (err) reject(err);
        resolve(row ? row.count : 0);
      });
    });

    Promise.all([getDayCount, getMonthCount, getYearCount]).then(results => {
      res.json({
        hurtos_dia: results[0],
        hurtos_mes_acumulado: results[1],
        hurtos_ano_acumulado: results[2]
      });
    }).catch(err => {
      res.status(500).json({ message: 'Server error' });
    });
  });

  app.get('/api/statistics/top', verifyToken, (req, res) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const createQuery = (sql, params) => {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });
    };

    const topComunasDaySql = "SELECT comuna, COUNT(*) as count FROM casos WHERE fecha >= ? GROUP BY comuna ORDER BY count DESC LIMIT 3";
    const topComunasMonthSql = "SELECT comuna, COUNT(*) as count FROM casos WHERE fecha >= ? GROUP BY comuna ORDER BY count DESC LIMIT 3";
    const topComunasYearSql = "SELECT comuna, COUNT(*) as count FROM casos WHERE fecha >= ? GROUP BY comuna ORDER BY count DESC LIMIT 3";

    const topBarriosDaySql = "SELECT barrio, COUNT(*) as count FROM casos WHERE fecha >= ? GROUP BY barrio ORDER BY count DESC LIMIT 3";
    const topBarriosMonthSql = "SELECT barrio, COUNT(*) as count FROM casos WHERE fecha >= ? GROUP BY barrio ORDER BY count DESC LIMIT 3";
    const topBarriosYearSql = "SELECT barrio, COUNT(*) as count FROM casos WHERE fecha >= ? GROUP BY barrio ORDER BY count DESC LIMIT 3";

    Promise.all([
      createQuery(topComunasDaySql, [startOfDay.toISOString()]),
      createQuery(topComunasMonthSql, [startOfMonth.toISOString()]),
      createQuery(topComunasYearSql, [startOfYear.toISOString()]),
      createQuery(topBarriosDaySql, [startOfDay.toISOString()]),
      createQuery(topBarriosMonthSql, [startOfMonth.toISOString()]),
      createQuery(topBarriosYearSql, [startOfYear.toISOString()]),
    ]).then(results => {
      res.json({
        top_comunas_dia: results[0],
        top_comunas_mes: results[1],
        top_comunas_ano: results[2],
        top_barrios_dia: results[3],
        top_barrios_mes: results[4],
        top_barrios_ano: results[5],
      });
    }).catch(err => {
      res.status(500).json({ message: 'Server error' });
    });
  });

  app.get('/api/statistics/top/vehiculos', verifyToken, (req, res) => {
    const sql = "SELECT marca, COUNT(*) as count FROM vehiculos_hurtados GROUP BY marca ORDER BY count DESC LIMIT 3";
    db.all(sql, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      res.json(rows);
    });
  });

  // All specific routes should be defined above this line.

  // Catch-all route for any other request (404)
  // This MUST be the last route defined.
  app.get('*', (req, res) => {
    console.log(`[${new Date().toISOString()}] Catch-all route hit: ${req.method} ${req.path}`);
    res.status(404).send('Not Found');
  });

  // Start the server
  const PORT = process.env.PORT || port;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}`);
  });
};

// Initialize DB and then start the server
console.log('Initializing server...');
try {
  initializeDatabase()
    .then(db => {
      console.log("Database initialized successfully.");
      startServer(db);
      console.log('Server started.');
    })
    .catch(err => {
      console.error("Failed to initialize database:", err);
      process.exit(1); // Exit if DB initialization fails
    });
} catch (e) {
  console.error('Unhandled exception during server startup:', e);
  process.exit(1);
}
