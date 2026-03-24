-- Remove Waitlist and anything related to it
DROP TABLE IF EXISTS waitlist_entries CASCADE;

-- Also remove the waitlist_id column from approved_users if it exists
ALTER TABLE IF EXISTS approved_users DROP COLUMN IF EXISTS waitlist_id;
