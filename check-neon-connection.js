const { Client } = require('pg');
require('dotenv').config();

async function testNeonConnection() {
  console.log('🔍 Testing Neon Database Connection...\n');
  
  // Display current configuration
  console.log('📋 Current Configuration:');
  if (process.env.DB_CONNECTION_STRING) {
    console.log(`  Connection String: [SET - ${process.env.DB_CONNECTION_STRING.length} chars]`);
    const match = process.env.DB_CONNECTION_STRING.match(/postgresql:\/\/([^:]+):([^@]+)@([^:\/]+):?(\d+)?\/([^?]+)/);
    if (match) {
      console.log(`  Extracted User: ${match[1]}`);
      console.log(`  Extracted Host: ${match[3]}`);
      console.log(`  Extracted Port: ${match[4] || '5432'}`);
      console.log(`  Extracted Database: ${match[5]}`);
    }
  } else {
    console.log(`  Host: ${process.env.DB_HOST}`);
    console.log(`  Port: ${process.env.DB_PORT}`);
    console.log(`  Database: ${process.env.DB_NAME}`);
    console.log(`  User: ${process.env.DB_USER}`);
    console.log(`  Password: ${process.env.DB_PASSWORD ? '[SET - ' + process.env.DB_PASSWORD.length + ' chars]' : '[NOT SET]'}`);
  }
  console.log('');

  // Test connection using connection string if available
  const clientConfig = process.env.DB_CONNECTION_STRING ? {
    connectionString: process.env.DB_CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
  } : {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
  };

  const client = new Client(clientConfig);

  try {
    console.log('🔄 Attempting to connect...');
    await client.connect();
    console.log('✅ Successfully connected to Neon database!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('📅 Database time:', result.rows[0].current_time);
    console.log('🗄️  Database version:', result.rows[0].db_version.split(' ')[0]);
    
    // List existing tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📊 Existing tables:', tables.rows.length > 0 ? tables.rows.map(r => r.table_name).join(', ') : 'None');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Troubleshooting steps:');
    
    if (error.code === '28P01') {
      console.log('   1. Password authentication failed');
      console.log('   2. Check your Neon dashboard for correct credentials');
      console.log('   3. Make sure you\'re using the correct database user and password');
      console.log('   4. Try resetting your database password in Neon dashboard');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   1. Check the database host URL');
      console.log('   2. Make sure your internet connection is working');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   1. Check if the database is running');
      console.log('   2. Verify the port number');
    }
    
    console.log('\n🔗 To get fresh credentials:');
    console.log('   1. Go to https://console.neon.tech/');
    console.log('   2. Select your project');
    console.log('   3. Go to Connection Details');
    console.log('   4. Copy the connection string or individual parameters');
    
  } finally {
    await client.end();
    console.log('\n🔚 Connection test completed.');
  }
}

testNeonConnection();