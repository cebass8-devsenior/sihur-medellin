const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const DBSOURCE = "db.sqlite";

const db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            console.log('Initializing database schema...');

            // Create users table with all columns
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT,
                reset_token TEXT,
                reset_token_expires_at INTEGER
            )`, (err) => {
                if (err) {
                    console.error("Error creating users table:", err.message);
                } else {
                    // Add a default user if the table is empty
                    db.get("SELECT * FROM users LIMIT 1", (err, user) => {
                        if (!user) {
                            const salt = bcrypt.genSaltSync(10);
                            const hash = bcrypt.hashSync('admin123', salt);
                            db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin'], (err) => {
                                if (!err) {
                                    console.log('Default admin user created (user: admin, pass: admin123).');
                                }
                            });
                        }
                    });
                }
            });

            // Create casos table with all columns
            db.run(`CREATE TABLE IF NOT EXISTS casos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo_caso TEXT,
                fecha TEXT,
                comuna TEXT,
                barrio TEXT,
                direccion TEXT,
                latitud REAL,
                longitud REAL,
                created_by INTEGER,
                created_at TEXT,
                updated_by INTEGER,
                updated_at TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS victimas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_caso INTEGER,
                nombres_apellidos TEXT,
                telefono_movil TEXT,
                nacionalidad TEXT,
                elementos_hurtados TEXT,
                vehiculo_hurtado INTEGER,
                created_by INTEGER,
                created_at TEXT,
                updated_by INTEGER,
                updated_at TEXT,
                FOREIGN KEY (id_caso) REFERENCES casos (id) ON DELETE CASCADE
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS vehiculos_hurtados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_victima INTEGER,
                clase_vehiculo TEXT,
                placa TEXT,
                tipo_servicio TEXT,
                marca TEXT,
                created_by INTEGER,
                created_at TEXT,
                updated_by INTEGER,
                updated_at TEXT,
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
                created_by INTEGER,
                created_at TEXT,
                updated_by INTEGER,
                updated_at TEXT,
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
                created_by INTEGER,
                created_at TEXT,
                updated_by INTEGER,
                updated_at TEXT,
                FOREIGN KEY (id_caso) REFERENCES casos (id) ON DELETE CASCADE
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS personas_individualizadas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombres_apellidos TEXT,
                cedula TEXT UNIQUE,
                telefono_movil TEXT,
                direccion TEXT,
                fotografia TEXT,
                created_by INTEGER,
                created_at TEXT,
                updated_by INTEGER,
                updated_at TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS casos_personas_individualizadas (
                id_caso INTEGER,
                id_persona_individualizada INTEGER,
                PRIMARY KEY (id_caso, id_persona_individualizada),
                FOREIGN KEY (id_caso) REFERENCES casos (id) ON DELETE CASCADE,
                FOREIGN KEY (id_persona_individualizada) REFERENCES personas_individualizadas (id) ON DELETE CASCADE
            )`);

            console.log('Database schema initialization complete.');
        });
    }
});

module.exports = db;