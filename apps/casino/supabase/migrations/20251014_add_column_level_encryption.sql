-- ============================================================================
-- COLUMN-LEVEL ENCRYPTION FOR PII DATA
-- ============================================================================
-- Purpose: Implement encryption for sensitive personal data (GDPR compliance)
-- Target columns: users.email, users.phone, sms_messages.message_content
-- Method: Using pgcrypto extension with AES-256 encryption
-- ============================================================================

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- STEP 1: CREATE ENCRYPTION KEY MANAGEMENT
-- ============================================================================

-- Create secure schema for encryption functions
CREATE SCHEMA IF NOT EXISTS encryption;

-- Create table to store encryption key references (NOT the actual keys!)
-- Actual keys should be stored in Supabase Vault or environment variables
CREATE TABLE IF NOT EXISTS encryption.key_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name TEXT UNIQUE NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1,
    algorithm TEXT NOT NULL DEFAULT 'aes-256-cbc',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    active BOOLEAN DEFAULT TRUE,
    description TEXT
);

-- Insert reference to the main encryption key
INSERT INTO encryption.key_references (key_name, description)
VALUES ('pii_encryption_key', 'Main key for PII data encryption')
ON CONFLICT (key_name) DO NOTHING;

-- ============================================================================
-- STEP 2: CREATE ENCRYPTION/DECRYPTION FUNCTIONS
-- ============================================================================

-- Function to get encryption key from Supabase Vault
-- Note: You need to store the actual key in Supabase Vault with key 'pii_encryption_key'
CREATE OR REPLACE FUNCTION encryption.get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key TEXT;
BEGIN
    -- In production, retrieve from Supabase Vault:
    -- SELECT decrypted_secret INTO v_key
    -- FROM vault.decrypted_secrets
    -- WHERE name = 'pii_encryption_key';

    -- For initial setup, use a default key (MUST be changed in production!)
    -- This is a placeholder - store actual key in Supabase Vault
    v_key := current_setting('app.encryption_key', true);

    IF v_key IS NULL THEN
        -- Fallback to environment variable or default
        v_key := COALESCE(
            current_setting('app.encryption_key', true),
            'CHANGE_THIS_KEY_IN_PRODUCTION_USE_VAULT_INSTEAD_32CHAR'
        );
    END IF;

    RETURN v_key;
END;
$$;

