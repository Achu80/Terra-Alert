-- Fix foreign key constraint in risk_history table
-- This allows storing predictions for any location, not just pre-defined districts

-- Step 1: Drop the foreign key constraint
ALTER TABLE risk_history 
DROP CONSTRAINT IF EXISTS risk_history_district_id_fkey;

-- Step 2: Verify the constraint is removed
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname LIKE '%risk_history%';

-- Success message
SELECT 'Foreign key constraint removed successfully!' AS status;
