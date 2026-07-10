const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Configuración de la conexión a XAMPP (phpMyAdmin)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',      // Usuario por defecto en XAMPP
  password: '',      // Contraseña por defecto en XAMPP
  database: 'nombre_de_tu_base_de_datos', // Cambia por tu base de datos
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 1. GET /conductores
app.get('/conductores', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM conductores');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /automoviles
app.get('/automoviles', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM automoviles');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /conductoressinauto?edad=<numero>
app.get('/conductoressinauto', async (req, res) => {
  const { edad } = req.query;
  if (!edad) return res.status(400).json({ error: 'Falta el parámetro edad' });

  try {
    const query = `
      SELECT c.* FROM conductores c
      LEFT JOIN automoviles a ON c.nombre = a.nombre_conductor
      WHERE c.edad < ? AND a.nombre_conductor IS NULL
    `;
    const [rows] = await pool.query(query, [parseInt(edad)]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET /solitos
app.get('/solitos', async (req, res) => {
  try {
    const [condSinAuto] = await pool.query(`
      SELECT c.nombre, c.edad FROM conductores c
      LEFT JOIN automoviles a ON c.nombre = a.nombre_conductor
      WHERE a.nombre_conductor IS NULL
    `);

    const [autoSinCond] = await pool.query(`
      SELECT a.marca, a.patente, a.nombre_conductor FROM automoviles a
      LEFT JOIN conductores c ON a.nombre_conductor = c.nombre
      WHERE c.nombre IS NULL
    `);

    res.json({
      conductores_sin_auto: condSinAuto,
      automoviles_sin_conductor: autoSinCond
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5 y 6. GET /auto (patente o iniciopatente)
app.get('/auto', async (req, res) => {
  const { patente, iniciopatente } = req.query;

  try {
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

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;