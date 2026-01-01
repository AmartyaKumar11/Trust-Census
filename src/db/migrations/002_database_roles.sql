-- Migration: Database-Level Trust Enforcement
-- 
-- RESPONSIBILITY: Enforce separation of powers at the database level
-- 
-- This migration creates separate PostgreSQL roles with strict permissions
-- that enforce trust boundaries independent of application logic.
--
-- Database Roles:
-- - api_writer: May write L1 (submissions), cannot read L1 after insert
-- - audit_writer: May write L0 (audit logs) only, append-only
-- - aggregation_worker: May read L1, write L2/L3 (for computation)
-- - analytics_reader: May read L2/L3 only, no access to L0/L1
--
-- MUST:
-- - Enforce separation of powers at database level
-- - Prevent any single role from violating trust boundaries
-- - Make audit logs and submissions append-only
-- - Prevent superuser credential usage in application
--
-- MUST NEVER:
-- - Allow api_writer to read raw submissions (L1)
-- - Allow analytics_reader to access L0 or L1
-- - Allow audit_writer to access L1, L2, or L3
-- - Allow any role to modify or delete audit logs
-- - Allow any role to modify submitted data

-- ============================================================================
-- PART 1: CREATE DATABASE ROLES
-- ============================================================================

-- Create role for API layer (writes submissions, cannot read them back)
-- Used by: Enumerator endpoints
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'api_writer') THEN
        CREATE ROLE api_writer WITH LOGIN PASSWORD 'CHANGE_THIS_API_WRITER_PASSWORD';
    END IF;
END
$$;

-- Create role for audit logging (writes audit logs only)
-- Used by: Audit middleware
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'audit_writer') THEN
        CREATE ROLE audit_writer WITH LOGIN PASSWORD 'CHANGE_THIS_AUDIT_WRITER_PASSWORD';
    END IF;
END
$$;

-- Create role for aggregation computation (reads L1, writes L2/L3)
-- Used by: Background aggregation workers only
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'aggregation_worker') THEN
        CREATE ROLE aggregation_worker WITH LOGIN PASSWORD 'CHANGE_THIS_AGGREGATION_WORKER_PASSWORD';
    END IF;
END
$$;

-- Create role for analytics reading (reads L2/L3 only)
-- Used by: StateAnalyst and CentralPolicyViewer endpoints
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'analytics_reader') THEN
        CREATE ROLE analytics_reader WITH LOGIN PASSWORD 'CHANGE_THIS_ANALYTICS_READER_PASSWORD';
    END IF;
END
$$;

-- Create role for supervisor access (reads L0 audit logs only)
-- Used by: Supervisor endpoints
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supervisor_reader') THEN
        CREATE ROLE supervisor_reader WITH LOGIN PASSWORD 'CHANGE_THIS_SUPERVISOR_READER_PASSWORD';
    END IF;
END
$$;

-- ============================================================================
-- PART 2: REVOKE ALL DEFAULT PERMISSIONS
-- ============================================================================

-- Revoke all permissions from PUBLIC
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Revoke from all custom roles (clean slate)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM api_writer;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM audit_writer;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM aggregation_worker;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM analytics_reader;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM supervisor_reader;

-- Grant schema usage to all roles
GRANT USAGE ON SCHEMA public TO api_writer;
GRANT USAGE ON SCHEMA public TO audit_writer;
GRANT USAGE ON SCHEMA public TO aggregation_worker;
GRANT USAGE ON SCHEMA public TO analytics_reader;
GRANT USAGE ON SCHEMA public TO supervisor_reader;

-- ============================================================================
-- PART 3: API_WRITER PERMISSIONS (L1 Write-Only)
-- ============================================================================

-- api_writer: Can INSERT into census_submissions (L1)
-- api_writer: CANNOT SELECT from census_submissions (one-way write)
-- api_writer: Can SELECT/UPDATE users table (for authentication)
-- api_writer: CANNOT access audit_logs, aggregate_computations

GRANT SELECT, UPDATE ON users TO api_writer;
GRANT INSERT ON census_submissions TO api_writer;
-- NO SELECT on census_submissions - enforces one-way write

-- Grant sequence usage for UUID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO api_writer;

-- ============================================================================
-- PART 4: AUDIT_WRITER PERMISSIONS (L0 Append-Only)
-- ============================================================================

-- audit_writer: Can INSERT into audit_logs (L0)
-- audit_writer: CANNOT SELECT, UPDATE, DELETE audit_logs
-- audit_writer: CANNOT access census_submissions, aggregate_computations

