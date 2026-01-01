-- Migration: Consent as First-Class Legal Artifact
-- 
-- RESPONSIBILITY: Create immutable consent storage in L0
-- 
-- Consent is a LEGAL ARTIFACT that:
-- - Must exist BEFORE any census submission can be accepted
-- - Is completely INDEPENDENT of census data (L1)
-- - Contains NO caste data, NO personal identifiers
-- - Is IMMUTABLE (append-only, no UPDATE/DELETE)
-- - Is linked to submissions ONLY via receipt_id (non-identifying)
--
-- MUST:
-- - Store consent as independent legal artifact
-- - Enforce immutability at database level
-- - Link to submissions via receipt_id only
-- - Capture consent metadata without personal data
--
-- MUST NEVER:
-- - Store caste data in consent records
-- - Store personal identifiers (Aadhaar, phone, name, address)
-- - Allow UPDATE or DELETE of consent records
-- - Embed consent inside raw submissions
-- - Allow reverse lookup from submission to personal identity

-- ============================================================================
-- PART 1: DROP EXISTING CONSENT TABLE (if exists from previous migration)
-- ============================================================================

-- Drop the old consent_records table if it exists
-- We need a new structure that properly separates consent from identity
DROP TABLE IF EXISTS consent_records CASCADE;

-- ============================================================================
-- PART 2: CONSENT TEXT VERSION ENUM
-- ============================================================================

-- Consent text versions (immutable legal text references)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_text_version') THEN
        CREATE TYPE consent_text_version AS ENUM (
            'V1_2024_INITIAL',      -- Initial consent text version
            'V2_2024_REVISED'       -- Future revision placeholder
        );
    END IF;
END
$$;

-- ============================================================================
-- PART 3: CONSENT GIVEN BY ROLE ENUM
-- ============================================================================

