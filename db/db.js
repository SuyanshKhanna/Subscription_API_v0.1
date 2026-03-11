const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'devlearn',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Production-grade pool settings
  max:              20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Verify connectivity on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('[DB] Connection error:', err.message);
    process.exit(1);
  }
  release();
  console.log('[DB] PostgreSQL connected successfully');
});

module.exports = pool;
