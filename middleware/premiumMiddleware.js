const pool = require('../db/db');

/**
 * Must be used AFTER authMiddleware.
 * 1. Checks user role is 'premium'
 * 2. Verifies the subscription has not expired
 * 3. Auto-downgrades expired users back to free
 */
const premiumMiddleware = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
  }

  if (req.user.role !== 'premium') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. A premium subscription is required to view this content.',
    });
  }

  // Double-check subscription has not expired in the DB
  try {
    const result = await pool.query(
      `SELECT id, end_date FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND end_date > NOW()
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Subscription expired — auto-downgrade
      await pool.query(
        "UPDATE subscriptions SET status = 'inactive' WHERE user_id = $1 AND status = 'active'",
        [req.user.id]
      );
      await pool.query("UPDATE users SET role = 'free' WHERE id = $1", [req.user.id]);

      return res.status(403).json({
        success: false,
        message: 'Your premium subscription has expired. Please renew to access this content.',
      });
    }

    next();
  } catch (err) {
    console.error('[premiumMiddleware]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = premiumMiddleware;
