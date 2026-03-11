const pool = require('../db/db');

// ----------------------------------------------------------------
// GET /admin/logs
// Paginated premium access logs with full request details
// Query params: ?page=1&limit=20&user_id=<optional>
// ----------------------------------------------------------------
const getAccessLogs = async (req, res) => {
  const page       = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit      = Math.min(100, parseInt(req.query.limit || '20', 10));
  const offset     = (page - 1) * limit;
  const filterUser = req.query.user_id ? parseInt(req.query.user_id, 10) : null;

  try {
    const whereClause = filterUser ? 'WHERE al.user_id = $3' : '';
    const queryParams = filterUser ? [limit, offset, filterUser] : [limit, offset];
    const countParams = filterUser ? [filterUser] : [];
    const countWhere  = filterUser ? 'WHERE user_id = $1' : '';

    const [logsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT al.id, al.user_id, u.email AS user_email,
                al.endpoint, al.method, al.status_code,
                al.ip_address, al.access_time
         FROM access_logs al
         JOIN users u ON u.id = al.user_id
         ${whereClause}
         ORDER BY al.access_time DESC
         LIMIT $1 OFFSET $2`,
        queryParams
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM access_logs ${countWhere}`,
        countParams
      ),
    ]);

    const total      = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: logsResult.rows,
      pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  } catch (err) {
    console.error('[getAccessLogs]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ----------------------------------------------------------------
// GET /admin/stats
// Platform summary statistics
// ----------------------------------------------------------------
const getStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)                                          AS total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'premium')                  AS premium_users,
        (SELECT COUNT(*) FROM users WHERE role = 'free')                     AS free_users,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active'
           AND end_date > NOW())                                              AS active_subscriptions,
        (SELECT COUNT(*) FROM subscriptions WHERE end_date <= NOW())         AS expired_subscriptions,
        (SELECT COUNT(*) FROM content WHERE is_premium = FALSE)              AS free_content_count,
        (SELECT COUNT(*) FROM content WHERE is_premium = TRUE)               AS premium_content_count,
        (SELECT COUNT(*) FROM access_logs)                                   AS total_premium_accesses
    `);

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[getStats]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ----------------------------------------------------------------
// GET /admin/reports/monthly-csv
// Generates a CSV report of premium access logs for a given month
// Query params: ?month=2026-03  (defaults to current month)
// ----------------------------------------------------------------
const getMonthlyCSV = async (req, res) => {
  try {
    // Parse month param e.g. "2026-03" — default to current month
    const monthParam = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = monthParam.split('-').map(Number);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'Invalid month. Use format YYYY-MM.' });
    }

    const result = await pool.query(
      `SELECT
         al.id,
         al.user_id,
         u.email        AS user_email,
         u.role         AS user_role,
         al.endpoint,
         al.method,
         al.status_code,
         al.ip_address,
         al.access_time
       FROM access_logs al
       JOIN users u ON u.id = al.user_id
       WHERE EXTRACT(YEAR  FROM al.access_time) = $1
         AND EXTRACT(MONTH FROM al.access_time) = $2
       ORDER BY al.access_time ASC`,
      [year, month]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No access logs found for ${monthParam}.`,
      });
    }

    // Build CSV manually — no extra dependencies needed
    const headers = ['id', 'user_id', 'user_email', 'user_role', 'endpoint', 'method', 'status_code', 'ip_address', 'access_time'];

    const escape = (val) => {
      const str = String(val ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const csvRows = [
      headers.join(','),
      ...result.rows.map(row => headers.map(h => escape(row[h])).join(',')),
    ];

    const csv = csvRows.join('\n');
    const filename = `devlearn_access_report_${monthParam}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);

  } catch (err) {
    console.error('[getMonthlyCSV]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { getAccessLogs, getStats, getMonthlyCSV };
