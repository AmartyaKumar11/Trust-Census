-- Migration: Update village_code to support free-text village/ward names
-- 
-- REASON: Changed from 10-digit numeric codes to human-readable names
-- IMPACT: Allows enumerators to enter village/ward names like "Wagholi", "Ward 12"
-- TRUST-FIRST: Village names are opaque reference data, not used for aggregation

-- Update census_submissions table
ALTER TABLE census_submissions 
  ALTER COLUMN village_code TYPE VARCHAR(200);

-- Update consent_records table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consent_records' 
    AND column_name = 'village_code'
  ) THEN
    ALTER TABLE consent_records 
      ALTER COLUMN village_code TYPE VARCHAR(200);
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN census_submissions.village_code IS 
  'Free-text village or ward name for reference only. Not used for aggregation or policy analysis. Maximum 200 characters.';
