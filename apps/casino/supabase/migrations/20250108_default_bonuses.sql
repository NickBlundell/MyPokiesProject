-- Insert default bonus offers
-- Welcome bonus, No-deposit bonus, and Daily deposit matches

-- ============================================================================
-- WELCOME BONUS
-- ============================================================================

INSERT INTO bonus_offers (
    bonus_code,
    bonus_name,
    bonus_type,
    match_percentage,
    max_bonus_amount,
    min_deposit_amount,
    wagering_requirement_multiplier,
    wagering_applies_to,
    max_bet_with_bonus,
    valid_from,
    valid_until,
    terms_conditions,
    active,
    auto_apply,
    one_time_per_user
) VALUES (
    'WELCOME100',
    'Welcome Bonus',
    'deposit_match',
    100.00,
    500.00,
    20.00,
    30,
    'bonus_only',
    10.00,
    NOW(),
    NULL,
    E'Welcome bonus terms:\n- 100% match up to $500\n- Minimum deposit: $20\n- Wagering requirement: 30x bonus amount\n- Slots contribute 100%, table games contribute 20%\n- Maximum bet with active bonus: $10\n- One time per player\n- Expires 30 days after activation',
    TRUE,
    TRUE,
    TRUE
);

-- ============================================================================
-- NO DEPOSIT BONUS
-- ============================================================================

INSERT INTO bonus_offers (
    bonus_code,
    bonus_name,
    bonus_type,
    fixed_bonus_amount,
    wagering_requirement_multiplier,
    wagering_applies_to,
    max_cashout,
    max_bet_with_bonus,
    valid_from,
    valid_until,
    terms_conditions,
    active,
    auto_apply,
    one_time_per_user
) VALUES (
    'NODEPOSIT20',
    'No Deposit Bonus',
    'no_deposit',
    20.00,
    40,
    'bonus_only',
    100.00,
    5.00,
    NOW(),
    NULL,
    E'No deposit bonus terms:\n- $20 free on signup\n- Wagering requirement: 40x ($800 total wagering)\n- Maximum cashout: $100\n- Slots only (100% contribution)\n- Maximum bet: $5\n- Expires 7 days after activation\n- One time per player',
    TRUE,
    FALSE,
    TRUE
);

-- ============================================================================
-- DAILY DEPOSIT MATCH BONUSES
-- ============================================================================

-- Monday: 50% up to $250
INSERT INTO bonus_offers (
    bonus_code,
    bonus_name,
    bonus_type,
    match_percentage,
    max_bonus_amount,
    min_deposit_amount,
    wagering_requirement_multiplier,
    wagering_applies_to,
    max_bet_with_bonus,
    day_of_week,
    valid_from,
    valid_until,
    terms_conditions,
    active,
    auto_apply,
    one_time_per_user
) VALUES (
    'MONDAY50',
    'Monday Reload',
    'reload',
    50.00,
    250.00,
    20.00,
    25,
    'bonus_only',
    10.00,
    1, -- Monday
    NOW(),
    NULL,
    E'Monday Reload bonus:\n- 50% match up to $250\n- Minimum deposit: $20\n- Wagering requirement: 25x bonus\n- Available every Monday\n- All games eligible',
    TRUE,
    FALSE,
    FALSE
);

-- Tuesday: 75% up to $150
INSERT INTO bonus_offers (
    bonus_code,
    bonus_name,
    bonus_type,
    match_percentage,
    max_bonus_amount,
    min_deposit_amount,
    wagering_requirement_multiplier,
    wagering_applies_to,
    max_bet_with_bonus,
    day_of_week,
    valid_from,
    valid_until,
    terms_conditions,
    active,
    auto_apply,
    one_time_per_user
) VALUES (
    'TUESDAY75',
    'Tuesday Boost',
    'reload',
    75.00,
    150.00,
    20.00,
    30,
    'bonus_only',
    10.00,
    2, -- Tuesday
    NOW(),
    NULL,
    E'Tuesday Boost bonus:\n- 75% match up to $150\n- Minimum deposit: $20\n- Wagering requirement: 30x bonus\n- Available every Tuesday\n- All games eligible',
    TRUE,
    FALSE,
    FALSE
);

-- Wednesday: 100% up to $200 (Jackpot Eve)
INSERT INTO bonus_offers (
    bonus_code,
    bonus_name,
    bonus_type,
    match_percentage,
    max_bonus_amount,
    min_deposit_amount,
    wagering_requirement_multiplier,
    wagering_applies_to,
    max_bet_with_bonus,
    day_of_week,
    valid_from,
    valid_until,
    terms_conditions,
    active,
    auto_apply,
    one_time_per_user
) VALUES (
    'WEDNESDAY100',
    'Jackpot Eve Bonus',
    'reload',
    100.00,
    200.00,
    20.00,
    35,
    'bonus_only',
    10.00,
    3, -- Wednesday
    NOW(),
    NULL,
    E'Wednesday Jackpot Eve bonus:\n- 100% match up to $200\n- Minimum deposit: $20\n- Wagering requirement: 35x bonus\n- Available every Wednesday (before jackpot draw!)\n- All games eligible',
    TRUE,
    FALSE,
    FALSE
);

