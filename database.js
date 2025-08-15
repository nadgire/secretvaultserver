const { Pool } = require('pg');
require('dotenv').config();

// Debug: Log connection method
console.log('🔧 Database Configuration:');
if (process.env.DB_CONNECTION_STRING) {
  console.log('  Using connection string: [SET]');
  console.log('  Host extracted:', process.env.DB_CONNECTION_STRING.match(/@([^:\/]+)/)?.[1] || 'N/A');
} else {
  console.log('  Using individual parameters');
  console.log('  Host:', process.env.DB_HOST);
  console.log('  Port:', process.env.DB_PORT);
  console.log('  Database:', process.env.DB_NAME);
  console.log('  User:', process.env.DB_USER);
  console.log('  Password:', process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]');
}

// Create PostgreSQL connection pool using connection string (more reliable for Neon)
const pool = new Pool({
  connectionString: process.env.DB_CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false // Neon requires SSL
  },
  // Connection timeout settings
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10, // Maximum number of clients in the pool
  // Additional Neon-specific options
  application_name: 'secretvault-api'
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to Neon database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

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
    console.error('❌ Error creating users table:', error);
  }
};

// Initialize database
createUsersTable();

module.exports = pool;