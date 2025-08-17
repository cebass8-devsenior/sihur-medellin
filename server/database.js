const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const DBSOURCE = "db.sqlite";

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
      // Cannot open database
      console.error(err.message)
      throw err
    } else {
        console.log('Connected to the SQLite database.');

        // Add reset_token and reset_token_expires_at to users table if they don't exist
        db.run(`ALTER TABLE users ADD COLUMN reset_token TEXT`);
        db.run(`ALTER TABLE users ADD COLUMN reset_token_expires_at INTEGER`);

        // Add auditing columns to 'casos' table
        db.run(`ALTER TABLE casos ADD COLUMN created_by INTEGER`);
        db.run(`ALTER TABLE casos ADD COLUMN created_at TEXT`);
        db.run(`ALTER TABLE casos ADD COLUMN updated_by INTEGER`);
        db.run(`ALTER TABLE casos ADD COLUMN updated_at TEXT`);

        // Add auditing columns to 'victimas' table
        db.run(`ALTER TABLE victimas ADD COLUMN created_by INTEGER`);
        db.run(`ALTER TABLE victimas ADD COLUMN created_at TEXT`);
        db.run(`ALTER TABLE victimas ADD COLUMN updated_by INTEGER`);
        db.run(`ALTER TABLE victimas ADD COLUMN updated_at TEXT`);

        // Add auditing columns to 'vehiculos_hurtados' table
        db.run(`ALTER TABLE vehiculos_hurtados ADD COLUMN created_by INTEGER`);
        db.run(`ALTER TABLE vehiculos_hurtados ADD COLUMN created_at TEXT`);
        db.run(`ALTER TABLE vehiculos_hurtados ADD COLUMN updated_by INTEGER`);
        db.run(`ALTER TABLE vehiculos_hurtados ADD COLUMN updated_at TEXT`);

        // Add auditing columns to 'vehiculos_implicados' table
        db.run(`ALTER TABLE vehiculos_implicados ADD COLUMN created_by INTEGER`);
        db.run(`ALTER TABLE vehiculos_implicados ADD COLUMN created_at TEXT`);
        db.run(`ALTER TABLE vehiculos_implicados ADD COLUMN updated_by INTEGER`);
        db.run(`ALTER TABLE vehiculos_implicados ADD COLUMN updated_at TEXT`);

        // Add auditing columns to 'camaras_seguridad' table
        db.run(`ALTER TABLE camaras_seguridad ADD COLUMN created_by INTEGER`);
        db.run(`ALTER TABLE camaras_seguridad ADD COLUMN created_at TEXT`);
        db.run(`ALTER TABLE camaras_seguridad ADD COLUMN updated_by INTEGER`);
        db.run(`ALTER TABLE camaras_seguridad ADD COLUMN updated_at TEXT`);

        // Add auditing columns to 'personas_individualizadas' table
        db.run(`ALTER TABLE personas_individualizadas ADD COLUMN created_by INTEGER`);
        db.run(`ALTER TABLE personas_individualizadas ADD COLUMN created_at TEXT`);
        db.run(`ALTER TABLE personas_individualizadas ADD COLUMN updated_by INTEGER`);
        db.run(`ALTER TABLE personas_individualizadas ADD COLUMN updated_at TEXT`);

        db.run(`CREATE TABLE IF NOT EXISTS victimas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_caso INTEGER,
            nombres_apellidos TEXT,
            telefono_movil TEXT,
            nacionalidad TEXT,
            elementos_hurtados TEXT,
            vehiculo_hurtado INTEGER,
            FOREIGN KEY (id_caso) REFERENCES casos (id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS vehiculos_hurtados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_victima INTEGER,
            clase_vehiculo TEXT,
            placa TEXT,
            tipo_servicio TEXT,
            marca TEXT,
            FOREIGN KEY (id_victima) REFERENCES victimas (id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS vehiculos_implicados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_caso INTEGER,
            placa TEXT,
            clase_servicio TEXT,
            clase_vehiculo TEXT,
            organismo_transito TEXT,
            marca_color TEXT,
            capacidad_pasajeros INTEGER,
            carroceria TEXT,
            tipo_numero_identificacion TEXT,
            nombres_apellidos_propietario TEXT,
            direccion_propietario TEXT,
            telefono_propietario TEXT,
            celular_propietario TEXT,
            FOREIGN KEY (id_caso) REFERENCES casos (id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS camaras_seguridad (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_caso INTEGER,
            direccion_numero_camara TEXT,
            hora_video_inicio TEXT,
            hora_video_final TEXT,
            fotografia TEXT,
            observacion_general TEXT,
            observacion_detallada TEXT,
            FOREIGN KEY (id_caso) REFERENCES casos (id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS personas_individualizadas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombres_apellidos TEXT,
            cedula TEXT UNIQUE,
            telefono_movil TEXT,
            direccion TEXT,
            fotografia TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS casos_personas_individualizadas (
            id_caso INTEGER,
            id_persona_individualizada INTEGER,
            PRIMARY KEY (id_caso, id_persona_individualizada),
            FOREIGN KEY (id_caso) REFERENCES casos (id) ON DELETE CASCADE,
            FOREIGN KEY (id_persona_individualizada) REFERENCES personas_individualizadas (id) ON DELETE CASCADE
        )`);
    }
});

module.exports = db;
