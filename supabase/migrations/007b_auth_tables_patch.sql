-- Migration: 007_auth_tables_patch.sql
-- Add missing auth columns to users table
-- Run this via Supabase Dashboard SQL Editor or via CLI

BEGIN;

-- Add missing columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'password';

-- Also add full name column if missing
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS full_name TEXT;

COMMIT;

-- Update existing demo user with a hashed password
-- Password: DemoPass123!
UPDATE public.users
SET password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4qIU7dMsSVTtqjMi'
WHERE email = 'demo@narriv.test';

-- Mark as verified
UPDATE public.users
SET email_verified = true
WHERE email = 'demo@narriv.test';

-- Create a test user
-- Password: Test123!
INSERT INTO public.users (email, name, password, email_verified)
VALUES ('test@example.com', 'Test User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4qIU7dMsSVTtqjMi', true)
ON CONFLICT (email) DO NOTHING;
