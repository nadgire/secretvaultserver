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

    // Check if user exists and is not deleted
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND google_id = $2 AND is_active = true AND deleted_at IS NULL',
      [email, google_id]
    );

    if (user.rows.length === 0) {
      // Check if user exists but is deleted
      const deletedUser = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND google_id = $2 AND deleted_at IS NOT NULL',
        [email, google_id]
      );

      if (deletedUser.rows.length > 0) {
        return res.status(410).json({
          success: false,
          error: 'ACCOUNT_DELETED',
          message: 'Account was deleted. Use reactivate endpoint to restore.'
        });
      }

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

// DELETE /api/auth/delete-account - Soft delete user account
router.delete('/delete-account', async (req, res) => {
  try {
    const { email, google_id } = req.body;

    // Check if user exists and is not already deleted
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND google_id = $2 AND is_active = true AND deleted_at IS NULL',
      [email, google_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found or already deleted'
      });
    }

    // Soft delete the user by setting deleted_at timestamp
    await pool.query(
      'UPDATE users SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE email = $1 AND google_id = $2',
      [email, google_id]
    );

    res.json({
      success: true,
      message: 'Account successfully deleted'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account'
    });
  }
});

// POST /api/auth/reactivate-account - Reactivate deleted user account
router.post('/reactivate-account', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists and is deleted
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NOT NULL',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No deleted account found with this email'
      });
    }

    // Reactivate the user by clearing deleted_at timestamp
    const reactivatedUser = await pool.query(
      'UPDATE users SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE email = $1 RETURNING *',
      [email]
    );

    res.json({
      success: true,
      message: 'Account successfully reactivated',
      user: reactivatedUser.rows[0]
    });

  } catch (error) {
    console.error('Reactivate account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reactivate account'
    });
  }
});

module.exports = router;