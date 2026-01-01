-- Migration: User Scope Assignments
-- 
-- RESPONSIBILITY: Store immutable scope assignments for each user
-- 
-- This migration adds scope assignment tables that define:
-- - Geographic scope (which areas a user can access)
-- - Functional scope (what operations a user can perform)
--
-- Scope assignments are:
-- - Immutable after creation (no UPDATE allowed)
-- - Explicitly assigned (no wildcards)
-- - Non-escalatable (cannot be expanded via request)
--
-- MUST:
-- - Store geographic scope per user
-- - Store functional scope per user
-- - Prevent wildcard scopes
-- - Prevent scope escalation
--
-- MUST NEVER:
-- - Allow wildcard scope values
-- - Allow scope modification after creation
-- - Allow scope combination beyond hierarchy

-- ============================================================================
-- PART 1: GEOGRAPHIC SCOPE TYPES
-- ============================================================================

-- Geographic level enumeration
CREATE TYPE geographic_level AS ENUM (
    'NATIONAL',
    'STATE',
    'DISTRICT',
    'BLOCK',
    'VILLAGE'
);

-- Functional scope enumeration
CREATE TYPE functional_scope AS ENUM (
    'SUBMISSION',
    'OVERSIGHT',
    'ANALYSIS',
    'POLICY_VIEW',
    'CONSENT'
);

-- ============================================================================
-- PART 2: USER SCOPE ASSIGNMENTS TABLE
-- ============================================================================

-- User scope assignments (immutable after creation)
CREATE TABLE IF NOT EXISTS user_scope_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Functional scope (exactly one per user)
    functional_scope functional_scope NOT NULL,
    
    -- Primary geographic level
    geographic_level geographic_level NOT NULL,
    
    -- Primary geographic code (e.g., state code, district code)
    geographic_code VARCHAR(20) NOT NULL,
    
    -- Assignment metadata
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    
    -- Prevent duplicate assignments
    CONSTRAINT unique_user_scope UNIQUE (user_id),
    
    -- Prevent wildcard scopes
    CONSTRAINT no_wildcard_scope CHECK (
        geographic_code NOT IN ('*', 'ALL', 'ANY', 'WILDCARD', 'GLOBAL', 'UNIVERSAL')
    ),
    
    -- Validate geographic code format based on level
    CONSTRAINT valid_geographic_code CHECK (
        (geographic_level = 'NATIONAL' AND geographic_code = 'IN') OR
        (geographic_level = 'STATE' AND geographic_code ~ '^[A-Z]{2}$') OR
        (geographic_level = 'DISTRICT' AND geographic_code ~ '^[0-9]{4}$') OR
        (geographic_level = 'BLOCK' AND geographic_code ~ '^[0-9]{6}$') OR
        (geographic_level = 'VILLAGE' AND geographic_code ~ '^[0-9]{10}$')
    )
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_scope_user_id ON user_scope_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scope_geographic ON user_scope_assignments(geographic_level, geographic_code);

-- ============================================================================
-- PART 3: ADDITIONAL GEOGRAPHIC CODES TABLE
-- ============================================================================

-- Additional geographic codes for users with multi-area assignments
-- (e.g., an enumerator assigned to multiple villages)
CREATE TABLE IF NOT EXISTS user_additional_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope_assignment_id UUID NOT NULL REFERENCES user_scope_assignments(id) ON DELETE CASCADE,
    
    -- Additional geographic code
    geographic_level geographic_level NOT NULL,
    geographic_code VARCHAR(20) NOT NULL,
    
    -- Assignment metadata
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate codes
    CONSTRAINT unique_additional_scope UNIQUE (user_id, geographic_level, geographic_code),
    
    -- Prevent wildcard scopes
    CONSTRAINT no_wildcard_additional CHECK (
        geographic_code NOT IN ('*', 'ALL', 'ANY', 'WILDCARD', 'GLOBAL', 'UNIVERSAL')
    )
);

-- Index for scope lookups
CREATE INDEX IF NOT EXISTS idx_additional_scope_user ON user_additional_scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_additional_scope_code ON user_additional_scopes(geographic_code);

-- ============================================================================
-- PART 4: PREVENT SCOPE MODIFICATION (IMMUTABLE)
-- ============================================================================

-- Prevent UPDATE on user_scope_assignments
CREATE OR REPLACE FUNCTION prevent_scope_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Scope assignments are immutable. UPDATE operations are not permitted. Create a new assignment instead.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_scope_update ON user_scope_assignments;
CREATE TRIGGER trigger_prevent_scope_update
    BEFORE UPDATE ON user_scope_assignments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_scope_modification();