-- Function to encrypt text data
CREATE OR REPLACE FUNCTION encryption.encrypt_pii(
    p_plaintext TEXT,
    p_key_name TEXT DEFAULT 'pii_encryption_key'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key TEXT;
    v_encrypted BYTEA;
BEGIN
    -- Return NULL if input is NULL
    IF p_plaintext IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get encryption key
    v_key := encryption.get_encryption_key();

    -- Encrypt the data using AES-256
    v_encrypted := pgp_sym_encrypt(
        p_plaintext,
        v_key,
        'compress-algo=1, cipher-algo=aes256'
    );

    -- Return base64 encoded for storage
    RETURN encode(v_encrypted, 'base64');
END;
$$;

-- Function to decrypt text data
CREATE OR REPLACE FUNCTION encryption.decrypt_pii(
    p_ciphertext TEXT,
    p_key_name TEXT DEFAULT 'pii_encryption_key'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key TEXT;
    v_decrypted TEXT;
BEGIN
    -- Return NULL if input is NULL
    IF p_ciphertext IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get encryption key
    v_key := encryption.get_encryption_key();

    -- Decrypt the data
    BEGIN
        v_decrypted := pgp_sym_decrypt(
            decode(p_ciphertext, 'base64'),
            v_key
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Log decryption failure (in production, log to monitoring system)
            RAISE WARNING 'Decryption failed for data: %', LEFT(p_ciphertext, 10) || '...';
            RETURN '[DECRYPTION_FAILED]';
    END;

    RETURN v_decrypted;
END;
$$;

-- Function to hash data for searching (one-way encryption)
CREATE OR REPLACE FUNCTION encryption.hash_pii(
    p_plaintext TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_plaintext IS NULL THEN
        RETURN NULL;
    END IF;

    -- Use SHA-256 for consistent hashing
    RETURN encode(digest(LOWER(TRIM(p_plaintext)), 'sha256'), 'hex');
END;
$$;

-- ============================================================================
-- STEP 3: ADD ENCRYPTED COLUMNS TO TABLES
-- ============================================================================

-- Add encrypted columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_encrypted TEXT,
ADD COLUMN IF NOT EXISTS email_hash TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_hash TEXT;

-- Add indexes for hash columns (for searching)
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON public.users(email_hash);
CREATE INDEX IF NOT EXISTS idx_users_phone_hash ON public.users(phone_hash);

-- Add encrypted columns for auth.users if needed
ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS email_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;

-- For sms_messages table (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'sms_messages'
    ) THEN
        ALTER TABLE public.sms_messages
        ADD COLUMN IF NOT EXISTS message_content_encrypted TEXT,
        ADD COLUMN IF NOT EXISTS phone_number_encrypted TEXT,
        ADD COLUMN IF NOT EXISTS phone_number_hash TEXT;

        CREATE INDEX IF NOT EXISTS idx_sms_messages_phone_hash
        ON public.sms_messages(phone_number_hash);
    END IF;
END $$;

-- For marketing_leads table (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'marketing_leads'
    ) THEN
        ALTER TABLE public.marketing_leads
        ADD COLUMN IF NOT EXISTS phone_number_encrypted TEXT,
        ADD COLUMN IF NOT EXISTS phone_number_hash TEXT,
        ADD COLUMN IF NOT EXISTS email_encrypted TEXT,
        ADD COLUMN IF NOT EXISTS email_hash TEXT;

        CREATE INDEX IF NOT EXISTS idx_marketing_leads_phone_hash
        ON public.marketing_leads(phone_number_hash);
        CREATE INDEX IF NOT EXISTS idx_marketing_leads_email_hash
        ON public.marketing_leads(email_hash);
    END IF;
END $$;

-- ============================================================================
-- STEP 4: CREATE MIGRATION FUNCTIONS
-- ============================================================================

-- Function to migrate existing unencrypted data
CREATE OR REPLACE FUNCTION encryption.migrate_existing_pii_data()
RETURNS TABLE(
    table_name TEXT,
    records_migrated INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Migrate users table
    UPDATE public.users
    SET
        email_encrypted = encryption.encrypt_pii(email),
        email_hash = encryption.hash_pii(email),
        phone_encrypted = encryption.encrypt_pii(phone),
        phone_hash = encryption.hash_pii(phone)
    WHERE email IS NOT NULL OR phone IS NOT NULL
    AND (email_encrypted IS NULL OR phone_encrypted IS NULL);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN QUERY SELECT 'users'::TEXT, v_count;

    -- Migrate sms_messages if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'sms_messages'
    ) THEN
        UPDATE public.sms_messages
        SET
            message_content_encrypted = encryption.encrypt_pii(message_content),
            phone_number_encrypted = encryption.encrypt_pii(phone_number),
            phone_number_hash = encryption.hash_pii(phone_number)
        WHERE (message_content IS NOT NULL OR phone_number IS NOT NULL)
        AND (message_content_encrypted IS NULL OR phone_number_encrypted IS NULL);

        GET DIAGNOSTICS v_count = ROW_COUNT;
        RETURN QUERY SELECT 'sms_messages'::TEXT, v_count;
    END IF;

    -- Migrate marketing_leads if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'marketing_leads'
    ) THEN
        UPDATE public.marketing_leads
        SET
            phone_number_encrypted = encryption.encrypt_pii(phone_number),
            phone_number_hash = encryption.hash_pii(phone_number),
            email_encrypted = encryption.encrypt_pii(email),
            email_hash = encryption.hash_pii(email)
        WHERE (phone_number IS NOT NULL OR email IS NOT NULL)
        AND (phone_number_encrypted IS NULL OR email_encrypted IS NULL);

        GET DIAGNOSTICS v_count = ROW_COUNT;
        RETURN QUERY SELECT 'marketing_leads'::TEXT, v_count;
    END IF;
END;
$$;

-- ============================================================================
-- STEP 5: CREATE SECURE VIEWS FOR DECRYPTED DATA ACCESS
-- ============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.users_decrypted CASCADE;

-- Create secure view for users with decrypted data
CREATE VIEW public.users_decrypted AS
SELECT
    id,
    auth_user_id,
    external_user_id,
    encryption.decrypt_pii(email_encrypted) AS email,
    encryption.decrypt_pii(phone_encrypted) AS phone,
    email_hash,
    phone_hash,
    phone_verified,
    created_at,
    updated_at
FROM public.users;

-- Create view for sms_messages with decrypted data (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'sms_messages'
    ) THEN
        EXECUTE 'CREATE VIEW public.sms_messages_decrypted AS
        SELECT
            id,
            conversation_id,
            encryption.decrypt_pii(phone_number_encrypted) AS phone_number,
            phone_number_hash,
            direction,
            encryption.decrypt_pii(message_content_encrypted) AS message_content,
            status,
            provider,
            provider_message_id,
            created_at,
            updated_at
        FROM public.sms_messages';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: CREATE TRIGGERS FOR AUTOMATIC ENCRYPTION
-- ============================================================================

-- Trigger function to automatically encrypt PII on insert/update
CREATE OR REPLACE FUNCTION encryption.encrypt_pii_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Handle users table
    IF TG_TABLE_NAME = 'users' THEN
        IF NEW.email IS NOT NULL AND NEW.email != '' THEN
            NEW.email_encrypted = encryption.encrypt_pii(NEW.email);
            NEW.email_hash = encryption.hash_pii(NEW.email);
            -- Clear the plaintext field
            NEW.email = NULL;
        END IF;

        IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
            NEW.phone_encrypted = encryption.encrypt_pii(NEW.phone);
            NEW.phone_hash = encryption.hash_pii(NEW.phone);
            -- Clear the plaintext field
            NEW.phone = NULL;
        END IF;
    END IF;

    -- Handle sms_messages table
    IF TG_TABLE_NAME = 'sms_messages' THEN
        IF NEW.message_content IS NOT NULL THEN
            NEW.message_content_encrypted = encryption.encrypt_pii(NEW.message_content);
            NEW.message_content = NULL;
        END IF;

        IF NEW.phone_number IS NOT NULL THEN
            NEW.phone_number_encrypted = encryption.encrypt_pii(NEW.phone_number);
            NEW.phone_number_hash = encryption.hash_pii(NEW.phone_number);
            NEW.phone_number = NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create triggers for automatic encryption
CREATE TRIGGER encrypt_users_pii
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION encryption.encrypt_pii_trigger();

-- Create trigger for sms_messages if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'sms_messages'
    ) THEN
        CREATE TRIGGER encrypt_sms_messages_pii
        BEFORE INSERT OR UPDATE ON public.sms_messages
        FOR EACH ROW
        EXECUTE FUNCTION encryption.encrypt_pii_trigger();
    END IF;
END $$;

-- ============================================================================
-- STEP 7: CREATE SEARCH FUNCTIONS
-- ============================================================================

-- Function to search users by email
CREATE OR REPLACE FUNCTION public.find_user_by_email(
    p_email TEXT
)
RETURNS TABLE(
    id UUID,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        encryption.decrypt_pii(u.email_encrypted) AS email,
        encryption.decrypt_pii(u.phone_encrypted) AS phone,
        u.created_at
    FROM public.users u
    WHERE u.email_hash = encryption.hash_pii(p_email);
END;
$$;

-- Function to search users by phone
CREATE OR REPLACE FUNCTION public.find_user_by_phone(
    p_phone TEXT
)
RETURNS TABLE(
    id UUID,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        encryption.decrypt_pii(u.email_encrypted) AS email,
        encryption.decrypt_pii(u.phone_encrypted) AS phone,
        u.created_at
    FROM public.users u
    WHERE u.phone_hash = encryption.hash_pii(p_phone);
END;
$$;

-- ============================================================================
-- STEP 8: UPDATE RLS POLICIES
-- ============================================================================

-- Update RLS policies for the decrypted views
ALTER VIEW public.users_decrypted OWNER TO postgres;

-- Create RLS policies for decrypted views
CREATE POLICY "Service role can view all decrypted users"
ON public.users
FOR SELECT
USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own decrypted data"
ON public.users
FOR SELECT
USING (auth.uid() = auth_user_id);

-- ============================================================================
-- STEP 9: CREATE KEY ROTATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION encryption.rotate_encryption_key(
    p_old_key TEXT,
    p_new_key TEXT
)
RETURNS TABLE(
    table_name TEXT,
    records_rotated INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_temp_decrypted TEXT;
BEGIN
    -- Rotate keys for users table
    FOR r IN SELECT id, email_encrypted, phone_encrypted FROM public.users
    WHERE email_encrypted IS NOT NULL OR phone_encrypted IS NOT NULL
    LOOP
        -- Decrypt with old key and re-encrypt with new key
        IF r.email_encrypted IS NOT NULL THEN
            v_temp_decrypted := pgp_sym_decrypt(decode(r.email_encrypted, 'base64'), p_old_key);
            UPDATE public.users
            SET email_encrypted = encode(pgp_sym_encrypt(v_temp_decrypted, p_new_key, 'compress-algo=1, cipher-algo=aes256'), 'base64')
            WHERE id = r.id;
        END IF;

        IF r.phone_encrypted IS NOT NULL THEN
            v_temp_decrypted := pgp_sym_decrypt(decode(r.phone_encrypted, 'base64'), p_old_key);
            UPDATE public.users
            SET phone_encrypted = encode(pgp_sym_encrypt(v_temp_decrypted, p_new_key, 'compress-algo=1, cipher-algo=aes256'), 'base64')
            WHERE id = r.id;
        END IF;
    END LOOP;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN QUERY SELECT 'users'::TEXT, v_count;

    -- Update key reference
    UPDATE encryption.key_references
    SET
        key_version = key_version + 1,
        rotated_at = NOW()
    WHERE key_name = 'pii_encryption_key';
END;
$$;

-- ============================================================================
-- STEP 10: CREATE MONITORING FUNCTIONS
-- ============================================================================

-- Function to check encryption status
CREATE OR REPLACE FUNCTION encryption.check_encryption_status()
RETURNS TABLE(
    table_name TEXT,
    total_records BIGINT,
    encrypted_records BIGINT,
    unencrypted_records BIGINT,
    encryption_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        'users'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(CASE WHEN email_encrypted IS NOT NULL OR phone_encrypted IS NOT NULL THEN 1 END)::BIGINT,
        COUNT(CASE WHEN (email IS NOT NULL OR phone IS NOT NULL) AND email_encrypted IS NULL AND phone_encrypted IS NULL THEN 1 END)::BIGINT,
        ROUND(COUNT(CASE WHEN email_encrypted IS NOT NULL OR phone_encrypted IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
    FROM public.users;

    -- Add other tables as needed
END;
$$;

-- ============================================================================
-- STEP 11: GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on encryption schema to service role
GRANT USAGE ON SCHEMA encryption TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA encryption TO service_role;

-- Restrict access to encryption functions
REVOKE ALL ON SCHEMA encryption FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA encryption FROM PUBLIC;

-- Only service_role should decrypt data
GRANT SELECT ON public.users_decrypted TO service_role;

-- ============================================================================
-- STEP 12: MIGRATE EXISTING DATA
-- ============================================================================

-- Run migration for existing data (commented for safety)
-- Uncomment and run after setting up encryption key in Vault:
-- SELECT * FROM encryption.migrate_existing_pii_data();

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON SCHEMA encryption IS 'Schema for PII encryption functions and key management';
COMMENT ON FUNCTION encryption.encrypt_pii IS 'Encrypts PII data using AES-256 encryption';
COMMENT ON FUNCTION encryption.decrypt_pii IS 'Decrypts PII data (restricted access)';
COMMENT ON FUNCTION encryption.hash_pii IS 'Creates searchable hash of PII data';
COMMENT ON VIEW public.users_decrypted IS 'View providing decrypted PII data (restricted access)';

-- ============================================================================
-- IMPORTANT SETUP NOTES
-- ============================================================================
-- 1. Store actual encryption key in Supabase Vault:
--    - Go to Supabase Dashboard > Settings > Vault
--    - Create secret named 'pii_encryption_key'
--    - Use a strong 32-character key
--
-- 2. Update encryption.get_encryption_key() function to retrieve from Vault
--
-- 3. Run encryption.migrate_existing_pii_data() to encrypt existing data
--
-- 4. Update application code to use users_decrypted view or encryption functions
--
-- 5. Implement key rotation schedule (quarterly recommended)
-- ============================================================================