-- The escalation matrix UI and the overdue-alert escalation job read a role per level (L1 → Team Lead, …),
-- but the table never had a column for it, so role names could not be saved. Additive and nullable.
ALTER TABLE public.escalation_matrices ADD COLUMN IF NOT EXISTS role_name TEXT;
