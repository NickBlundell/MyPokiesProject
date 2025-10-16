-- Fix the trigger to set version=1 when creating initial user balances
CREATE OR REPLACE FUNCTION public.handle_new_casino_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create initial balance with version=1 to satisfy check constraint
  INSERT INTO public.user_balances (user_id, currency, balance, version)
  VALUES (NEW.id, 'USD', 0, 1)
  ON CONFLICT (user_id, currency) DO NOTHING;

  -- Assign tier 1 (Bronze) to new users
  INSERT INTO public.loyalty_tiers_users (user_id, tier_id)
  SELECT NEW.id, id FROM loyalty_tiers WHERE tier_level = 1 LIMIT 1
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
