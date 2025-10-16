-- ============================================================================
-- TEST SCRIPT FOR COLUMN-LEVEL ENCRYPTION
-- ============================================================================
-- Run this script to test PII encryption functionality
-- ============================================================================

-- 1. Check if pgcrypto extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- 2. Test basic encryption/decryption
SELECT
    'test@example.com' as original,
    encryption.encrypt_pii('test@example.com') as encrypted,
    encryption.decrypt_pii(encryption.encrypt_pii('test@example.com')) as decrypted,
    encryption.hash_pii('test@example.com') as hash;

-- 3. Test phone number encryption
SELECT
    '+1234567890' as original_phone,
    encryption.encrypt_pii('+1234567890') as encrypted_phone,
    encryption.decrypt_pii(encryption.encrypt_pii('+1234567890')) as decrypted_phone,
    encryption.hash_pii('+1234567890') as phone_hash;

-- 4. Check current encryption status
SELECT * FROM encryption.check_encryption_status();

-- 5. Test searching by hashed email
-- First, insert a test user with encrypted data
INSERT INTO public.users (id, external_user_id, email, phone)
VALUES (
    gen_random_uuid(),
    'test_user_' || gen_random_uuid()::text,
    'test.encryption@example.com',
    '+1234567890'
)
ON CONFLICT DO NOTHING;

-- Now search for the user by email
SELECT * FROM public.find_user_by_email('test.encryption@example.com');

-- 6. Test the decrypted view
SELECT
    id,
    email,
    phone,
    email_hash,
    phone_hash
FROM public.users_decrypted
WHERE email_hash = encryption.hash_pii('test.encryption@example.com');

-- 7. Verify that plaintext columns are cleared after encryption
SELECT
    id,
    email as plaintext_email,
    phone as plaintext_phone,
    email_encrypted IS NOT NULL as has_encrypted_email,
    phone_encrypted IS NOT NULL as has_encrypted_phone,
    email_hash IS NOT NULL as has_email_hash,
    phone_hash IS NOT NULL as has_phone_hash
FROM public.users
WHERE email_hash = encryption.hash_pii('test.encryption@example.com');

-- 8. Test NULL handling
SELECT
    encryption.encrypt_pii(NULL) as encrypt_null,
    encryption.decrypt_pii(NULL) as decrypt_null,
    encryption.hash_pii(NULL) as hash_null;

-- 9. Check encryption key references
SELECT * FROM encryption.key_references;

-- 10. Test migration function (dry run - shows what would be encrypted)
SELECT
    COUNT(*) as total_users,
    COUNT(email) as users_with_plaintext_email,
    COUNT(phone) as users_with_plaintext_phone,
    COUNT(email_encrypted) as users_with_encrypted_email,
    COUNT(phone_encrypted) as users_with_encrypted_phone
FROM public.users;

-- 11. Performance test - compare search by hash vs plaintext
EXPLAIN ANALYZE
SELECT * FROM public.users
WHERE email_hash = encryption.hash_pii('test@example.com');

-- 12. Test data integrity after encryption
WITH encryption_test AS (
    SELECT
        'sensitive.data@example.com' as test_email,
        '+9876543210' as test_phone
)
SELECT
    test_email,
    test_phone,
    encryption.decrypt_pii(encryption.encrypt_pii(test_email)) = test_email as email_match,
    encryption.decrypt_pii(encryption.encrypt_pii(test_phone)) = test_phone as phone_match
FROM encryption_test;

-- Expected Results:
-- - All encryption/decryption tests should return matching values
-- - Plaintext columns should be NULL after trigger execution
-- - Hash searches should use indexes efficiently
-- - Decrypted views should show original data
-- - NULL values should be handled gracefully