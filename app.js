const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Se conecta de manera local al archivo 'automotriz.db' en la misma carpeta
const dbPath = path.resolve(__dirname, 'automotriz.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err.message);
  } else {
    console.log('Conectado exitosamente a la base de datos SQLite.');
  }
});

// Inicialización automática de tu base de datos basada en actividad2.sql
db.serialize(() => {
  // Crear tabla conductores si no existe
  db.run(`CREATE TABLE IF NOT EXISTS conductores (nombre TEXT, edad INTEGER)`, (err) => {
    if (!err) {
      db.get(`SELECT COUNT(*) as count FROM conductores`, [], (err, row) => {
        if (row && row.count === 0) {
          const stmt = db.prepare(`INSERT INTO conductores (nombre, edad) VALUES (?, ?)`);
          const conductores = [
            ['Don Pepe', 55], ['Pedro', 25], ['Maria', 33], ['Francisco', 19],
            ['Camilo', 29], ['Andres', 35], ['Mario', 48], ['Felipe', 33]
          ];
          conductores.forEach(c => stmt.run(c));
          stmt.finalize();
          console.log('Tabla conductores inicializada con datos de prueba.');
        }
      });
    }
  });

  // Crear tabla automoviles si no existe
  db.run(`CREATE TABLE IF NOT EXISTS automoviles (marca TEXT, patente TEXT, nombre_conductor TEXT)`, (err) => {
    if (!err) {
      db.get(`SELECT COUNT(*) as count FROM automoviles`, [], (err, row) => {
        if (row && row.count === 0) {
          const stmt = db.prepare(`INSERT INTO automoviles (marca, patente, nombre_conductor) VALUES (?, ?, ?)`);
          const autos = [
            ['Ford', 'HXJH55', 'Felipe'], ['Toyota', 'HLSA26', 'Pedro'], ['Mercedes', 'JFTS47', 'Maria'],
            ['Chevrolet', 'RTPP97', 'Francisco'], ['Nissan', 'SDTR51', 'Don Pepe'], ['Mazda', 'RDCS19', 'Francisco'],
            ['Kia', 'KDTZ28', 'Don Pepe'], ['Jeep', 'FFDF88', 'Paulina'], ['Suzuki', 'DRTS41', 'Heriberto'],
            ['Honda', 'BXVZ67', 'Manuel']
          ];
          autos.forEach(a => stmt.run(a));
          stmt.finalize();
          console.log('Tabla automoviles inicializada con datos de prueba.');
        }
      });
    }
  });
});

// --- ENDPOINTS SOLICITADOS ---

// 1. GET /conductores: retorna la lista de todos los conductores.
app.get('/conductores', (req, res) => {
  db.all('SELECT * FROM conductores', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. GET /automoviles: retorna la lista de todos los automóviles.
app.get('/automoviles', (req, res) => {
  db.all('SELECT * FROM automoviles', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 3. GET /conductoressinauto?edad=<numero>
app.get('/conductoressinauto', (req, res) => {
  const { edad } = req.query;
  if (!edad) return res.status(400).json({ error: 'Falta el parámetro edad' });

  const query = `
    SELECT c.* FROM conductores c
    LEFT JOIN automoviles a ON c.nombre = a.nombre_conductor
    WHERE c.edad < ? AND a.nombre_conductor IS NULL
  `;
  db.all(query, [parseInt(edad)], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 4. GET /solitos: retorna conductores sin automóvil y automóviles sin conductor.
app.get('/solitos', (req, res) => {
  const qConductores = `
    SELECT c.nombre, c.edad FROM conductores c
    LEFT JOIN automoviles a ON c.nombre = a.nombre_conductor
    WHERE a.nombre_conductor IS NULL
  `;
  const qAutos = `
    SELECT a.marca, a.patente, a.nombre_conductor FROM automoviles a
    LEFT JOIN conductores c ON a.nombre_conductor = c.nombre
    WHERE c.nombre IS NULL
  `;

  db.all(qConductores, [], (err, condSinAuto) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(qAutos, [], (err, autoSinCond) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        conductores_sin_auto: condSinAuto,
        automoviles_sin_conductor: autoSinCond
      });
    });
  });
});

// 5 y 6. GET /auto (Maneja tanto ?patente como ?iniciopatente)
app.get('/auto', (req, res) => {
  const { patente, iniciopatente } = req.query;

  let query = `
    SELECT a.marca, a.patente, a.nombre_conductor, c.edad as conductor_edad
    FROM automoviles a
    LEFT JOIN conductores c ON a.nombre_conductor = c.nombre
  `;
  let params = [];

  if (patente) {
    query += ` WHERE a.patente = ?`;
    params.push(patente);
  } else if (iniciopatente) {
    query += ` WHERE a.patente LIKE ?`;
    params.push(`${iniciopatente}%`);
  } else {
    return res.status(400).json({ error: 'Debe proveer patente o iniciopatente' });
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = app;