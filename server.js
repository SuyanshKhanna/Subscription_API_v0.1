require('dotenv').config();

const express  = require('express');
const cors     = require('cors');

const authRoutes         = require('./routes/authRoutes');
const contentRoutes      = require('./routes/contentRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes        = require('./routes/adminRoutes');

require('./db/db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin:  process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (_req, res) =>
  res.status(200).json({ success: true, message: 'DevLearn API is running 🚀' })
);

app.get('/health', (_req, res) =>
  res.status(200).json({ success: true, message: 'OK' })
);

app.use('/auth',         authRoutes);
app.use('/content',      contentRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/admin',        adminRoutes);

app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found.' })
);

app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 DevLearn API running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;