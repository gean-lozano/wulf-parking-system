const { Pool, types } = require('pg');
const config = require('./config');

// NUMERIC llega como string por defecto; lo convertimos a número (los montos son chicos).
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

const pool = new Pool({ connectionString: config.databaseUrl });

/** Ejecuta fn dentro de una transacción. */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, withTransaction, query: (text, params) => pool.query(text, params) };
