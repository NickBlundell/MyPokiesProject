-- Phase 2: Support Ticket Attachments
-- Migration Date: 2025-01-14
-- Purpose: Track file attachments for support tickets

-- ============================================================================
-- PART 1: Support Ticket Attachments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Can be player or admin
    uploaded_by_type VARCHAR(20) NOT NULL CHECK (
        uploaded_by_type IN ('player', 'admin')
    ),

    -- File details
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL, -- Size in bytes
    file_type VARCHAR(100) NOT NULL, -- MIME type
    file_extension VARCHAR(10),

    -- Storage
    storage_path TEXT NOT NULL, -- Path in Supabase Storage or S3
    storage_bucket VARCHAR(100) DEFAULT 'support-attachments',

    -- Metadata
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,

    -- Security
    virus_scanned BOOLEAN DEFAULT FALSE,
    virus_scan_result VARCHAR(50), -- 'clean', 'infected', 'pending'
    virus_scan_at TIMESTAMPTZ,

    -- Access tracking
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete
    deleted_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_support_attachments_ticket ON support_ticket_attachments(ticket_id);
CREATE INDEX idx_support_attachments_uploader ON support_ticket_attachments(uploaded_by);
CREATE INDEX idx_support_attachments_created ON support_ticket_attachments(created_at DESC);
CREATE INDEX idx_support_attachments_active ON support_ticket_attachments(ticket_id, created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_support_attachments_pending_scan ON support_ticket_attachments(created_at)
    WHERE virus_scan_result = 'pending' OR virus_scan_result IS NULL;

-- ============================================================================
-- PART 2: Row Level Security
-- ============================================================================

ALTER TABLE support_ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Admin users can view all attachments
CREATE POLICY "Admin users can view all attachments"
    ON support_ticket_attachments FOR SELECT
    USING (true);

-- Players can view their own ticket attachments
CREATE POLICY "Players can view own ticket attachments"
    ON support_ticket_attachments FOR SELECT
    USING (
        uploaded_by = auth.uid()
        OR ticket_id IN (
            SELECT id FROM support_tickets WHERE player_id = auth.uid()
        )
    );

-- Service role can manage all
CREATE POLICY "Service role can manage attachments"
    ON support_ticket_attachments FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- PART 3: Constraints
-- ============================================================================

-- Ensure file size is reasonable (max 50MB)
ALTER TABLE support_ticket_attachments
ADD CONSTRAINT check_file_size_reasonable
CHECK (file_size > 0 AND file_size <= 52428800); -- 50MB in bytes

-- Ensure valid file types
ALTER TABLE support_ticket_attachments
ADD CONSTRAINT check_valid_file_type
CHECK (
    file_type IN (
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'video/mp4',
        'video/quicktime',
        'application/zip'
    )
);

-- ============================================================================
-- PART 4: Helper Functions
-- ============================================================================

-- Function to log attachment upload
CREATE OR REPLACE FUNCTION log_attachment_upload()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-set file extension from file name
    IF NEW.file_extension IS NULL THEN
        NEW.file_extension := LOWER(SUBSTRING(NEW.file_name FROM '\.([^.]+)$'));
    END IF;

    -- Set initial virus scan status
    IF NEW.virus_scan_result IS NULL THEN
        NEW.virus_scan_result := 'pending';
    END IF;

    -- Update ticket updated_at
    UPDATE support_tickets
    SET updated_at = NOW()
    WHERE id = NEW.ticket_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_attachment_upload_trigger
    BEFORE INSERT ON support_ticket_attachments
    FOR EACH ROW
    EXECUTE FUNCTION log_attachment_upload();

-- Function to track attachment downloads
CREATE OR REPLACE FUNCTION track_attachment_download(
    p_attachment_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE support_ticket_attachments
    SET
        download_count = download_count + 1,
        last_downloaded_at = NOW()
    WHERE id = p_attachment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION track_attachment_download(UUID) TO service_role;

-- Function to mark attachment as virus scanned
CREATE OR REPLACE FUNCTION mark_attachment_scanned(
    p_attachment_id UUID,
    p_scan_result VARCHAR
)
RETURNS VOID AS $$
BEGIN
    UPDATE support_ticket_attachments
    SET
        virus_scanned = TRUE,
        virus_scan_result = p_scan_result,
        virus_scan_at = NOW()
    WHERE id = p_attachment_id;

    -- If infected, notify admins
    IF p_scan_result = 'infected' THEN
        RAISE NOTICE 'SECURITY ALERT: Infected file detected in attachment %', p_attachment_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_attachment_scanned(UUID, VARCHAR) TO service_role;

-- Function to soft delete attachment
CREATE OR REPLACE FUNCTION soft_delete_attachment(
    p_attachment_id UUID,
    p_deleted_by UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE support_ticket_attachments
    SET
        deleted_at = NOW(),
        deleted_by = p_deleted_by
    WHERE id = p_attachment_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION soft_delete_attachment(UUID, UUID) TO service_role;

-- Function to get ticket attachments summary
CREATE OR REPLACE FUNCTION get_ticket_attachments_summary(
    p_ticket_id UUID
)
RETURNS TABLE(
    total_attachments BIGINT,
    total_size_bytes BIGINT,
    total_size_mb DECIMAL,
    file_types TEXT[],
    has_pending_scan BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        SUM(sta.file_size)::BIGINT,
        ROUND((SUM(sta.file_size) / 1048576.0)::NUMERIC, 2),
        ARRAY_AGG(DISTINCT sta.file_type),
        BOOL_OR(sta.virus_scan_result = 'pending' OR sta.virus_scan_result IS NULL)
    FROM support_ticket_attachments sta
    WHERE sta.ticket_id = p_ticket_id
    AND sta.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_ticket_attachments_summary(UUID) TO service_role;

-- ============================================================================
-- PART 5: Ticket Attachments View
-- ============================================================================

CREATE OR REPLACE VIEW ticket_attachments_view AS
SELECT
    sta.id,
    sta.ticket_id,
    st.ticket_number,
    st.subject as ticket_subject,
    sta.file_name,
    sta.file_size,
    sta.file_type,
    sta.file_extension,
    sta.storage_path,
    sta.description,
    sta.uploaded_by,
    sta.uploaded_by_type,

    -- Uploader details
    CASE
        WHEN sta.uploaded_by_type = 'player' THEN u.email
        WHEN sta.uploaded_by_type = 'admin' THEN au.email
        ELSE NULL
    END as uploader_email,

    CASE
        WHEN sta.uploaded_by_type = 'admin' THEN au.full_name
        ELSE u.email
    END as uploader_name,

    -- Security info
    sta.virus_scanned,
    sta.virus_scan_result,
    sta.virus_scan_at,

    -- Access info
    sta.download_count,
    sta.last_downloaded_at,

    -- Formatting
    pg_size_pretty(sta.file_size) as file_size_formatted,

    -- Timestamps
    sta.created_at,
    sta.deleted_at,
    deleter.full_name as deleted_by_name

FROM support_ticket_attachments sta
LEFT JOIN support_tickets st ON sta.ticket_id = st.id
LEFT JOIN users u ON sta.uploaded_by = u.id AND sta.uploaded_by_type = 'player'
LEFT JOIN admin_users au ON sta.uploaded_by = au.id AND sta.uploaded_by_type = 'admin'
LEFT JOIN admin_users deleter ON sta.deleted_by = deleter.id;

GRANT SELECT ON ticket_attachments_view TO service_role;

-- ============================================================================
-- PART 6: Storage Statistics View
-- ============================================================================

CREATE OR REPLACE VIEW support_storage_stats AS
SELECT
    -- Overall stats
    COUNT(*) as total_attachments,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_attachments,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_attachments,

    -- Storage usage
    SUM(file_size) as total_bytes,
    pg_size_pretty(SUM(file_size)) as total_size,
    pg_size_pretty(SUM(file_size) FILTER (WHERE deleted_at IS NULL)) as active_size,

    -- By type
    jsonb_object_agg(
        file_type,
        COUNT(*)
    ) FILTER (WHERE deleted_at IS NULL) as files_by_type,

    -- Security
    COUNT(*) FILTER (WHERE virus_scan_result = 'pending') as pending_scans,
    COUNT(*) FILTER (WHERE virus_scan_result = 'infected') as infected_files,

    -- Activity
    SUM(download_count) as total_downloads,
    MAX(last_downloaded_at) as last_download_at

FROM support_ticket_attachments;

GRANT SELECT ON support_storage_stats TO service_role;

-- ============================================================================
-- PART 7: Add Attachment Count to Support Tickets
-- ============================================================================

-- Add attachment count column to support_tickets if it doesn't exist
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0;

-- Function to update attachment count
CREATE OR REPLACE FUNCTION update_ticket_attachment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
        UPDATE support_tickets
        SET attachment_count = attachment_count + 1
        WHERE id = NEW.ticket_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            -- Soft deleted
            UPDATE support_tickets
            SET attachment_count = attachment_count - 1
            WHERE id = NEW.ticket_id;
        ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            -- Restored
            UPDATE support_tickets
            SET attachment_count = attachment_count + 1
            WHERE id = NEW.ticket_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.deleted_at IS NULL THEN
            UPDATE support_tickets
            SET attachment_count = attachment_count - 1
            WHERE id = OLD.ticket_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_attachment_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON support_ticket_attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_attachment_count();

-- Initialize attachment counts for existing tickets
UPDATE support_tickets st
SET attachment_count = (
    SELECT COUNT(*)
    FROM support_ticket_attachments sta
    WHERE sta.ticket_id = st.id
    AND sta.deleted_at IS NULL
)
WHERE EXISTS (
    SELECT 1
    FROM support_ticket_attachments sta
    WHERE sta.ticket_id = st.id
);

-- ============================================================================
-- PART 8: Cleanup Functions
-- ============================================================================

-- Function to permanently delete soft-deleted attachments older than X days
CREATE OR REPLACE FUNCTION cleanup_deleted_attachments(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete attachments that were soft-deleted more than X days ago
    DELETE FROM support_ticket_attachments
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RAISE NOTICE 'Permanently deleted % old attachment records', v_deleted_count;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_deleted_attachments(INTEGER) TO service_role;

-- Function to identify large attachments for cleanup
CREATE OR REPLACE FUNCTION identify_large_attachments(
    p_size_mb INTEGER DEFAULT 10
)
RETURNS TABLE(
    attachment_id UUID,
    ticket_id UUID,
    file_name VARCHAR,
    file_size_mb DECIMAL,
    created_at TIMESTAMPTZ,
    last_downloaded_at TIMESTAMPTZ,
    download_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sta.id,
        sta.ticket_id,
        sta.file_name,
        ROUND((sta.file_size / 1048576.0)::NUMERIC, 2),
        sta.created_at,
        sta.last_downloaded_at,
        sta.download_count
    FROM support_ticket_attachments sta
    WHERE sta.file_size >= (p_size_mb * 1048576)
    AND sta.deleted_at IS NULL
    ORDER BY sta.file_size DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION identify_large_attachments(INTEGER) TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE support_ticket_attachments IS 'Stores file attachments for support tickets with virus scanning and soft delete';
COMMENT ON COLUMN support_ticket_attachments.storage_path IS 'Full path to file in storage bucket (Supabase Storage or S3)';
COMMENT ON COLUMN support_ticket_attachments.virus_scan_result IS 'Result of virus scan: pending, clean, or infected';
COMMENT ON COLUMN support_ticket_attachments.deleted_at IS 'Soft delete timestamp - file marked for deletion';
COMMENT ON FUNCTION track_attachment_download(UUID) IS 'Tracks attachment downloads for analytics';
COMMENT ON FUNCTION mark_attachment_scanned(UUID, VARCHAR) IS 'Marks attachment as scanned with result';
COMMENT ON FUNCTION soft_delete_attachment(UUID, UUID) IS 'Soft deletes an attachment (can be restored)';
COMMENT ON VIEW ticket_attachments_view IS 'Complete view of ticket attachments with uploader details';
COMMENT ON VIEW support_storage_stats IS 'Overall storage statistics for support attachments';

-- Output summary
DO $$
DECLARE
    v_attachment_count INTEGER;
    v_total_size BIGINT;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(file_size), 0)
    INTO v_attachment_count, v_total_size
    FROM support_ticket_attachments
    WHERE deleted_at IS NULL;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Support Attachments Migration Completed';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Active attachments in database: %', v_attachment_count;
    RAISE NOTICE 'Total storage used: %', pg_size_pretty(v_total_size);
    RAISE NOTICE 'Run SELECT * FROM ticket_attachments_view; to view attachments';
    RAISE NOTICE 'Run SELECT * FROM support_storage_stats; to view storage stats';
END $$;
