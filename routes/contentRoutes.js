const express          = require('express');
const { getFreeContent, getPremiumContent } = require('../controllers/contentController');
const authMiddleware    = require('../middleware/authMiddleware');
const premiumMiddleware = require('../middleware/premiumMiddleware');

const router = express.Router();

// GET /content/free  — public
router.get('/free', getFreeContent);

// GET /content/premium  — auth + premium role required
router.get('/premium', authMiddleware, premiumMiddleware, getPremiumContent);

module.exports = router;