-- Prevent UPDATE on user_additional_scopes
DROP TRIGGER IF EXISTS trigger_prevent_additional_scope_update ON user_additional_scopes;
CREATE TRIGGER trigger_prevent_additional_scope_update
    BEFORE UPDATE ON user_additional_scopes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_scope_modification();

-- ============================================================================
-- PART 5: VIEW FOR COMPLETE USER SCOPE
-- ============================================================================

-- View to get complete user scope with all assigned codes
CREATE OR REPLACE VIEW user_complete_scope AS
SELECT 
    u.id AS user_id,
    u.username,
    u.role,
    usa.functional_scope,
    usa.geographic_level AS primary_level,
    usa.geographic_code AS primary_code,
    ARRAY_AGG(DISTINCT uas.geographic_code) FILTER (WHERE uas.geographic_code IS NOT NULL) AS additional_codes,
    usa.assigned_at
FROM users u
LEFT JOIN user_scope_assignments usa ON u.id = usa.user_id
LEFT JOIN user_additional_scopes uas ON u.id = uas.user_id
GROUP BY u.id, u.username, u.role, usa.functional_scope, usa.geographic_level, usa.geographic_code, usa.assigned_at;

-- ============================================================================
-- PART 6: FUNCTION TO CHECK SCOPE
-- ============================================================================

-- Function to check if a user has access to a geographic code
CREATE OR REPLACE FUNCTION check_user_geographic_scope(
    p_user_id UUID,
    p_requested_level geographic_level,
    p_requested_code VARCHAR(20)
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_level geographic_level;
    v_user_code VARCHAR(20);
    v_has_additional BOOLEAN;
BEGIN
    -- Check for wildcard (always deny)
    IF p_requested_code IN ('*', 'ALL', 'ANY', 'WILDCARD', 'GLOBAL', 'UNIVERSAL') THEN
        RETURN FALSE;
    END IF;

    -- Get user's primary scope
    SELECT geographic_level, geographic_code 
    INTO v_user_level, v_user_code
    FROM user_scope_assignments
    WHERE user_id = p_user_id;
    
    IF v_user_level IS NULL THEN
        RETURN FALSE; -- No scope assigned
    END IF;
    
    -- National level can access everything
    IF v_user_level = 'NATIONAL' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if requested code matches primary code
    IF p_requested_level = v_user_level AND p_requested_code = v_user_code THEN
        RETURN TRUE;
    END IF;
    
    -- Check additional scopes
    SELECT EXISTS (
        SELECT 1 FROM user_additional_scopes
        WHERE user_id = p_user_id
        AND geographic_level = p_requested_level
        AND geographic_code = p_requested_code
    ) INTO v_has_additional;
    
    RETURN v_has_additional;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 7: GRANT PERMISSIONS
-- ============================================================================

-- API writer needs to check scope but not modify
GRANT SELECT ON user_scope_assignments TO api_writer;
GRANT SELECT ON user_additional_scopes TO api_writer;
GRANT SELECT ON user_complete_scope TO api_writer;
GRANT EXECUTE ON FUNCTION check_user_geographic_scope TO api_writer;

-- Supervisor can view scope assignments
GRANT SELECT ON user_scope_assignments TO supervisor_reader;
GRANT SELECT ON user_additional_scopes TO supervisor_reader;
GRANT SELECT ON user_complete_scope TO supervisor_reader;

-- Analytics reader needs scope for filtering
GRANT SELECT ON user_scope_assignments TO analytics_reader;
GRANT EXECUTE ON FUNCTION check_user_geographic_scope TO analytics_reader;

-- ============================================================================
-- PART 8: DOCUMENT SCOPE RULES
-- ============================================================================

COMMENT ON TABLE user_scope_assignments IS 
'Immutable scope assignments for users.
Each user has exactly one scope assignment defining:
- Functional scope (what they can do)
- Geographic scope (where they can do it)
Scope assignments cannot be modified after creation.';

COMMENT ON TABLE user_additional_scopes IS 
'Additional geographic codes for users with multi-area assignments.
For example, an enumerator assigned to multiple villages.
These are also immutable after creation.';

COMMENT ON FUNCTION check_user_geographic_scope IS 
'Check if a user has access to a specific geographic code.
Returns TRUE if the user can access the requested area.
Always returns FALSE for wildcard patterns.';

