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

// Create passwords table if it doesn't exist
const createPasswordsTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS passwords (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        username VARCHAR(255),
        password TEXT,
        passcode VARCHAR(255),
        website VARCHAR(500),
        notes TEXT,
        category VARCHAR(100) DEFAULT 'Applications',
        mobile_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted BOOLEAN DEFAULT false
      );
    `;
    
    await pool.query(query);
    console.log('✅ Passwords table created/verified');

    // Add passcode column if it doesn't exist (migration for existing databases)
    try {
      await pool.query('ALTER TABLE passwords ADD COLUMN IF NOT EXISTS passcode VARCHAR(255);');
      console.log('✅ Added passcode column to existing table');
    } catch (error) {
      console.log('ℹ️ Passcode column already exists or table is new');
    }

    // Add category column if it doesn't exist (migration for existing databases)
    try {
      await pool.query('ALTER TABLE passwords ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT \'Applications\';');
      console.log('✅ Added category column to existing table');
    } catch (error) {
      console.log('ℹ️ Category column already exists or table is new');
    }
  } catch (error) {
    console.error('❌ Error creating passwords table:', error);
  }
};

// Add deleted_at column to users table (migration for soft delete)
const addDeletedAtColumn = async () => {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;');
    console.log('✅ Added deleted_at column to users table');
  } catch (error) {
    console.log('ℹ️ Deleted_at column already exists or table is new');
  }
};

// Initialize database
const initializeTables = async () => {
  await createUsersTable();
  await createPasswordsTable();
  await addDeletedAtColumn();
};

initializeTables();

module.exports = pool;