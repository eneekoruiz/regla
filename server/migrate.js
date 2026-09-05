require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const { databaseOptions, schema } = require('./app');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio para migrar.');
  const pool = new Pool(databaseOptions(process.env.DATABASE_URL));
  try {
    await pool.query(schema);
    console.log('Aura database schema is ready.');
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
});
