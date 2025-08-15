const pool = require('./database');

async function testConnection() {
  try {
    console.log('🔄 Testing database connection...');
    
    // Test database connection
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully!');
    console.log('📅 Current time from DB:', result.rows[0].current_time);
    
    // Test if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Users table exists');
      
      // Count existing users
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      console.log(`👥 Current users in database: ${userCount.rows[0].count}`);
    } else {
      console.log('❌ Users table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 Check your database host in .env file');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Database server is not reachable');
    } else if (error.code === '28P01') {
      console.log('💡 Authentication failed - check username/password in .env');
    }
  } finally {
    process.exit(0);
  }
}

testConnection();