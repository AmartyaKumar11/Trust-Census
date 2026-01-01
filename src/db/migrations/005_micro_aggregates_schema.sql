-- ============================================================================
-- Migration 005: Update micro_aggregates schema for Stage A implementation
-- ============================================================================
--
-- RESPONSIBILITY: Align micro_aggregates (L2) schema with trust-first requirements
--
-- CHANGES:
-- 1. Update geographic_level constraint to allow 'district', 'state' (not 'block', 'village')
-- 2. Remove computed_by foreign key (no identity linkage to users)
-- 3. Add aggregation_window_id for time window tracking
-- 4. Remove household_count (not used in current implementation)
-- 5. Rename population_count to total_population for clarity
--
-- RATIONALE:
-- - Village/block level aggregation is FORBIDDEN (too granular, risks identification)
-- - No foreign keys linking aggregates to users (separation of powers)
-- - Aggregation window ID enables idempotent processing
--
-- ============================================================================

-- ============================================================================
-- PART 1: DROP AND RECREATE micro_aggregates WITH CORRECT SCHEMA
-- ============================================================================

-- Drop existing table (safe since it contains no data in placeholder state)
DROP TABLE IF EXISTS micro_aggregates CASCADE;

-- Create micro_aggregates table (L2) with correct schema
CREATE TABLE micro_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Geographic identification (district or state level ONLY)
    -- Village and block level is FORBIDDEN
    geographic_level VARCHAR(20) NOT NULL CHECK (geographic_level IN ('district', 'state')),
    geographic_code VARCHAR(10) NOT NULL,
    
    -- Caste category (fixed categories only)
    caste_category VARCHAR(50) NOT NULL CHECK (caste_category IN ('SC', 'ST', 'OBC', 'GENERAL', 'OTHER')),
    
    -- Aggregated counts
    submission_count INTEGER NOT NULL CHECK (submission_count >= 0),
    population_count INTEGER NOT NULL CHECK (population_count >= 0),
    
    -- Suppression status (groups below k are DROPPED, not written with is_suppressed=true)
    -- This field exists for future use but should always be false for written records
    is_suppressed BOOLEAN NOT NULL DEFAULT false,
    
    -- Aggregation window tracking (for idempotent processing)
    aggregation_window_id VARCHAR(32) NOT NULL,
    
    -- Computation metadata
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    computation_hash VARCHAR(64) NOT NULL,
    
    -- IMPORTANT: NO computed_by field - no identity linkage to users
    -- IMPORTANT: NO foreign keys to census_submissions (L1) - no reverse linkage
    
    -- Unique constraint: one aggregate per geographic area, caste category, and window
    CONSTRAINT unique_micro_aggregate UNIQUE (geographic_level, geographic_code, caste_category, aggregation_window_id)
);

-- ============================================================================
-- PART 2: INDEXES
-- ============================================================================

-- Index for geographic lookups
CREATE INDEX idx_micro_aggregates_geo ON micro_aggregates(geographic_level, geographic_code);

-- Index for window-based queries
CREATE INDEX idx_micro_aggregates_window ON micro_aggregates(aggregation_window_id);

-- Index for caste category queries
CREATE INDEX idx_micro_aggregates_caste ON micro_aggregates(caste_category);

-- Index for time-based queries
CREATE INDEX idx_micro_aggregates_computed_at ON micro_aggregates(computed_at);

-- ============================================================================
-- PART 3: APPEND-ONLY ENFORCEMENT
-- ============================================================================

-- Trigger function to prevent UPDATE and DELETE on micro_aggregates
CREATE OR REPLACE FUNCTION prevent_micro_aggregate_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'micro_aggregates is append-only. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent UPDATE
CREATE TRIGGER micro_aggregates_prevent_update
    BEFORE UPDATE ON micro_aggregates
    FOR EACH ROW
    EXECUTE FUNCTION prevent_micro_aggregate_modification();

-- Trigger to prevent DELETE
CREATE TRIGGER micro_aggregates_prevent_delete
    BEFORE DELETE ON micro_aggregates
    FOR EACH ROW
    EXECUTE FUNCTION prevent_micro_aggregate_modification();

-- ============================================================================
-- PART 4: PERMISSIONS
-- ============================================================================

-- aggregation_worker can INSERT (required for Stage A)
GRANT INSERT ON micro_aggregates TO aggregation_worker;

-- aggregation_worker can SELECT (required for Stage B to read L2)
GRANT SELECT ON micro_aggregates TO aggregation_worker;

-- analytics_reader can SELECT (for StateAnalyst to read pre-computed aggregates)
GRANT SELECT ON micro_aggregates TO analytics_reader;

-- api_writer CANNOT access micro_aggregates
-- (no explicit REVOKE needed, permissions are not granted by default)

-- audit_writer CANNOT access micro_aggregates
-- (no explicit REVOKE needed, permissions are not granted by default)

-- ============================================================================
-- PART 5: COMMENTS
-- ============================================================================

COMMENT ON TABLE micro_aggregates IS 'L2: Threshold-protected micro-aggregates. District and state level only. Village/block level is forbidden.';
COMMENT ON COLUMN micro_aggregates.geographic_level IS 'Geographic aggregation level. Only district and state are permitted.';
COMMENT ON COLUMN micro_aggregates.geographic_code IS 'Geographic area code (district or state code).';
COMMENT ON COLUMN micro_aggregates.caste_category IS 'Caste category (SC, ST, OBC, GENERAL, OTHER).';
COMMENT ON COLUMN micro_aggregates.submission_count IS 'Number of census submissions in this group. Must be >= k for k-anonymity.';
COMMENT ON COLUMN micro_aggregates.population_count IS 'Total population count for this group.';
COMMENT ON COLUMN micro_aggregates.is_suppressed IS 'Suppression flag. Should always be false - suppressed groups are dropped, not written.';
COMMENT ON COLUMN micro_aggregates.aggregation_window_id IS 'Identifies the time window that produced this aggregate.';
COMMENT ON COLUMN micro_aggregates.computed_at IS 'Timestamp when this aggregate was computed.';
COMMENT ON COLUMN micro_aggregates.computation_hash IS 'SHA-256 hash for integrity verification.';

-- ============================================================================
-- END OF MIGRATION 005
-- ============================================================================

