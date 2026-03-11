-- ============================================================
-- DevLearn — Migration: Add missing columns
-- Run this ONCE against your existing database
-- ============================================================

-- 1. Add expiry date to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Set end_date = start_date + 30 days for existing rows
UPDATE subscriptions
  SET end_date = start_date + INTERVAL '30 days'
  WHERE end_date IS NULL;

-- 2. Enrich access_logs with request details
ALTER TABLE access_logs
  ADD COLUMN IF NOT EXISTS method      VARCHAR(10)  NOT NULL DEFAULT 'GET',
  ADD COLUMN IF NOT EXISTS status_code INTEGER      NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS ip_address  VARCHAR(45)  NOT NULL DEFAULT 'unknown';
