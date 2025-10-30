const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/cs2';

// Enable SSL automatically for hosted providers like Neon or when sslmode is requested
let poolConfig = { connectionString };
try {
  const url = new URL(connectionString);
  const host = url.hostname || '';
  const hasSslMode = /[?&]sslmode=require/i.test(connectionString);
  if (host.endsWith('neon.tech') || hasSslMode) {
    // Neon requires TLS; rejectUnauthorized:false avoids root CA issues locally
    poolConfig.ssl = { rejectUnauthorized: false };
  }
} catch (_) {
  // If parsing fails, leave default config
}

const pool = new Pool(poolConfig);

// Prevent the app from crashing on idle client errors
pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err.message);
});

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