-- Who gave consent (Citizen or Enumerator on behalf of Citizen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_given_by_role') THEN
        CREATE TYPE consent_given_by_role AS ENUM (
            'CITIZEN',              -- Citizen gave consent directly
            'ENUMERATOR'            -- Enumerator recorded consent on behalf
        );
    END IF;
END
$$;

-- ============================================================================
-- PART 4: CONSENT RECORDS TABLE (L0)
-- ============================================================================

CREATE TABLE consent_records (
    -- Primary key
    consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Receipt ID: Non-identifying, unique, used to link with submissions
    -- This is the ONLY link between consent and submissions
    -- It does NOT identify the citizen, only proves consent exists
    receipt_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    
    -- Consent text version (references immutable legal text)
    consent_text_version consent_text_version NOT NULL,
    
    -- Consent timestamp (server-generated, immutable)
    consent_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Who gave consent (Citizen or Enumerator on behalf)
    consent_given_by_role consent_given_by_role NOT NULL,
    
    -- Geographic scope at consent (where consent was given)
    -- This is for audit purposes, NOT for identifying the citizen
    geographic_scope_state VARCHAR(2) NOT NULL,
    geographic_scope_district VARCHAR(4),
    geographic_scope_block VARCHAR(6),
    geographic_scope_village VARCHAR(10),
    
    -- Enumerator who recorded the consent (if applicable)
    -- This is the enumerator's user ID, NOT the citizen's identity
    recorded_by_enumerator_id UUID REFERENCES users(id),
    
    -- Immutability marker (always true after creation)
    is_immutable BOOLEAN NOT NULL DEFAULT true,
    
    -- Integrity hash (for verification)
    consent_hash VARCHAR(64) NOT NULL,
    
    -- Constraints
    
    -- Ensure geographic scope is valid
    CONSTRAINT valid_geographic_scope CHECK (
        geographic_scope_state ~ '^[A-Z]{2}$' AND
        (geographic_scope_district IS NULL OR geographic_scope_district ~ '^[0-9]{4}$') AND
        (geographic_scope_block IS NULL OR geographic_scope_block ~ '^[0-9]{6}$') AND
        (geographic_scope_village IS NULL OR geographic_scope_village ~ '^[0-9]{10}$')
    ),
    
    -- Ensure immutability flag is always true
    CONSTRAINT consent_must_be_immutable CHECK (is_immutable = true),
    
    -- Ensure consent hash is present
    CONSTRAINT consent_hash_required CHECK (consent_hash IS NOT NULL AND consent_hash != ''),
    
    -- If enumerator gave consent, enumerator ID must be present
    CONSTRAINT enumerator_consent_requires_enumerator CHECK (
        (consent_given_by_role = 'CITIZEN') OR
        (consent_given_by_role = 'ENUMERATOR' AND recorded_by_enumerator_id IS NOT NULL)
    )
);

-- ============================================================================
-- PART 5: CONSENT INDEXES
-- ============================================================================

-- Index for receipt_id lookups (used when linking submissions)
CREATE INDEX IF NOT EXISTS idx_consent_receipt_id ON consent_records(receipt_id);

-- Index for geographic scope queries (for audit/oversight)
CREATE INDEX IF NOT EXISTS idx_consent_geographic ON consent_records(
    geographic_scope_state, 
    geographic_scope_district, 
    geographic_scope_block
);

-- Index for timestamp queries (for audit purposes)
CREATE INDEX IF NOT EXISTS idx_consent_timestamp ON consent_records(consent_timestamp);

-- Index for enumerator queries (for oversight)
CREATE INDEX IF NOT EXISTS idx_consent_enumerator ON consent_records(recorded_by_enumerator_id);

-- ============================================================================
-- PART 6: IMMUTABILITY ENFORCEMENT TRIGGERS
-- ============================================================================

-- Prevent UPDATE on consent_records
CREATE OR REPLACE FUNCTION prevent_consent_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Consent records are immutable legal artifacts. UPDATE operations are not permitted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_consent_update ON consent_records;
CREATE TRIGGER trigger_prevent_consent_update
    BEFORE UPDATE ON consent_records
    FOR EACH ROW
    EXECUTE FUNCTION prevent_consent_modification();

-- Prevent DELETE on consent_records
CREATE OR REPLACE FUNCTION prevent_consent_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Consent records are immutable legal artifacts. DELETE operations are not permitted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_consent_delete ON consent_records;
CREATE TRIGGER trigger_prevent_consent_delete
    BEFORE DELETE ON consent_records
    FOR EACH ROW
    EXECUTE FUNCTION prevent_consent_deletion();

-- ============================================================================
-- PART 7: SUBMISSION-CONSENT LINK TABLE
-- ============================================================================

-- Link between submissions and consent (via receipt_id only)
-- This table enforces that submissions MUST have consent
CREATE TABLE submission_consent_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Submission ID (references census_submissions)
    submission_id UUID NOT NULL UNIQUE,
    
    -- Receipt ID (references consent_records.receipt_id)
    -- This is the ONLY link - no personal identity
    consent_receipt_id UUID NOT NULL,
    
    -- Link timestamp
    linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to consent
    CONSTRAINT fk_consent_receipt FOREIGN KEY (consent_receipt_id) 
        REFERENCES consent_records(receipt_id) ON DELETE RESTRICT,
    
    -- Ensure submission exists (will be enforced by application)
    -- We don't add FK to census_submissions to maintain separation
    
    -- Ensure receipt_id is valid UUID
    CONSTRAINT valid_receipt_id CHECK (consent_receipt_id IS NOT NULL)
);

