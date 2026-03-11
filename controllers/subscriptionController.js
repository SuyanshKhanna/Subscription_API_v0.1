const pool = require('../db/db');

// ----------------------------------------------------------------
// POST /subscription/upgrade
// Simulates payment success — upgrades user to premium for 30 days
// ----------------------------------------------------------------
const upgradeSubscription = async (req, res) => {
  const userId = req.user.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id, email, role FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check for already-active unexpired subscription
    const activeSub = await client.query(
      `SELECT id, end_date FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND end_date > NOW()
       LIMIT 1`,
      [userId]
    );

    if (activeSub.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `You already have an active premium subscription until ${new Date(activeSub.rows[0].end_date).toDateString()}.`,
      });
    }

    // Deactivate any old subscriptions
    await client.query(
      "UPDATE subscriptions SET status = 'inactive' WHERE user_id = $1",
      [userId]
    );

    // Upgrade role to premium
    await client.query("UPDATE users SET role = 'premium' WHERE id = $1", [userId]);

    // Create subscription — expires in 30 days
    const subResult = await client.query(
      `INSERT INTO subscriptions (user_id, status, start_date, end_date)
       VALUES ($1, 'active', NOW(), NOW() + INTERVAL '30 days')
       RETURNING id, user_id, status, start_date, end_date`,
      [userId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Subscription upgraded to premium. Valid for 30 days.',
      data: {
        subscription: subResult.rows[0],
        user: { id: userId, email: userResult.rows[0].email, role: 'premium' },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[upgradeSubscription]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  } finally {
    client.release();
  }
};

// ----------------------------------------------------------------
// GET /subscription/status
// Also auto-expires subscription if end_date has passed
// ----------------------------------------------------------------
const getSubscriptionStatus = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT s.id, s.status, s.start_date, s.end_date, u.role,
              (s.end_date > NOW()) AS is_active,
              GREATEST(0, EXTRACT(DAY FROM s.end_date - NOW()))::int AS days_remaining
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1
       ORDER BY s.start_date DESC
       LIMIT 1`,
      [userId]
    );

    // Auto-expire: downgrade to free if subscription has lapsed
    if (result.rows.length > 0 && !result.rows[0].is_active && result.rows[0].status === 'active') {
      await pool.query(
        "UPDATE subscriptions SET status = 'inactive' WHERE user_id = $1 AND status = 'active'",
        [userId]
      );
      await pool.query("UPDATE users SET role = 'free' WHERE id = $1", [userId]);
      result.rows[0].status        = 'inactive';
      result.rows[0].role          = 'free';
      result.rows[0].days_remaining = 0;
    }

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: { role: req.user.role, subscription: null },
      });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[getSubscriptionStatus]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { upgradeSubscription, getSubscriptionStatus };