GRANT INSERT ON audit_logs TO audit_writer;
-- NO SELECT, UPDATE, DELETE on audit_logs - append-only

-- Grant sequence usage for UUID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO audit_writer;

-- ============================================================================
-- PART 5: AGGREGATION_WORKER PERMISSIONS (L1 Read, L2/L3 Write)
-- ============================================================================

-- aggregation_worker: Can SELECT from census_submissions (L1) for computation
-- aggregation_worker: Can INSERT into aggregate_computations (L2/L3)
-- aggregation_worker: CANNOT access audit_logs, users

GRANT SELECT ON census_submissions TO aggregation_worker;
GRANT INSERT ON aggregate_computations TO aggregation_worker;
-- NO access to audit_logs or users

-- Grant sequence usage for UUID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO aggregation_worker;

-- ============================================================================
-- PART 6: ANALYTICS_READER PERMISSIONS (L2/L3 Read-Only)
-- ============================================================================

-- analytics_reader: Can SELECT from aggregate_computations (L2/L3)
-- analytics_reader: CANNOT access census_submissions (L1), audit_logs (L0)

GRANT SELECT ON aggregate_computations TO analytics_reader;
-- NO access to census_submissions or audit_logs

-- ============================================================================
-- PART 7: SUPERVISOR_READER PERMISSIONS (L0 Read-Only)
-- ============================================================================

-- supervisor_reader: Can SELECT from audit_logs (L0)
-- supervisor_reader: CANNOT access census_submissions (L1), aggregate_computations (L2/L3)

GRANT SELECT ON audit_logs TO supervisor_reader;
-- NO access to census_submissions or aggregate_computations

-- ============================================================================
-- PART 8: APPEND-ONLY ENFORCEMENT TRIGGERS
-- ============================================================================

-- Prevent UPDATE on audit_logs (append-only)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are not permitted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_audit_log_update ON audit_logs;
CREATE TRIGGER trigger_prevent_audit_log_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trigger_prevent_audit_log_delete ON audit_logs;
CREATE TRIGGER trigger_prevent_audit_log_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

-- Prevent UPDATE on census_submissions (one-way write)
CREATE OR REPLACE FUNCTION prevent_submission_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Census submissions are immutable. UPDATE and DELETE operations are not permitted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_submission_update ON census_submissions;
CREATE TRIGGER trigger_prevent_submission_update
    BEFORE UPDATE ON census_submissions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_submission_modification();

DROP TRIGGER IF EXISTS trigger_prevent_submission_delete ON census_submissions;
CREATE TRIGGER trigger_prevent_submission_delete
    BEFORE DELETE ON census_submissions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_submission_modification();

-- ============================================================================
-- PART 9: CONSENT RECORDS TABLE (L0)
-- ============================================================================

-- Create consent_records table if not exists
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID NOT NULL,
    consent_type VARCHAR(50) NOT NULL,
    consent_status VARCHAR(20) NOT NULL CHECK (consent_status IN ('GRANTED', 'REVOKED')),
    granted_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Consent records are append-only (new record for each status change)
    CONSTRAINT valid_consent_dates CHECK (
        (consent_status = 'GRANTED' AND granted_at IS NOT NULL) OR
        (consent_status = 'REVOKED' AND revoked_at IS NOT NULL)
    )
);

-- Index for consent lookups
CREATE INDEX IF NOT EXISTS idx_consent_records_citizen ON consent_records(citizen_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_status ON consent_records(consent_status);

-- Prevent UPDATE and DELETE on consent_records (append-only)
DROP TRIGGER IF EXISTS trigger_prevent_consent_update ON consent_records;
CREATE TRIGGER trigger_prevent_consent_update
    BEFORE UPDATE ON consent_records
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trigger_prevent_consent_delete ON consent_records;
CREATE TRIGGER trigger_prevent_consent_delete
    BEFORE DELETE ON consent_records
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

-- Grant INSERT only on consent_records to api_writer
GRANT INSERT ON consent_records TO api_writer;
-- Supervisor can read consent status (aggregate counts)
GRANT SELECT ON consent_records TO supervisor_reader;

-- ============================================================================
-- PART 10: MICRO AND MACRO AGGREGATE TABLES (L2/L3)
-- ============================================================================

-- Create micro_aggregates table (L2) if not exists
CREATE TABLE IF NOT EXISTS micro_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geographic_level VARCHAR(20) NOT NULL CHECK (geographic_level IN ('block', 'village')),
    geographic_code VARCHAR(10) NOT NULL,
    caste_category VARCHAR(50) NOT NULL,
    household_count INTEGER NOT NULL CHECK (household_count >= 0),
    population_count INTEGER NOT NULL CHECK (population_count >= 0),
    submission_count INTEGER NOT NULL CHECK (submission_count >= 0),
    -- Threshold protection: suppress if below threshold
    is_suppressed BOOLEAN DEFAULT false,
    suppression_reason VARCHAR(100),
    computed_by UUID NOT NULL REFERENCES users(id),
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    computation_hash VARCHAR(64) NOT NULL
);