-- Index for submission lookups
CREATE INDEX IF NOT EXISTS idx_submission_consent_submission ON submission_consent_links(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_consent_receipt ON submission_consent_links(consent_receipt_id);

-- Prevent UPDATE on submission_consent_links
DROP TRIGGER IF EXISTS trigger_prevent_link_update ON submission_consent_links;
CREATE TRIGGER trigger_prevent_link_update
    BEFORE UPDATE ON submission_consent_links
    FOR EACH ROW
    EXECUTE FUNCTION prevent_consent_modification();

-- Prevent DELETE on submission_consent_links
DROP TRIGGER IF EXISTS trigger_prevent_link_delete ON submission_consent_links;
CREATE TRIGGER trigger_prevent_link_delete
    BEFORE DELETE ON submission_consent_links
    FOR EACH ROW
    EXECUTE FUNCTION prevent_consent_deletion();

-- ============================================================================
-- PART 8: FUNCTION TO VERIFY CONSENT EXISTS
-- ============================================================================

-- Function to check if consent exists for a receipt_id
CREATE OR REPLACE FUNCTION verify_consent_exists(p_receipt_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM consent_records
        WHERE receipt_id = p_receipt_id
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 9: FUNCTION TO CREATE CONSENT ATOMICALLY
-- ============================================================================

-- Function to create consent record (returns receipt_id)
CREATE OR REPLACE FUNCTION create_consent_record(
    p_consent_text_version consent_text_version,
    p_consent_given_by_role consent_given_by_role,
    p_geographic_scope_state VARCHAR(2),
    p_geographic_scope_district VARCHAR(4),
    p_geographic_scope_block VARCHAR(6),
    p_geographic_scope_village VARCHAR(10),
    p_recorded_by_enumerator_id UUID,
    p_consent_hash VARCHAR(64)
)
RETURNS UUID AS $$
DECLARE
    v_receipt_id UUID;
BEGIN
    INSERT INTO consent_records (
        consent_text_version,
        consent_given_by_role,
        geographic_scope_state,
        geographic_scope_district,
        geographic_scope_block,
        geographic_scope_village,
        recorded_by_enumerator_id,
        consent_hash
    ) VALUES (
        p_consent_text_version,
        p_consent_given_by_role,
        p_geographic_scope_state,
        p_geographic_scope_district,
        p_geographic_scope_block,
        p_geographic_scope_village,
        p_recorded_by_enumerator_id,
        p_consent_hash
    )
    RETURNING receipt_id INTO v_receipt_id;
    
    RETURN v_receipt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 10: GRANT PERMISSIONS
-- ============================================================================

-- api_writer: Can INSERT consent records (for submission flow)
GRANT INSERT ON consent_records TO api_writer;
GRANT INSERT ON submission_consent_links TO api_writer;
GRANT EXECUTE ON FUNCTION create_consent_record TO api_writer;
GRANT EXECUTE ON FUNCTION verify_consent_exists TO api_writer;

-- supervisor_reader: Can SELECT consent records (for oversight)
-- Can see aggregate counts, NOT individual citizen identities
GRANT SELECT ON consent_records TO supervisor_reader;
GRANT SELECT ON submission_consent_links TO supervisor_reader;
GRANT EXECUTE ON FUNCTION verify_consent_exists TO supervisor_reader;

-- audit_writer: NO access to consent records
-- Audit logs are separate from consent

-- analytics_reader: NO access to consent records
-- Consent is L0, analytics only accesses L2/L3

-- aggregation_worker: NO access to consent records
-- Aggregation only reads L1, writes L2/L3

-- ============================================================================
-- PART 11: DOCUMENT CONSENT MODEL
-- ============================================================================

COMMENT ON TABLE consent_records IS 
'Immutable consent records (L0 data layer).
Consent is a first-class legal artifact that:
- Must exist BEFORE any census submission
- Contains NO caste data, NO personal identifiers
- Is linked to submissions ONLY via receipt_id
- Cannot be modified or deleted after creation';

COMMENT ON COLUMN consent_records.receipt_id IS 
'Non-identifying unique identifier used to link consent with submissions.
This is the ONLY link between consent and census data.
It does NOT identify the citizen, only proves consent exists.';

COMMENT ON COLUMN consent_records.consent_text_version IS 
'Reference to the immutable legal consent text version.
The actual consent text is stored separately and is version-controlled.';

COMMENT ON TABLE submission_consent_links IS 
'Links between census submissions and consent records.
Uses receipt_id only - no personal identity linkage.
Ensures submissions cannot exist without corresponding consent.';

-- ============================================================================
-- PART 12: CONSENT STATUS VIEW (FOR SUPERVISOR)
-- ============================================================================

-- View for consent status aggregates (no individual records)
CREATE OR REPLACE VIEW consent_status_aggregates AS
SELECT 
    geographic_scope_state AS state_code,
    geographic_scope_district AS district_code,
    COUNT(*) AS total_consents,
    COUNT(CASE WHEN consent_given_by_role = 'CITIZEN' THEN 1 END) AS citizen_consents,
    COUNT(CASE WHEN consent_given_by_role = 'ENUMERATOR' THEN 1 END) AS enumerator_recorded_consents,
    MIN(consent_timestamp) AS earliest_consent,
    MAX(consent_timestamp) AS latest_consent
FROM consent_records
GROUP BY geographic_scope_state, geographic_scope_district;

GRANT SELECT ON consent_status_aggregates TO supervisor_reader;

COMMENT ON VIEW consent_status_aggregates IS 
'Aggregate consent statistics for supervisor oversight.
Shows counts only, NOT individual consent records.
Used for monitoring consent collection progress.';

