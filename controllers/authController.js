const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const pool     = require('../db/db');

const SALT_ROUNDS = 12;

// ----------------------------------------------------------------
// Helper — sign a JWT for a user row
// ----------------------------------------------------------------
const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ----------------------------------------------------------------
// POST /auth/register
// ----------------------------------------------------------------
const register = async (req, res) => {
  const { email, password } = req.body;

  // --- Validation ---
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format.' });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters.',
    });
  }

  try {
    // Check duplicate
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (email, password, role)
       VALUES ($1, $2, 'free')
       RETURNING id, email, role, created_at`,
      [email.toLowerCase(), hashed]
    );

    const user  = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at },
      },
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ----------------------------------------------------------------
// POST /auth/login
// ----------------------------------------------------------------
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password, role, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Generic message to prevent user enumeration
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user  = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at },
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { register, login };
// const register = (req, res) => {
//   res.send("Register working");
// };

// const login = (req, res) => {
//   res.send("Login working");
// };

// module.exports = { register, login };