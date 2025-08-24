const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const DBSOURCE = "db.sqlite";

const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DBSOURCE, (err) => {
            if (err) {
                console.error(err.message);
                return reject(err);
            }
            console.log('Connected to the SQLite database.');

            db.serialize(() => {
                console.log('Initializing database schema...');

                db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE,
                    password TEXT,
                    role TEXT,
                    reset_token TEXT,
                    reset_token_expires_at INTEGER
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS casos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    codigo_caso TEXT,
                    fecha TEXT,
                    comuna TEXT,
                    barrio TEXT,
                    direccion TEXT,
                    latitud REAL,
                    longitud REAL,
                    notas_investigador TEXT,
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

                db.run(`CREATE TABLE IF NOT EXISTS comunas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT UNIQUE NOT NULL
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS barrios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    id_comuna INTEGER NOT NULL,
                    FOREIGN KEY (id_comuna) REFERENCES comunas (id) ON DELETE CASCADE
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS casos_personas_individualizadas (
                    id_caso INTEGER,
                    id_persona_individualizada INTEGER,
                    PRIMARY KEY (id_caso, id_persona_individualizada),
                    FOREIGN KEY (id_caso) REFERENCES casos (id) ON DELETE CASCADE,
                    FOREIGN KEY (id_persona_individualizada) REFERENCES personas_individualizadas (id) ON DELETE CASCADE
                )`, (err) => {
                    if (err) {
                        console.error("Error creating tables:", err.message);
                        return reject(err);
                    }
                    console.log('All tables created or already exist.');

                    seedComunasAndBarrios(db);

                    db.get("SELECT * FROM users LIMIT 1", (err, user) => {
                        if (err) {
                            console.error("Error checking for default user:", err.message);
                            return reject(err);
                        }
                        if (!user) {
                            const salt = bcrypt.genSaltSync(10);
                            const hash = bcrypt.hashSync('admin123', salt);
                            db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin'], (err) => {
                                if (err) {
                                    console.error("Error creating default admin user:", err.message);
                                    return reject(err);
                                }
                                console.log('Default admin user created (user: admin, pass: admin123).');
                                console.log('Database schema initialization complete.');
                                resolve(db);
                            });
                        } else {
                            console.log('Database schema initialization complete.');
                            resolve(db);
                        }
                    });
                });
            });
        });
    });
};

const seedComunasAndBarrios = (db) => {
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

    db.get('SELECT COUNT(*) as count FROM comunas', (err, row) => {
        if (err) {
            console.error("Error checking comunas count:", err.message);
            return;
        }
        if (row.count === 0) {
            console.log('Seeding comunas and barrios...');
            const insertComuna = db.prepare('INSERT INTO comunas (nombre) VALUES (?)');
            const insertBarrio = db.prepare('INSERT INTO barrios (nombre, id_comuna) VALUES (?, ?)');

            db.serialize(() => {
                Object.entries(comunasData).forEach(([comunaName, barrios]) => {
                    insertComuna.run(comunaName, function(err) {
                        if (err) {
                            console.error(`Error inserting comuna ${comunaName}:`, err.message);
                        } else {
                            const comunaId = this.lastID;
                            barrios.forEach(barrioName => {
                                insertBarrio.run(barrioName, comunaId, (err) => {
                                    if (err) console.error(`Error inserting barrio ${barrioName}:`, err.message);
                                });
                            });
                        }
                    });
                });

                insertComuna.finalize();
                insertBarrio.finalize((err) => {
                    if (err) {
                        console.error("Error finalizing barrio insert:", err.message);
                    } else {
                        console.log("Finished seeding comunas and barrios.");
                    }
                });
            });
        }
    });
};

module.exports = { initializeDatabase };
