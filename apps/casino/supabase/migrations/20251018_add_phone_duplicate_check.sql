-- Create function to check if phone number is already registered
-- This prevents duplicate phone numbers during signup
CREATE OR REPLACE FUNCTION public.is_phone_number_registered(phone_number TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE phone = phone_number
    AND deleted_at IS NULL
  );
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.is_phone_number_registered(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_phone_number_registered(TEXT) TO anon;

-- Add comment explaining the function
COMMENT ON FUNCTION public.is_phone_number_registered(TEXT) IS
  'Check if a phone number is already registered in the system. Returns true if phone exists, false otherwise.';
