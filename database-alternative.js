const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

// Alternative connection using connection string (more reliable for Neon)
// You can get this from Neon dashboard -> Connection Details -> Connection String

// Option 1: Using individual parameters (current method)
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
  application_name: 'secretvault-api'
};

// Option 2: Using connection string (uncomment and use if individual params fail)
// const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`;
// const poolConfig = {
//   connectionString: connectionString,
//   ssl: {
//     rejectUnauthorized: false
//   }
// };

console.log('🔧 Using database configuration:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  passwordSet: !!process.env.DB_PASSWORD
});

const pool = new Pool(poolConfig);

// Enhanced error handling
pool.on('connect', (client) => {
  console.log('✅ New client connected to Neon database');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client:', err);
});

// Test connection on startup
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0]);
    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    if (err.code === '28P01') {
      console.log('💡 Authentication failed - please check your credentials in .env file');
    }
  }
};

// Create users table if it doesn't exist
const createUsersTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        picture TEXT,
        verified_email BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );
    `;
    
    await pool.query(query);
    console.log('✅ Users table created/verified');
  } catch (error) {
    console.error('❌ Error creating users table:', error.message);
  }
};

// Initialize with delay to allow connection to establish
setTimeout(() => {
  testConnection().then(() => {
    createUsersTable();
  });
}, 1000);

module.exports = pool;