# SecretVault Backend API

This is the backend API server for SecretVault that handles user authentication and database operations with Neon PostgreSQL.

## Setup Instructions

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Environment Variables
The server reads from the `.env` file in the parent directory. Make sure these variables are set:
- `DB_HOST` - Neon database host
- `DB_PORT` - Database port (5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

### 3. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### Health Check
- **GET** `/api/health` - Check if server is running

### Authentication
- **POST** `/api/auth/signup` - Create new user account
- **POST** `/api/auth/signin` - Sign in existing user
- **GET** `/api/auth/user/:email` - Check if user exists

## Database Schema

The server automatically creates a `users` table with the following structure:

```sql
CREATE TABLE users (
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
```

## Testing the API

You can test the API using curl:

```bash
# Health check
curl http://localhost:3000/api/health

# Check if user exists
curl http://localhost:3000/api/auth/user/test@example.com
```