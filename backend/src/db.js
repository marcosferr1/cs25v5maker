const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/cs2';
const pool = new Pool({ connectionString });

// Connectivity check and concise log (without leaking credentials)
(async () => {
  try {
    const url = new URL(connectionString);
    const host = url.hostname;
    const dbName = (url.pathname || '').replace('/', '') || 'unknown';
    const result = await pool.query('SELECT NOW() as now');
    // Example: DB connected ok → host=db, db=cs2, time=2025-10-29T...
    console.log(`DB connected ok → host=${host}, db=${dbName}, time=${result.rows[0].now}`);
  } catch (err) {
    console.error('DB connection failed:', err.message);
  }
})();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
