const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Conexión directa a tu archivo de base de datos existente
// (Cambia 'automotriz.db' por el nombre exacto de tu archivo si es diferente)
const dbPath = path.resolve(__dirname, 'automotriz.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos local:', err.message);
  } else {
    console.log('Conectado exitosamente a la base de datos SQLite existente.');
  }
});

// --- ENDPOINTS DE LA API ---

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

// 4. GET /solitos: retorna conductores sin auto y autos sin conductor.
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