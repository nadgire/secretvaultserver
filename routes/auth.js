const express = require('express');
const pool = require('../database');
const router = express.Router();

// POST /api/auth/signup - Create new user
router.post('/signup', async (req, res) => {
  try {
    const { google_id, email, name, picture, verified_email } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR google_id = $2',
      [email, google_id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Account already exists. Please use Sign In instead.'
      });
    }

    // Create new user
    const newUser = await pool.query(
      `INSERT INTO users (google_id, email, name, picture, verified_email) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [google_id, email, name, picture, verified_email]
    );

    res.json({
      success: true,
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account'
    });
  }
});

// POST /api/auth/signin - Check if user exists
router.post('/signin', async (req, res) => {
  try {
    const { email, google_id } = req.body;

    // Check if user exists
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND google_id = $2 AND is_active = true',
      [email, google_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found. Please sign up first.'
      });
    }

    // Update last login time
    await pool.query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.rows[0].id]
    );

    res.json({
      success: true,
      user: user.rows[0]
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sign in'
    });
  }
});

// GET /api/auth/user/:email - Check if user exists by email
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    res.json({
      exists: user.rows.length > 0,
      user: user.rows[0] || null
    });

  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check user'
    });
  }
});

module.exports = router;