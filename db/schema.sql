-- ============================================================
-- DevLearn Platform — PostgreSQL Schema
-- ============================================================

-- Enable UUID extension (optional, using SERIAL for simplicity)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  role       VARCHAR(10) NOT NULL DEFAULT 'free' CHECK (role IN ('free', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- SUBSCRIPTIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- CONTENT
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_premium  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- ACCESS LOGS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    VARCHAR(255) NOT NULL,
  access_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user   ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user     ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_content_is_premium   ON content(is_premium);

-- ----------------------------------------------------------------
-- SEED — Sample Content
-- ----------------------------------------------------------------
INSERT INTO content (title, description, body, is_premium) VALUES
  (
    'Getting Started with Node.js',
    'A beginner-friendly introduction to Node.js and its ecosystem.',
    'Node.js is a JavaScript runtime built on Chrome''s V8 engine. In this article we cover installation, the event loop, and your first HTTP server.',
    FALSE
  ),
  (
    'Understanding REST APIs',
    'Learn the principles of RESTful design and how to build one.',
    'REST stands for Representational State Transfer. In this guide we walk through resources, HTTP verbs, status codes, and best practices.',
    FALSE
  ),
  (
    'Advanced PostgreSQL Performance Tuning',
    'Deep-dive into query optimization, indexing strategies, and EXPLAIN ANALYZE.',
    'This premium guide covers BRIN/GIN/GiST indexes, partition pruning, connection pooling with PgBouncer, and reading EXPLAIN output like a pro.',
    TRUE
  ),
  (
    'Building Scalable Microservices with Node.js',
    'Architecture patterns for splitting a monolith into resilient microservices.',
    'We examine service discovery, async messaging with RabbitMQ, distributed tracing, and deploying to Kubernetes — all with real Node.js code.',
    TRUE
  ),
  (
    'Mastering JWT Authentication',
    'Secure your APIs with JSON Web Tokens — from basics to refresh-token rotation.',
    'This premium deep-dive covers HS256 vs RS256, token revocation strategies, silent refresh flows, and storing tokens safely in the browser.',
    TRUE
  )
ON CONFLICT DO NOTHING;
