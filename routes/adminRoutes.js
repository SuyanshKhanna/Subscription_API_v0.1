const express = require('express');
const { getAccessLogs, getStats, getMonthlyCSV } = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All admin routes require authentication
router.use(authMiddleware);

// GET /admin/logs                        — paginated access logs
router.get('/logs', getAccessLogs);

// GET /admin/stats                       — platform summary stats
router.get('/stats', getStats);

// GET /admin/reports/monthly-csv?month=2026-03  — download CSV report
router.get('/reports/monthly-csv', getMonthlyCSV);

module.exports = router;