-- Thursday: 50% up to $250 (New Cycle)
INSERT INTO bonus_offers (
    bonus_code,
    bonus_name,
    bonus_type,
    match_percentage,
    max_bonus_amount,
    min_deposit_amount,
    wagering_requirement_multiplier,
    wagering_applies_to,
    max_bet_with_bonus,
    day_of_week,
    valid_from,
    valid_until,
    terms_conditions,
    active,
    auto_apply,
    one_time_per_user
) VALUES (
    'THURSDAY50',
    'New Cycle Start',
    'reload',
    50.00,
    250.00,
    20.00,
    25,
    'bonus_only',
    10.00,
    4, -- Thursday
    NOW(),
    NULL,
    E'Thursday New Cycle bonus:\n- 50% match up to $250\n- Minimum deposit: $20\n- Wagering requirement: 25x bonus\n- Start the new jackpot week strong!\n- All games eligible',
    TRUE,
    FALSE,
    FALSE
);

-- Friday: 100% up to $300 (Weekend Kickoff)
INSERT INTO bonus_offers (
    bonus_code,
    bonus_name,
    bonus_type,
    match_percentage,
    max_bonus_amount,
    min_deposit_amount,
    wagering_requirement_multiplier,
    wagering_applies_to,
    max_bet_with_bonus,
    day_of_week,
    valid_from,
    valid_until,
    terms_conditions,
    active,
    auto_apply,
    one_time_per_user
) VALUES (
    'FRIDAY100',
    'Weekend Kickoff',
    'reload',
    100.00,
    300.00,
    20.00,
    30,
    'bonus_only',
    10.00,
    5, -- Friday
    NOW(),
    NULL,
    E'Friday Weekend Kickoff bonus:\n- 100% match up to $300\n- Minimum deposit: $20\n- Wagering requirement: 30x bonus\n- Available every Friday\n- All games eligible',
    TRUE,
    FALSE,
    FALSE
);

-- Saturday: 75% up to $200
INSERT INTO bonus_offers (
    bonus_code,
    bonus_name,
    bonus_type,
    match_percentage,
    max_bonus_amount,
    min_deposit_amount,
    wagering_requirement_multiplier,
    wagering_applies_to,
    max_bet_with_bonus,
    day_of_week,
    valid_from,
    valid_until,
    terms_conditions,
    active,
    auto_apply,
    one_time_per_user
) VALUES (
    'SATURDAY75',
    'Saturday Special',
    'reload',
    75.00,
    200.00,
    20.00,
    28,
    'bonus_only',
    10.00,
    6, -- Saturday
    NOW(),
    NULL,
    E'Saturday Special bonus:\n- 75% match up to $200\n- Minimum deposit: $20\n- Wagering requirement: 28x bonus\n- Available every Saturday\n- All games eligible',
    TRUE,
    FALSE,
    FALSE
);

-- Sunday: 60% up to $250
INSERT INTO bonus_offers (
    bonus_code,
    bonus_name,
    bonus_type,
    match_percentage,
    max_bonus_amount,
    min_deposit_amount,
    wagering_requirement_multiplier,
    wagering_applies_to,
    max_bet_with_bonus,
    day_of_week,
    valid_from,
    valid_until,
    terms_conditions,
    active,
    auto_apply,
    one_time_per_user
) VALUES (
    'SUNDAY60',
    'Sunday Funday',
    'reload',
    60.00,
    250.00,
    20.00,
    25,
    'bonus_only',
    10.00,
    0, -- Sunday
    NOW(),
    NULL,
    E'Sunday Funday bonus:\n- 60% match up to $250\n- Minimum deposit: $20\n- Wagering requirement: 25x bonus\n- Available every Sunday\n- All games eligible',
    TRUE,
    FALSE,
    FALSE
);

-- ============================================================================
-- SUMMARY VIEW
-- ============================================================================

-- Create a view for active bonus offers
CREATE OR REPLACE VIEW active_bonus_offers AS
SELECT
    id,
    bonus_code,
    bonus_name,
    bonus_type,
    match_percentage,
    max_bonus_amount,
    min_deposit_amount,
    fixed_bonus_amount,
    wagering_requirement_multiplier,
    max_cashout,
    max_bet_with_bonus,
    day_of_week,
    CASE
        WHEN day_of_week = 0 THEN 'Sunday'
        WHEN day_of_week = 1 THEN 'Monday'
        WHEN day_of_week = 2 THEN 'Tuesday'
        WHEN day_of_week = 3 THEN 'Wednesday'
        WHEN day_of_week = 4 THEN 'Thursday'
        WHEN day_of_week = 5 THEN 'Friday'
        WHEN day_of_week = 6 THEN 'Saturday'
        ELSE 'Any day'
    END as day_name,
    terms_conditions,
    auto_apply,
    one_time_per_user
FROM bonus_offers
WHERE active = TRUE
ORDER BY
    CASE bonus_type
        WHEN 'deposit_match' THEN 1
        WHEN 'no_deposit' THEN 2
        WHEN 'reload' THEN 3
        ELSE 4
    END,
    COALESCE(day_of_week, 99);

GRANT SELECT ON active_bonus_offers TO authenticated;

COMMENT ON VIEW active_bonus_offers IS 'View of all active bonus offers with day names';
