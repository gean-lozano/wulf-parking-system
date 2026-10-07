/* Crea tablas, datos iniciales y el usuario administrador. Es idempotente (se puede correr varias veces). */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { pool } = require('./db');

(async () => {
  const dir = path.join(__dirname, '../../database');
  await pool.query(fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8'));
  await pool.query(fs.readFileSync(path.join(dir, 'seed.sql'), 'utf8'));
  const { rowCount } = await pool.query('SELECT 1 FROM usuario WHERE usu = $1', [config.adminUser]);
  if (!rowCount) {
    await pool.query('INSERT INTO usuario (usu, contra, rol) VALUES ($1,$2,$3)',
      [config.adminUser, await bcrypt.hash(config.adminPassword, 10), 'admin']);
    console.log(`Usuario admin creado: ${config.adminUser}`);
  }
  console.log('Base de datos lista.');
  await pool.end();
})().catch((e) => { console.error('Error inicializando la BD:', e.message); process.exit(1); });
