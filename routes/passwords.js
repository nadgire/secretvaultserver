const express = require('express');
const pool = require('../database');
const router = express.Router();

// POST /api/passwords - Create new password entry
router.post('/', async (req, res) => {
  try {
    const { user_id, title, username, password, website, notes } = req.body;

    if (!user_id || !title) {
      return res.status(400).json({
        success: false,
        error: 'User ID and title are required'
      });
    }

    const newPassword = await pool.query(
      `INSERT INTO passwords (user_id, title, username, password, website, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [user_id, title, username, password, website, notes]
    );

    res.json({
      success: true,
      password: newPassword.rows[0]
    });

  } catch (error) {
    console.error('Create password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create password entry'
    });
  }
});

// GET /api/passwords/:userId - Get all passwords for user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const passwords = await pool.query(
      'SELECT * FROM passwords WHERE user_id = $1 AND deleted = false ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      passwords: passwords.rows
    });

  } catch (error) {
    console.error('Get passwords error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve passwords'
    });
  }
});

// PUT /api/passwords/:id - Update password entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, username, password, website, notes } = req.body;

    const updatedPassword = await pool.query(
      `UPDATE passwords 
       SET title = $1, username = $2, password = $3, website = $4, notes = $5, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 AND deleted = false 
       RETURNING *`,
      [title, username, password, website, notes, id]
    );

    if (updatedPassword.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Password entry not found'
      });
    }

    res.json({
      success: true,
      password: updatedPassword.rows[0]
    });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update password entry'
    });
  }
});

// DELETE /api/passwords/:id - Delete password entry (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPassword = await pool.query(
      `UPDATE passwords 
       SET deleted = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND deleted = false 
       RETURNING id`,
      [id]
    );

    if (deletedPassword.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Password entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Password entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete password entry'
    });
  }
});

// POST /api/passwords/sync - Bulk sync passwords from mobile app
router.post('/sync', async (req, res) => {
  try {
    const { user_id, passwords } = req.body;

    if (!user_id || !Array.isArray(passwords)) {
      return res.status(400).json({
        success: false,
        error: 'User ID and passwords array are required'
      });
    }

    const syncResults = [];

    for (const passwordData of passwords) {
      try {
        const { operation, data, mobile_id } = passwordData;

        switch (operation) {
          case 'CREATE':
            const newPassword = await pool.query(
              `INSERT INTO passwords (user_id, title, username, password, website, notes, mobile_id) 
               VALUES ($1, $2, $3, $4, $5, $6, $7) 
               RETURNING *`,
              [user_id, data.title, data.username, data.password, data.website, data.notes, mobile_id]
            );
            syncResults.push({ operation: 'CREATE', success: true, password: newPassword.rows[0] });
            break;

          case 'UPDATE':
            const updatedPassword = await pool.query(
              `UPDATE passwords 
               SET title = $1, username = $2, password = $3, website = $4, notes = $5, 
                   updated_at = CURRENT_TIMESTAMP 
               WHERE mobile_id = $6 AND user_id = $7 
               RETURNING *`,
              [data.title, data.username, data.password, data.website, data.notes, mobile_id, user_id]
            );
            syncResults.push({ operation: 'UPDATE', success: true, password: updatedPassword.rows[0] });
            break;

          case 'DELETE':
            await pool.query(
              'UPDATE passwords SET deleted = true WHERE mobile_id = $1 AND user_id = $2',
              [mobile_id, user_id]
            );
            syncResults.push({ operation: 'DELETE', success: true });
            break;
        }
      } catch (error) {
        syncResults.push({ operation: passwordData.operation, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      results: syncResults
    });

  } catch (error) {
    console.error('Sync passwords error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync passwords'
    });
  }
});

module.exports = router;