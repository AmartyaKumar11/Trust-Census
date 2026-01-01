-- Migration: Update Role Enumeration
-- 
-- RESPONSIBILITY: Update database to support new role names
-- 
-- This migration updates the user_role enum to include the 5 canonical roles:
-- - CITIZEN
-- - ENUMERATOR
-- - SUPERVISOR
-- - STATE_ANALYST
-- - CENTRAL_POLICY_VIEWER
--
-- Legacy roles (DATA_ENTRY, AUDITOR, ANALYST) are retained for backward compatibility
-- and will be mapped to new roles at the application level.
--
-- MUST:
-- - Add new role values to enum
-- - Preserve existing data
-- - Not break existing functionality
--
-- MUST NEVER:
-- - Add super-admin or override roles
-- - Remove existing role values (would break data)
-- - Allow role combination

-- Add new role values to the enum
-- Note: PostgreSQL allows adding values to enums but not removing them
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'CITIZEN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ENUMERATOR';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPERVISOR';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'STATE_ANALYST';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'CENTRAL_POLICY_VIEWER';

-- Create a view that maps legacy roles to new roles for reporting
CREATE OR REPLACE VIEW users_with_normalized_roles AS
SELECT 
    id,
    username,
    CASE role
        WHEN 'DATA_ENTRY' THEN 'ENUMERATOR'
        WHEN 'AUDITOR' THEN 'SUPERVISOR'
        WHEN 'ANALYST' THEN 'STATE_ANALYST'
        ELSE role::text
    END AS normalized_role,
    role AS original_role,
    created_at,
    last_login,
    is_active
FROM users;

-- Add comment documenting the role mapping
COMMENT ON VIEW users_with_normalized_roles IS 
'View that maps legacy roles to new role names. 
Legacy mapping:
- DATA_ENTRY -> ENUMERATOR
- AUDITOR -> SUPERVISOR
- ANALYST -> STATE_ANALYST
New roles:
- CITIZEN
- ENUMERATOR
- SUPERVISOR
- STATE_ANALYST
- CENTRAL_POLICY_VIEWER';

-- Ensure the no_super_admin constraint still applies
-- (The existing CHECK constraint prevents SUPER_ADMIN)

