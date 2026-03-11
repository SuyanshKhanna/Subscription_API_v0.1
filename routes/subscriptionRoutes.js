const express = require('express');
const { upgradeSubscription, getSubscriptionStatus } = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /subscription/upgrade  — simulate payment & upgrade to premium
router.post('/upgrade', authMiddleware, upgradeSubscription);

// GET /subscription/status  — check current subscription
router.get('/status', authMiddleware, getSubscriptionStatus);

module.exports = router;
