const pool = require('../db/db');

// ----------------------------------------------------------------
// Helper — log premium access with full request details
// ----------------------------------------------------------------
const logAccess = async (userId, req, statusCode) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
      || req.socket?.remoteAddress
      || 'unknown';

    await pool.query(
      `INSERT INTO access_logs (user_id, endpoint, method, status_code, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, req.originalUrl, req.method, statusCode, ip]
    );
  } catch (err) {
    console.error('[logAccess] Failed to write access log:', err.message);
  }
};

// ----------------------------------------------------------------
// GET /content/free  — public
// ----------------------------------------------------------------
const getFreeContent = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, body, is_premium, created_at
       FROM content WHERE is_premium = FALSE
       ORDER BY created_at DESC`
    );

    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('[getFreeContent]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ----------------------------------------------------------------
// GET /content/premium  — requires auth + active premium subscription
// ----------------------------------------------------------------
const getPremiumContent = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, body, is_premium, created_at
       FROM content WHERE is_premium = TRUE
       ORDER BY created_at DESC`
    );

    // Log with full request details
    await logAccess(req.user.id, req, 200);

    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('[getPremiumContent]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { getFreeContent, getPremiumContent };
