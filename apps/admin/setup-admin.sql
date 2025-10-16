-- Create an admin user in Supabase Auth
-- Run this in the Supabase SQL editor or via psql

-- First, create a user in auth.users (if not exists)
-- Note: You'll need to use Supabase Dashboard or create via the auth API
-- This is just for reference:

-- Option 1: Use Supabase Dashboard
-- Go to: https://supabase.com/dashboard/project/hupruyttzgeytlysobar/auth/users
-- Click "Add User" and create with:
-- Email: admin@mypokies.com
-- Password: (choose a strong password)

-- Option 2: Create programmatically (requires service role key)
-- After creating the auth user, link it to admin_users:

-- Once you have created the auth user, get their ID and run:
INSERT INTO admin_users (
    id,  -- Use the UUID from auth.users
    email,
    full_name,
    role,
    password_hash,  -- Not used with Supabase Auth
    permissions,
    is_active
) VALUES (
    'YOUR_AUTH_USER_ID_HERE',  -- Replace with actual UUID from auth.users
    'admin@mypokies.com',
    'System Administrator',
    'super_admin',
    'not_used_with_supabase_auth',
    ARRAY['all'],
    true
) ON CONFLICT (email) DO UPDATE SET
    role = 'super_admin',
    permissions = ARRAY['all'],
    is_active = true;

-- Grant the user access to see all data (for admin operations)
-- This is handled by RLS policies we already created