-- Create macro_aggregates table (L3) if not exists
CREATE TABLE IF NOT EXISTS macro_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geographic_level VARCHAR(20) NOT NULL CHECK (geographic_level IN ('district', 'state', 'national')),
    geographic_code VARCHAR(10) NOT NULL,
    caste_category VARCHAR(50) NOT NULL,
    household_count INTEGER NOT NULL CHECK (household_count >= 0),
    population_count INTEGER NOT NULL CHECK (population_count >= 0),
    submission_count INTEGER NOT NULL CHECK (submission_count >= 0),
    -- Privacy noise applied
    noise_epsilon DECIMAL(10, 6),
    computed_by UUID NOT NULL REFERENCES users(id),
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    computation_hash VARCHAR(64) NOT NULL
);

-- Indexes for aggregate lookups
CREATE INDEX IF NOT EXISTS idx_micro_aggregates_geo ON micro_aggregates(geographic_level, geographic_code);
CREATE INDEX IF NOT EXISTS idx_macro_aggregates_geo ON macro_aggregates(geographic_level, geographic_code);

-- Grant permissions on new tables
GRANT INSERT ON micro_aggregates TO aggregation_worker;
GRANT INSERT ON macro_aggregates TO aggregation_worker;
GRANT SELECT ON micro_aggregates TO analytics_reader;
GRANT SELECT ON macro_aggregates TO analytics_reader;

-- Grant sequence usage
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO aggregation_worker;

-- ============================================================================
-- PART 11: VERIFY NO SUPERUSER USAGE
-- ============================================================================

-- Create a function to check for superuser usage (for monitoring)
CREATE OR REPLACE FUNCTION check_superuser_usage()
RETURNS TABLE (
    rolname TEXT,
    is_superuser BOOLEAN,
    can_login BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.rolname::TEXT,
        r.rolsuper,
        r.rolcanlogin
    FROM pg_catalog.pg_roles r
    WHERE r.rolsuper = true AND r.rolcanlogin = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 12: PERMISSION VERIFICATION VIEW
-- ============================================================================

-- Create a view to verify role permissions
CREATE OR REPLACE VIEW role_permissions_audit AS
SELECT 
    grantee,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND grantee IN ('api_writer', 'audit_writer', 'aggregation_worker', 'analytics_reader', 'supervisor_reader')
ORDER BY grantee, table_name, privilege_type;

-- Grant SELECT on this view to supervisor_reader for auditing
GRANT SELECT ON role_permissions_audit TO supervisor_reader;

-- ============================================================================
-- PART 13: DOCUMENT ROLE PURPOSES
-- ============================================================================

COMMENT ON ROLE api_writer IS 
'API layer role for Enumerator endpoints. 
Can: INSERT census_submissions (L1), SELECT/UPDATE users.
Cannot: SELECT census_submissions (one-way write), access L0/L2/L3.';

COMMENT ON ROLE audit_writer IS 
'Audit logging role for middleware.
Can: INSERT audit_logs (L0).
Cannot: SELECT/UPDATE/DELETE audit_logs, access L1/L2/L3.';

COMMENT ON ROLE aggregation_worker IS 
'Background aggregation worker role.
Can: SELECT census_submissions (L1), INSERT micro/macro_aggregates (L2/L3).
Cannot: Access L0, modify L1.';

COMMENT ON ROLE analytics_reader IS 
'Analytics reading role for StateAnalyst/CentralPolicyViewer.
Can: SELECT micro/macro_aggregates (L2/L3).
Cannot: Access L0/L1.';

COMMENT ON ROLE supervisor_reader IS 
'Supervisor role for audit access.
Can: SELECT audit_logs (L0), consent_records.
Cannot: Access L1/L2/L3.';

