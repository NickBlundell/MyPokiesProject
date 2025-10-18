-- ============================================================================
-- TEST PHONE NUMBER SUPPORT
-- ============================================================================
-- Allows specific test phone numbers to bypass certain restrictions
-- for development and testing purposes

-- Create table to store test phone numbers
CREATE TABLE IF NOT EXISTS test_phone_numbers (
    phone_number TEXT PRIMARY KEY,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the test number
INSERT INTO test_phone_numbers (phone_number, description)
VALUES ('+61403794027', 'Test number for development')
ON CONFLICT (phone_number) DO NOTHING;

-- ============================================================================
-- UPDATED FUNCTION: Award phone verification bonus with test number support
-- ============================================================================

CREATE OR REPLACE FUNCTION award_phone_verification_bonus(p_auth_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_bonus_offer RECORD;
    v_casino_user RECORD;
    v_auth_user RECORD;
    v_expiry_date TIMESTAMPTZ;
    v_is_test_number BOOLEAN;
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

    -- Check if this is a test phone number
    v_is_test_number := EXISTS (
        SELECT 1 FROM test_phone_numbers
        WHERE phone_number = v_auth_user.phone
    );

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

    -- Check if already claimed (skip this check for test numbers)
    IF v_casino_user.phone_bonus_claimed = TRUE AND NOT v_is_test_number THEN
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

    -- Check if user already has this bonus (skip for test numbers)
    IF NOT v_is_test_number AND EXISTS (
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

    -- Mark bonus as claimed (even for test numbers, to track usage)
    UPDATE users
    SET phone_bonus_claimed = TRUE
    WHERE id = v_casino_user.id;

    RETURN json_build_object(
        'success', TRUE,
        'bonus_amount', v_bonus_offer.fixed_bonus_amount,
        'wagering_required', v_bonus_offer.fixed_bonus_amount * v_bonus_offer.wagering_requirement_multiplier,
        'expires_at', v_expiry_date,
        'is_test_number', v_is_test_number
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON test_phone_numbers TO authenticated;

COMMENT ON TABLE test_phone_numbers IS 'Phone numbers that bypass certain restrictions for testing';
COMMENT ON FUNCTION award_phone_verification_bonus(UUID) IS 'Awards $20 no-deposit bonus when user verifies phone. Test numbers can claim multiple times.';
