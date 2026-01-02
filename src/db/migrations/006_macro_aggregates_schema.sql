-- ============================================================================
-- Migration 006: Update macro_aggregates schema for Stage B implementation
-- ============================================================================
--
-- RESPONSIBILITY: Align macro_aggregates (L3) schema with trust-first requirements
--
-- CHANGES:
-- 1. Update geographic_level constraint to allow 'state', 'national' only (not 'district')
-- 2. Remove computed_by foreign key (no identity linkage to users)
-- 3. Add aggregation_window_id for time window tracking
-- 4. Rename fields to noisy_* to make clear these are privacy-noised values
-- 5. Remove household_count (not used in current implementation)
-- 6. Remove noise_epsilon (should not be stored - reveals privacy budget)
--
-- RATIONALE:
-- - District level is handled in L2 (micro-aggregates)
-- - L3 contains only state and national level for policy use
-- - No foreign keys linking aggregates to users (separation of powers)
-- - Field names explicitly indicate values are noised (irreversible)
-- - Epsilon should not be stored to prevent privacy budget inference
--
-- ============================================================================

-- ============================================================================
-- PART 1: DROP AND RECREATE macro_aggregates WITH CORRECT SCHEMA
-- ============================================================================

-- Drop existing table (safe since it contains no data in placeholder state)
DROP TABLE IF EXISTS macro_aggregates CASCADE;

-- Create macro_aggregates table (L3) with correct schema
CREATE TABLE macro_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Geographic identification (state or national level ONLY)
    -- District level is in L2, not L3
    geographic_level VARCHAR(20) NOT NULL CHECK (geographic_level IN ('state', 'national')),
    geographic_code VARCHAR(10) NOT NULL,
    
    -- Caste category (fixed categories only)
    caste_category VARCHAR(50) NOT NULL CHECK (caste_category IN ('SC', 'ST', 'OBC', 'GENERAL', 'OTHER')),
    
    -- NOISED aggregated counts (differential privacy applied)
    -- These values have irreversible Laplace noise added
    -- Original values CANNOT be recovered
    noisy_population INTEGER NOT NULL CHECK (noisy_population >= 0),
    noisy_submission_count INTEGER NOT NULL CHECK (noisy_submission_count >= 0),
    
    -- Aggregation window tracking (for idempotent processing)
    aggregation_window_id VARCHAR(32) NOT NULL,
    
    -- Computation metadata
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    computation_hash VARCHAR(64) NOT NULL,
    
    -- IMPORTANT: NO computed_by field - no identity linkage to users
    -- IMPORTANT: NO noise_epsilon field - would reveal privacy budget
    -- IMPORTANT: NO foreign keys to micro_aggregates (L2) - no reverse linkage
    
    -- Unique constraint: one aggregate per geographic area, caste category, and window
    CONSTRAINT unique_macro_aggregate UNIQUE (geographic_level, geographic_code, caste_category, aggregation_window_id)
);

-- ============================================================================
-- PART 2: INDEXES
-- ============================================================================

-- Index for geographic lookups
CREATE INDEX idx_macro_aggregates_geo ON macro_aggregates(geographic_level, geographic_code);

-- Index for window-based queries
CREATE INDEX idx_macro_aggregates_window ON macro_aggregates(aggregation_window_id);

-- Index for caste category queries
CREATE INDEX idx_macro_aggregates_caste ON macro_aggregates(caste_category);

-- Index for time-based queries
CREATE INDEX idx_macro_aggregates_computed_at ON macro_aggregates(computed_at);

-- ============================================================================
-- PART 3: APPEND-ONLY ENFORCEMENT
-- ============================================================================

-- Trigger function to prevent UPDATE and DELETE on macro_aggregates
CREATE OR REPLACE FUNCTION prevent_macro_aggregate_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'macro_aggregates is append-only. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent UPDATE
CREATE TRIGGER macro_aggregates_prevent_update
    BEFORE UPDATE ON macro_aggregates
    FOR EACH ROW
    EXECUTE FUNCTION prevent_macro_aggregate_modification();

-- Trigger to prevent DELETE
CREATE TRIGGER macro_aggregates_prevent_delete
    BEFORE DELETE ON macro_aggregates
    FOR EACH ROW
    EXECUTE FUNCTION prevent_macro_aggregate_modification();

-- ============================================================================
-- PART 4: PERMISSIONS
-- ============================================================================

-- aggregation_worker can INSERT (required for Stage B)
GRANT INSERT ON macro_aggregates TO aggregation_worker;

-- aggregation_worker can SELECT (for verification purposes)
GRANT SELECT ON macro_aggregates TO aggregation_worker;

-- analytics_reader can SELECT (for CentralPolicyViewer to read pre-computed aggregates)
GRANT SELECT ON macro_aggregates TO analytics_reader;

-- api_writer CANNOT access macro_aggregates
-- (no explicit REVOKE needed, permissions are not granted by default)

-- audit_writer CANNOT access macro_aggregates
-- (no explicit REVOKE needed, permissions are not granted by default)

-- ============================================================================
-- PART 5: COMMENTS
-- ============================================================================

COMMENT ON TABLE macro_aggregates IS 'L3: Privacy-noised macro-aggregates. State and national level only. Values have irreversible differential privacy noise.';
COMMENT ON COLUMN macro_aggregates.geographic_level IS 'Geographic aggregation level. Only state and national are permitted.';
COMMENT ON COLUMN macro_aggregates.geographic_code IS 'Geographic area code (state code or NATIONAL).';
COMMENT ON COLUMN macro_aggregates.caste_category IS 'Caste category (SC, ST, OBC, GENERAL, OTHER).';
COMMENT ON COLUMN macro_aggregates.noisy_population IS 'Population count WITH differential privacy noise. Original value is UNRECOVERABLE.';
COMMENT ON COLUMN macro_aggregates.noisy_submission_count IS 'Submission count WITH differential privacy noise. Original value is UNRECOVERABLE.';
COMMENT ON COLUMN macro_aggregates.aggregation_window_id IS 'Identifies the time window that produced this aggregate.';
COMMENT ON COLUMN macro_aggregates.computed_at IS 'Timestamp when this aggregate was computed.';
COMMENT ON COLUMN macro_aggregates.computation_hash IS 'SHA-256 hash for integrity verification (uses noised values).';

-- ============================================================================
-- END OF MIGRATION 006
-- ============================================================================

