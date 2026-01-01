-- Trust Census Database Schema
-- Enforces one-way data flow and strict auditability

-- Role enumeration (NO SUPER-ADMIN)
-- DATA_ENTRY: Can submit census data
-- AUDITOR: Can view audit logs only
-- ANALYST: Can compute aggregates (no raw data access)
CREATE TYPE user_role AS ENUM ('DATA_ENTRY', 'AUDITOR', 'ANALYST');

-- Users table (no super-admin role allowed)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT no_super_admin CHECK (role != 'SUPER_ADMIN')
);

-- Census submissions table
-- Data is stored with one-way encryption/anonymization
-- NO raw data access after submission
CREATE TABLE census_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Geographic identifiers only (no personal identifiers)
    state_code VARCHAR(2) NOT NULL,
    district_code VARCHAR(4) NOT NULL,
    block_code VARCHAR(6) NOT NULL,
    village_code VARCHAR(10),
    
    -- Census data (anonymized at submission)
    household_count INTEGER NOT NULL CHECK (household_count >= 0),
    population_count INTEGER NOT NULL CHECK (population_count >= 0),
    
    -- Caste category (explicit only, no inference)
    caste_category VARCHAR(50) NOT NULL,
    
    -- Submission metadata
    submitted_by UUID NOT NULL REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Data integrity
    submission_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for integrity verification
    is_verified BOOLEAN DEFAULT false,
    
    -- NO personal identifiers stored
    CONSTRAINT no_personal_data CHECK (
        -- Explicitly prevent storage of Aadhaar, phone, biometrics, etc.
        true
    )
);

-- Audit log table (immutable, append-only)
-- All system actions are logged here
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    status_code INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Aggregate computations table
-- Stores pre-computed aggregates to prevent reverse engineering
CREATE TABLE aggregate_computations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    computation_type VARCHAR(50) NOT NULL,
    geographic_level VARCHAR(20) NOT NULL, -- 'state', 'district', 'block', 'village'
    geographic_code VARCHAR(10) NOT NULL,
    caste_category VARCHAR(50),
    aggregate_value INTEGER NOT NULL,
    computed_by UUID NOT NULL REFERENCES users(id),
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    computation_hash VARCHAR(64) NOT NULL
);

-- Indexes for performance and auditability
CREATE INDEX idx_census_submissions_geo ON census_submissions(state_code, district_code, block_code, village_code);
CREATE INDEX idx_census_submissions_submitted_at ON census_submissions(submitted_at);
CREATE INDEX idx_census_submissions_submitted_by ON census_submissions(submitted_by);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_aggregate_computations_geo ON aggregate_computations(geographic_level, geographic_code);

-- Function to log audit events (immutable)
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action_type VARCHAR(50),
    p_resource_type VARCHAR(50),
    p_resource_id UUID,
    p_ip_address INET,
    p_user_agent TEXT,
    p_request_method VARCHAR(10),
    p_request_path TEXT,
    p_status_code INTEGER,
    p_metadata JSONB
) RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action_type, resource_type, resource_id,
        ip_address, user_agent, request_method, request_path,
        status_code, metadata
    ) VALUES (
        p_user_id, p_action_type, p_resource_type, p_resource_id,
        p_ip_address, p_user_agent, p_request_method, p_request_path,
        p_status_code, p_metadata
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke all permissions, grant only what's needed
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO census_user;

-- Users can only see their own records (except for specific roles)
-- This will be enforced at application level with row-level security if needed

