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

                db.run(`CREATE TABLE IF NOT EXISTS users (...)`);
                db.run(`CREATE TABLE IF NOT EXISTS casos (...)`);
                db.run(`CREATE TABLE IF NOT EXISTS victimas (...)`);
                db.run(`CREATE TABLE IF NOT EXISTS vehiculos_hurtados (...)`);
                db.run(`CREATE TABLE IF NOT EXISTS vehiculos_implicados (...)`);
                db.run(`CREATE TABLE IF NOT EXISTS camaras_seguridad (...)`);
                db.run(`CREATE TABLE IF NOT EXISTS personas_individualizadas (...)`);
                db.run(`CREATE TABLE IF NOT EXISTS comunas (...)`);
                db.run(`CREATE TABLE IF NOT EXISTS barrios (...)`);
                db.run(`CREATE TABLE IF NOT EXISTS nacionalidades (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE NOT NULL)`);
                db.run(`CREATE TABLE IF NOT EXISTS casos_personas_individualizadas (...)`, (err) => {
                    if (err) {
                        console.error("Error creating tables:", err.message);
                        return reject(err);
                    }
                    console.log('All tables created or already exist.');

                    seedComunasAndBarrios(db);
                    seedNacionalidades(db);

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
                                console.log('Default admin user created.');
                                resolve(db);
                            });
                        } else {
                            resolve(db);
                        }
                    });
                });
            });
        });
    });
};

const seedNacionalidades = (db) => {
    const defaultNacionalidades = ["Colombiana", "Venezolana", "Ecuatoriana", "Peruana", "Estadounidense"];
    db.get('SELECT COUNT(*) as count FROM nacionalidades', (err, row) => {
        if (err) {
            console.error("Error checking nacionalidades count:", err.message);
            return;
        }
        if (row.count === 0) {
            console.log('Seeding nacionalidades...');
            const insert = db.prepare('INSERT INTO nacionalidades (nombre) VALUES (?)');
            defaultNacionalidades.forEach(n => insert.run(n));
            insert.finalize(err => {
                if (err) console.error("Error finalizing nacionalidades insert:", err.message);
                else console.log("Finished seeding nacionalidades.");
            });
        }
    });
};

const seedComunasAndBarrios = (db) => {
  const comunasConBarrios = [
    { id: 1, nombre: "Comuna 1 - Popular", barrios: ["Popular", "Santo Domingo Savio", "Granizal", "Moscú N°1", "La Salle", "San Pablo"] },
    { id: 2, nombre: "Comuna 2 - Santa Cruz", barrios: ["Santa Cruz", "La Isla", "Villa del Socorro", "La Frontera", "La Salle", "El Playón de los Comuneros"] },
    // ... Agrega aquí el resto de tus comunas y barrios
  ];

  db.get('SELECT COUNT(*) as count FROM comunas', (err, row) => {
    if (err) {
      console.error("Error checking comunas count:", err.message);
      return;
    }
    if (row.count === 0) {
      console.log('Seeding comunas and barrios...');
      
      const insertComuna = db.prepare('INSERT INTO comunas (id, nombre) VALUES (?, ?)');
      const insertBarrio = db.prepare('INSERT INTO barrios (nombre, id_comuna) VALUES (?, ?)');

      db.serialize(() => {
        comunasConBarrios.forEach(comuna => {
          insertComuna.run(comuna.id, comuna.nombre, (err) => {
            if (err) {
              console.error(`Error inserting comuna ${comuna.nombre}:`, err.message);
            } else {
              comuna.barrios.forEach(barrio => {
                insertBarrio.run(barrio, comuna.id, (err) => {
                  if (err) console.error(`Error inserting barrio ${barrio}:`, err.message);
                });
              });
            }
          });
        });

        insertComuna.finalize(err => {
          if (err) console.error("Error finalizing comuna insert:", err.message);
        });
        insertBarrio.finalize(err => {
          if (err) console.error("Error finalizing barrio insert:", err.message);
          else console.log("Finished seeding comunas and barrios.");
        });
      });
    }
  });
};

module.exports = { initializeDatabase };

