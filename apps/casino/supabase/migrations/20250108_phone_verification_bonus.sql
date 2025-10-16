-- ============================================================================
-- PHONE VERIFICATION BONUS SYSTEM
-- ============================================================================
-- Automatically awards $20 no-deposit bonus when user verifies phone via Supabase Auth
-- Uses Supabase Auth's built-in phone verification (auth.users table)

-- Add bonus claimed tracking to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_bonus_claimed BOOLEAN DEFAULT FALSE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_phone_bonus_claimed ON users(phone_bonus_claimed);

-- ============================================================================
-- FUNCTION: Award no-deposit bonus on phone verification
-- ============================================================================
-- Called by API endpoint after Supabase Auth confirms phone verification

CREATE OR REPLACE FUNCTION award_phone_verification_bonus(p_auth_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_bonus_offer RECORD;
    v_casino_user RECORD;
    v_auth_user RECORD;
    v_expiry_date TIMESTAMPTZ;
    v_result JSON;
BEGIN
    -- Get auth user to check phone verification
    SELECT * INTO v_auth_user
    FROM auth.users
    WHERE id = p_auth_user_id;

    IF v_auth_user.id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'User not found'
        );
    END IF;

    -- Check if phone is verified in Supabase Auth
    IF v_auth_user.phone_confirmed_at IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Phone number not verified'
        );
    END IF;

    -- Get casino user
    SELECT * INTO v_casino_user
    FROM users
    WHERE auth_user_id = p_auth_user_id;

    IF v_casino_user.id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Casino account not linked'
        );
    END IF;

    -- Check if already claimed
    IF v_casino_user.phone_bonus_claimed = TRUE THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Phone verification bonus already claimed'
        );
    END IF;

    -- Get the no-deposit bonus offer
    SELECT * INTO v_bonus_offer
    FROM bonus_offers
    WHERE bonus_code = 'NODEPOSIT20'
    AND active = TRUE;

    IF v_bonus_offer.id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'No-deposit bonus offer not available'
        );
    END IF;

    -- Check if user already has this bonus
    IF EXISTS (
        SELECT 1 FROM player_bonuses
        WHERE user_id = v_casino_user.id
        AND bonus_offer_id = v_bonus_offer.id
    ) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Bonus already claimed'
        );
    END IF;

    -- Set expiry date (7 days from now)
    v_expiry_date := NOW() + INTERVAL '7 days';

    -- Award the bonus
    INSERT INTO player_bonuses (
        user_id,
        bonus_offer_id,
        bonus_amount,
        wagering_requirement_total,
        wagering_requirement_remaining,
        max_cashout,
        status,
        activated_at,
        expires_at
    ) VALUES (
        v_casino_user.id,
        v_bonus_offer.id,
        v_bonus_offer.fixed_bonus_amount,
        v_bonus_offer.fixed_bonus_amount * v_bonus_offer.wagering_requirement_multiplier,
        v_bonus_offer.fixed_bonus_amount * v_bonus_offer.wagering_requirement_multiplier,
        v_bonus_offer.max_cashout,
        'active',
        NOW(),
        v_expiry_date
    );

    -- Add to user's bonus balance
    INSERT INTO user_balances (user_id, currency, bonus_balance, balance)
    VALUES (v_casino_user.id, 'USD', v_bonus_offer.fixed_bonus_amount, 0.00)
    ON CONFLICT (user_id, currency)
    DO UPDATE SET
        bonus_balance = user_balances.bonus_balance + v_bonus_offer.fixed_bonus_amount,
        updated_at = NOW();

    -- Mark bonus as claimed
    UPDATE users
    SET phone_bonus_claimed = TRUE
    WHERE id = v_casino_user.id;

    RETURN json_build_object(
        'success', TRUE,
        'bonus_amount', v_bonus_offer.fixed_bonus_amount,
        'wagering_required', v_bonus_offer.fixed_bonus_amount * v_bonus_offer.wagering_requirement_multiplier,
        'expires_at', v_expiry_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES: Allow authenticated users to call the bonus function
-- ============================================================================

GRANT EXECUTE ON FUNCTION award_phone_verification_bonus(UUID) TO authenticated;

COMMENT ON COLUMN users.phone_bonus_claimed IS 'Whether user has claimed the phone verification bonus';
COMMENT ON FUNCTION award_phone_verification_bonus(UUID) IS 'Awards $20 no-deposit bonus when user verifies phone via Supabase Auth';

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
--
-- Frontend flow:
-- 1. User signs up with phone number via Supabase Auth
-- 2. Supabase sends SMS verification code
-- 3. User enters code, Supabase confirms phone
-- 4. Frontend calls POST /api/player/claim-phone-bonus
-- 5. API checks auth.users.phone_confirmed_at and awards bonus
--
-- Example frontend code:
--
--   // Sign up with phone
--   const { data, error } = await supabase.auth.signUp({
--     phone: '+1234567890',
--     password: 'password123'
--   })
--
--   // Verify phone with SMS code
--   const { data, error } = await supabase.auth.verifyOtp({
--     phone: '+1234567890',
--     token: '123456',
--     type: 'sms'
--   })
--
--   // After verification, claim bonus
--   const response = await fetch('/api/player/claim-phone-bonus', {
--     method: 'POST'
--   })
--
-- ============================================================================
