-- Script to audit naming conventions in the database
-- Finds columns and tables that don't follow snake_case convention

-- Check for columns with camelCase or inconsistent naming
SELECT
    table_name,
    column_name,
    data_type,
    CASE
        WHEN column_name ~ '[A-Z]' THEN 'Contains uppercase (possibly camelCase)'
        WHEN column_name NOT LIKE '%_%' AND LENGTH(column_name) > 8 THEN 'Missing underscores'
        WHEN column_name LIKE 'is%' AND column_name NOT LIKE 'is_%' THEN 'Boolean without underscore'
        WHEN column_name LIKE '%Id' THEN 'ID suffix should be _id'
        WHEN column_name LIKE '%At' AND column_name NOT LIKE '%_at' THEN 'Timestamp suffix should be _at'
        ELSE 'OK'
    END as naming_issue
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    column_name ~ '[A-Z]' -- Contains uppercase letters
    OR column_name LIKE '%Id' -- Ends with Id instead of _id
    OR column_name LIKE '%At' -- Ends with At instead of _at
    OR (column_name LIKE 'is%' AND column_name NOT LIKE 'is_%') -- Boolean without underscore
    OR (column_name LIKE 'has%' AND column_name NOT LIKE 'has_%') -- Boolean without underscore
)
ORDER BY table_name, column_name;

-- Check for foreign keys with inconsistent naming
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    CASE
        WHEN kcu.column_name NOT LIKE '%_id' THEN 'Foreign key should end with _id'
        WHEN kcu.column_name ~ '[A-Z]' THEN 'Contains uppercase'
        ELSE 'OK'
    END as naming_issue
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND (
    kcu.column_name NOT LIKE '%_id'
    OR kcu.column_name ~ '[A-Z]'
);