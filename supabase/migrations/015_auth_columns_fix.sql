-- Add missing auth columns to users table so registration can work
-- This syncs the users table with the auth columns needed by the application

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Also ensure created_at and updated_at have defaults
ALTER TABLE public.users
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email_auth ON public.users(email);

-- Update the demo user with a hashed password
-- Password: DemoPass123!
UPDATE public.users
SET password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4qIU7dMsSVTtqjMi'
WHERE email = 'demo@narriv.test';

-- Mark demo user as verified
UPDATE public.users
SET email_verified = true
WHERE email = 'demo@narriv.test';
