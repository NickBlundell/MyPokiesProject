-- ============================================================================
-- DATABASE COMMENTS FOR DOCUMENTATION
-- ============================================================================
-- Comprehensive documentation for all tables and complex columns
-- This helps new developers understand the database structure

-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

-- Users table
COMMENT ON TABLE users IS 'Core user accounts table storing player information, authentication details, and profile data';
COMMENT ON COLUMN users.id IS 'Unique identifier for the user (UUID)';
COMMENT ON COLUMN users.auth_user_id IS 'Reference to Supabase auth.users table';
COMMENT ON COLUMN users.username IS 'Unique username for display and login';
COMMENT ON COLUMN users.email IS 'User email address for notifications and account recovery';
COMMENT ON COLUMN users.phone IS 'User phone number for SMS communications and verification';
COMMENT ON COLUMN users.phone_verified IS 'Whether the phone number has been verified via SMS';
COMMENT ON COLUMN users.fundist_user_id IS 'External ID from Fundist gaming platform';
COMMENT ON COLUMN users.status IS 'Account status: active, suspended, locked, or deleted';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of the user''s most recent login';
COMMENT ON COLUMN users.created_at IS 'Account creation timestamp';
COMMENT ON COLUMN users.updated_at IS 'Last modification timestamp';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp (NULL if not deleted)';
COMMENT ON COLUMN users.deleted_by IS 'User ID who performed the soft delete';
COMMENT ON COLUMN users.deletion_reason IS 'Reason for account deletion or suspension';

-- User balances
COMMENT ON TABLE user_balances IS 'Real-time user balance tracking for real money, bonus funds, and locked amounts';
COMMENT ON COLUMN user_balances.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN user_balances.real_balance IS 'Actual cash balance available for withdrawal';
COMMENT ON COLUMN user_balances.bonus_balance IS 'Bonus funds subject to wagering requirements';
COMMENT ON COLUMN user_balances.locked_bonus IS 'Bonus funds locked until wagering completed';
COMMENT ON COLUMN user_balances.total_deposits IS 'Lifetime total of all deposits';
COMMENT ON COLUMN user_balances.total_withdrawals IS 'Lifetime total of all withdrawals';
COMMENT ON COLUMN user_balances.last_transaction_at IS 'Timestamp of most recent balance change';
COMMENT ON COLUMN user_balances.version IS 'Optimistic locking version number - auto-incremented on each update';

-- ============================================================================
-- TRANSACTION TABLES
-- ============================================================================

COMMENT ON TABLE transactions IS 'Complete transaction history for deposits, withdrawals, bets, wins, and bonuses';
COMMENT ON COLUMN transactions.id IS 'Unique transaction identifier';
COMMENT ON COLUMN transactions.user_id IS 'User who initiated the transaction';
COMMENT ON COLUMN transactions.transaction_type IS 'Type: deposit, withdrawal, bet, win, bonus, adjustment';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount in base currency';
COMMENT ON COLUMN transactions.balance_before IS 'User balance before this transaction';
COMMENT ON COLUMN transactions.balance_after IS 'User balance after this transaction';
COMMENT ON COLUMN transactions.status IS 'Transaction status: pending, completed, failed, cancelled';
COMMENT ON COLUMN transactions.external_id IS 'Reference ID from external payment provider';
COMMENT ON COLUMN transactions.tid IS 'Fundist transaction ID for idempotency';
COMMENT ON COLUMN transactions.promotion_id IS 'Related bonus or promotion if applicable';
COMMENT ON COLUMN transactions.payment_method IS 'Payment method used (credit_card, bank_transfer, crypto, etc)';
COMMENT ON COLUMN transactions.metadata IS 'Additional transaction details in JSON format';
COMMENT ON COLUMN transactions.error_message IS 'Error details if transaction failed';
COMMENT ON COLUMN transactions.processed_at IS 'When the transaction was actually processed';
COMMENT ON COLUMN transactions.created_at IS 'When the transaction was initiated';

COMMENT ON TABLE transaction_idempotency IS 'Ensures transaction uniqueness and prevents duplicates';
COMMENT ON COLUMN transaction_idempotency.tid IS 'Unique transaction identifier from external system';
COMMENT ON COLUMN transaction_idempotency.transaction_id IS 'Our internal transaction ID';
COMMENT ON COLUMN transaction_idempotency.processed_at IS 'When this TID was first processed';
COMMENT ON COLUMN transaction_idempotency.request_payload IS 'Original request data for replay if needed';

-- ============================================================================
-- GAMING TABLES
-- ============================================================================

COMMENT ON TABLE games IS 'Game catalog with metadata, RTP, and configuration';
COMMENT ON COLUMN games.id IS 'Unique game identifier';
COMMENT ON COLUMN games.game_id IS 'External game ID from provider';
COMMENT ON COLUMN games.game_name IS 'Display name of the game';
COMMENT ON COLUMN games.game_provider IS 'Game provider/vendor name';
COMMENT ON COLUMN games.game_type IS 'Main category: slots, table_games, live_dealer';
COMMENT ON COLUMN games.game_sub_type IS 'Subcategory: video_slots, classic_slots, blackjack, roulette';
COMMENT ON COLUMN games.game_desc IS 'Full description and features';
COMMENT ON COLUMN games.logo IS 'URL to game thumbnail/logo image';
COMMENT ON COLUMN games.background IS 'URL to game background image';
COMMENT ON COLUMN games.tag IS 'Comma-separated tags for filtering';
COMMENT ON COLUMN games.rtp IS 'Return to Player percentage (e.g., 96.5)';
COMMENT ON COLUMN games.volatility IS 'Game volatility: low, medium, high';
COMMENT ON COLUMN games.max_win IS 'Maximum possible win multiplier';
COMMENT ON COLUMN games.min_bet IS 'Minimum bet amount allowed';
COMMENT ON COLUMN games.max_bet IS 'Maximum bet amount allowed';
COMMENT ON COLUMN games.has_demo IS 'Whether free play mode is available';
COMMENT ON COLUMN games.active IS 'Whether game is currently available to players';
COMMENT ON COLUMN games.metadata IS 'Additional game configuration and features';

COMMENT ON TABLE game_rounds IS 'Individual game round/spin history with bet and win amounts';
COMMENT ON COLUMN game_rounds.id IS 'Unique round identifier';
COMMENT ON COLUMN game_rounds.user_id IS 'Player who played this round';
COMMENT ON COLUMN game_rounds.game_id IS 'Game that was played';
COMMENT ON COLUMN game_rounds.session_id IS 'Gaming session identifier';
COMMENT ON COLUMN game_rounds.round_id IS 'External round ID from game provider';
COMMENT ON COLUMN game_rounds.bet_amount IS 'Amount wagered on this round';
COMMENT ON COLUMN game_rounds.win_amount IS 'Amount won (0 if lost)';
COMMENT ON COLUMN game_rounds.status IS 'Round status: active, completed, cancelled';
COMMENT ON COLUMN game_rounds.started_at IS 'When the round began';
COMMENT ON COLUMN game_rounds.completed_at IS 'When the round finished';
COMMENT ON COLUMN game_rounds.metadata IS 'Additional round details (paylines, features triggered, etc)';

-- ============================================================================
-- LOYALTY AND VIP TABLES
-- ============================================================================

COMMENT ON TABLE loyalty_tiers IS 'VIP tier definitions with benefits, cashback rates, and requirements';
COMMENT ON COLUMN loyalty_tiers.tier_name IS 'Display name: Bronze, Silver, Gold, Platinum, Diamond';
COMMENT ON COLUMN loyalty_tiers.tier_level IS 'Numeric level 1-5 for ordering';
COMMENT ON COLUMN loyalty_tiers.points_required IS 'Minimum points to achieve this tier';
COMMENT ON COLUMN loyalty_tiers.cashback_rate IS 'Percentage cashback on losses';
COMMENT ON COLUMN loyalty_tiers.points_per_dollar_redemption IS 'Points needed to redeem $1';
COMMENT ON COLUMN loyalty_tiers.withdrawal_priority IS 'Processing speed: standard, fast, priority, instant';
COMMENT ON COLUMN loyalty_tiers.birthday_bonus IS 'Birthday bonus amount for this tier';
COMMENT ON COLUMN loyalty_tiers.has_personal_manager IS 'Whether tier includes dedicated VIP manager';
COMMENT ON COLUMN loyalty_tiers.jackpot_ticket_rate IS 'Wagering amount required per jackpot ticket';
COMMENT ON COLUMN loyalty_tiers.benefits IS 'JSON object with additional tier benefits';

COMMENT ON TABLE player_loyalty IS 'Individual player loyalty status and points tracking';
COMMENT ON COLUMN player_loyalty.user_id IS 'Player whose loyalty status this represents';
COMMENT ON COLUMN player_loyalty.current_tier_id IS 'Current VIP tier';
COMMENT ON COLUMN player_loyalty.total_points_earned IS 'Lifetime points accumulated';
COMMENT ON COLUMN player_loyalty.available_points IS 'Points available for redemption';
COMMENT ON COLUMN player_loyalty.lifetime_wagered IS 'Total amount wagered all-time';
COMMENT ON COLUMN player_loyalty.tier_started_at IS 'When current tier was achieved';
COMMENT ON COLUMN player_loyalty.last_activity_at IS 'Most recent wagering activity';

COMMENT ON TABLE loyalty_points_transactions IS 'Loyalty points earning and redemption history';
COMMENT ON COLUMN loyalty_points_transactions.points IS 'Number of points (positive for earned, negative for redeemed)';
COMMENT ON COLUMN loyalty_points_transactions.transaction_type IS 'Type: earned, redeemed, expired, bonus, manual';
COMMENT ON COLUMN loyalty_points_transactions.source IS 'How points were earned: wagering, mission, promotion, manual';
COMMENT ON COLUMN loyalty_points_transactions.related_transaction_id IS 'Link to financial transaction if applicable';

-- ============================================================================
-- JACKPOT TABLES
-- ============================================================================

COMMENT ON TABLE jackpot_pools IS 'Progressive jackpot pool configuration and current values';
COMMENT ON COLUMN jackpot_pools.jackpot_name IS 'Display name of the jackpot';
COMMENT ON COLUMN jackpot_pools.jackpot_type IS 'Frequency: daily, weekly, monthly';
COMMENT ON COLUMN jackpot_pools.current_amount IS 'Current jackpot value';
COMMENT ON COLUMN jackpot_pools.seed_amount IS 'Starting amount after jackpot is won';
COMMENT ON COLUMN jackpot_pools.contribution_rate IS 'Percentage of wagers that feed the jackpot';
COMMENT ON COLUMN jackpot_pools.draw_day_of_week IS 'Day for weekly draws (0=Sunday, 3=Wednesday)';
COMMENT ON COLUMN jackpot_pools.draw_time IS 'Time of day for scheduled draw';
COMMENT ON COLUMN jackpot_pools.next_draw_at IS 'Next scheduled draw timestamp';
COMMENT ON COLUMN jackpot_pools.status IS 'Pool status: active, drawing, paused';
COMMENT ON COLUMN jackpot_pools.draw_number IS 'Sequential draw counter';

COMMENT ON TABLE jackpot_prize_tiers IS 'Prize distribution tiers for each jackpot';
COMMENT ON COLUMN jackpot_prize_tiers.tier_name IS 'Tier name: Grand, Major, Minor';
COMMENT ON COLUMN jackpot_prize_tiers.tier_order IS 'Display order (1=highest)';
COMMENT ON COLUMN jackpot_prize_tiers.winner_count IS 'Number of winners in this tier';
COMMENT ON COLUMN jackpot_prize_tiers.pool_percentage IS 'Percentage of pool allocated to this tier';

COMMENT ON TABLE jackpot_tickets IS 'Individual player tickets for jackpot draws';
COMMENT ON COLUMN jackpot_tickets.ticket_number IS 'Unique ticket number within pool';
COMMENT ON COLUMN jackpot_tickets.earned_from_transaction_id IS 'Transaction that earned this ticket';
COMMENT ON COLUMN jackpot_tickets.wager_amount IS 'Wagering that triggered ticket award';
COMMENT ON COLUMN jackpot_tickets.draw_eligible IS 'Whether ticket is eligible for next draw';
COMMENT ON COLUMN jackpot_tickets.earned_at IS 'When ticket was awarded';

COMMENT ON TABLE player_ticket_counts IS 'Aggregated ticket counts per player per pool for performance';
COMMENT ON COLUMN player_ticket_counts.total_tickets IS 'Total tickets held by player';
COMMENT ON COLUMN player_ticket_counts.last_ticket_at IS 'Most recent ticket earned';

COMMENT ON TABLE jackpot_draws IS 'Historical jackpot draw results';
COMMENT ON COLUMN jackpot_draws.draw_number IS 'Sequential draw number';
COMMENT ON COLUMN jackpot_draws.total_pool_amount IS 'Total prize pool for this draw';
COMMENT ON COLUMN jackpot_draws.total_tickets IS 'Number of tickets in the draw';
COMMENT ON COLUMN jackpot_draws.total_winners IS 'Total number of winners across all tiers';
COMMENT ON COLUMN jackpot_draws.random_seed IS 'Seed for provably fair drawing';

COMMENT ON TABLE jackpot_winners IS 'Individual jackpot winner records';
COMMENT ON COLUMN jackpot_winners.tier IS 'Prize tier won';
COMMENT ON COLUMN jackpot_winners.winning_ticket_number IS 'The winning ticket number';
COMMENT ON COLUMN jackpot_winners.tickets_held IS 'Total tickets player had in draw';
COMMENT ON COLUMN jackpot_winners.total_tickets_in_pool IS 'Total tickets in the entire pool';
COMMENT ON COLUMN jackpot_winners.win_odds_percentage IS 'Player''s winning probability';
COMMENT ON COLUMN jackpot_winners.prize_amount IS 'Amount won';
COMMENT ON COLUMN jackpot_winners.prize_credited IS 'Whether prize has been paid out';
COMMENT ON COLUMN jackpot_winners.credited_transaction_id IS 'Transaction ID of payout';

-- ============================================================================
-- BONUS TABLES
-- ============================================================================

COMMENT ON TABLE bonus_offers IS 'Bonus and promotion configurations';
COMMENT ON COLUMN bonus_offers.bonus_code IS 'Promotional code for claiming';
COMMENT ON COLUMN bonus_offers.bonus_name IS 'Display name of the bonus';
COMMENT ON COLUMN bonus_offers.bonus_type IS 'Type: deposit_match, no_deposit, cashback, free_spins, reload';
COMMENT ON COLUMN bonus_offers.match_percentage IS 'Deposit match percentage (100 = 100% match)';
COMMENT ON COLUMN bonus_offers.max_bonus_amount IS 'Maximum bonus amount that can be awarded';
COMMENT ON COLUMN bonus_offers.min_deposit_amount IS 'Minimum deposit to qualify';
COMMENT ON COLUMN bonus_offers.fixed_bonus_amount IS 'Fixed bonus amount for no-deposit bonuses';
COMMENT ON COLUMN bonus_offers.wagering_requirement_multiplier IS 'Times bonus must be wagered (30x, 40x, etc)';
COMMENT ON COLUMN bonus_offers.wagering_applies_to IS 'Whether wagering applies to bonus_only or deposit_and_bonus';
COMMENT ON COLUMN bonus_offers.max_cashout IS 'Maximum withdrawal from bonus winnings';
COMMENT ON COLUMN bonus_offers.max_bet_with_bonus IS 'Maximum bet size while bonus is active';
COMMENT ON COLUMN bonus_offers.valid_from IS 'When bonus becomes available';
COMMENT ON COLUMN bonus_offers.valid_until IS 'When bonus expires';
COMMENT ON COLUMN bonus_offers.day_of_week IS 'For weekly bonuses (0=Sunday, 1=Monday)';
COMMENT ON COLUMN bonus_offers.auto_apply IS 'Whether bonus applies automatically on qualifying deposit';
COMMENT ON COLUMN bonus_offers.one_time_per_user IS 'Whether user can claim only once';

COMMENT ON TABLE game_wagering_weights IS 'Game contribution percentages toward wagering requirements';
COMMENT ON COLUMN game_wagering_weights.game_type IS 'Game category';
COMMENT ON COLUMN game_wagering_weights.contribution_percentage IS 'How much wagers count (100% = full contribution)';

COMMENT ON TABLE player_bonuses IS 'Individual player bonus instances and wagering progress';
COMMENT ON COLUMN player_bonuses.bonus_offer_id IS 'Which bonus offer was claimed';
COMMENT ON COLUMN player_bonuses.bonus_code_used IS 'Promotional code used to claim';
COMMENT ON COLUMN player_bonuses.bonus_amount IS 'Actual bonus amount awarded';
COMMENT ON COLUMN player_bonuses.deposit_amount IS 'Triggering deposit amount if applicable';
COMMENT ON COLUMN player_bonuses.wagering_requirement_total IS 'Total amount that must be wagered';
COMMENT ON COLUMN player_bonuses.wagering_completed IS 'Amount wagered so far';
COMMENT ON COLUMN player_bonuses.wagering_percentage IS 'Percentage of wagering completed';
COMMENT ON COLUMN player_bonuses.wagering_requirement_remaining IS 'Remaining wagering needed (generated column)';
COMMENT ON COLUMN player_bonuses.max_cashout IS 'Maximum withdrawal allowed from this bonus';
COMMENT ON COLUMN player_bonuses.status IS 'Status: pending, active, completed, forfeited, expired, cancelled';
COMMENT ON COLUMN player_bonuses.issued_at IS 'When bonus was awarded';
COMMENT ON COLUMN player_bonuses.activated_at IS 'When bonus became active';
COMMENT ON COLUMN player_bonuses.completed_at IS 'When wagering was completed';
COMMENT ON COLUMN player_bonuses.expires_at IS 'When bonus expires if not completed';
COMMENT ON COLUMN player_bonuses.forfeited_reason IS 'Why bonus was forfeited if applicable';

COMMENT ON TABLE bonus_wagering_contributions IS 'Detailed tracking of wagering toward bonus requirements';
COMMENT ON COLUMN bonus_wagering_contributions.player_bonus_id IS 'Which bonus this contributes to';
COMMENT ON COLUMN bonus_wagering_contributions.transaction_id IS 'The bet transaction';
COMMENT ON COLUMN bonus_wagering_contributions.game_type IS 'Type of game played';
COMMENT ON COLUMN bonus_wagering_contributions.wager_amount IS 'Amount wagered';
COMMENT ON COLUMN bonus_wagering_contributions.contribution_percentage IS 'Game contribution rate applied';
COMMENT ON COLUMN bonus_wagering_contributions.contribution_amount IS 'Actual amount counting toward requirement';

-- ============================================================================
-- MARKETING AND CRM TABLES
-- ============================================================================

COMMENT ON TABLE marketing_leads IS 'Marketing lead database for SMS campaigns';
COMMENT ON COLUMN marketing_leads.phone_number IS 'Lead phone number for SMS';
COMMENT ON COLUMN marketing_leads.source IS 'How lead was acquired';
COMMENT ON COLUMN marketing_leads.segment IS 'Marketing segment classification';
COMMENT ON COLUMN marketing_leads.user_id IS 'Linked user account if converted';
COMMENT ON COLUMN marketing_leads.conversion_date IS 'When lead became a player';
COMMENT ON COLUMN marketing_leads.opt_out IS 'Whether lead has opted out of marketing';
COMMENT ON COLUMN marketing_leads.last_contacted_at IS 'Most recent marketing contact';
COMMENT ON COLUMN marketing_leads.contact_count IS 'Total times contacted';
COMMENT ON COLUMN marketing_leads.metadata IS 'Additional lead data and tags';

COMMENT ON TABLE marketing_campaigns IS 'Marketing campaign configuration and execution';
COMMENT ON COLUMN marketing_campaigns.name IS 'Campaign name for internal reference';
COMMENT ON COLUMN marketing_campaigns.type IS 'Campaign type: welcome, reactivation, promotion, vip';
COMMENT ON COLUMN marketing_campaigns.status IS 'Status: draft, scheduled, active, completed, cancelled';
COMMENT ON COLUMN marketing_campaigns.target_segment IS 'Which lead segment to target';
COMMENT ON COLUMN marketing_campaigns.message_template IS 'SMS message template with variables';
COMMENT ON COLUMN marketing_campaigns.bonus_offer_id IS 'Associated bonus offer if applicable';
COMMENT ON COLUMN marketing_campaigns.scheduled_at IS 'When campaign should execute';
COMMENT ON COLUMN marketing_campaigns.executed_at IS 'When campaign actually ran';
COMMENT ON COLUMN marketing_campaigns.total_recipients IS 'Number of recipients targeted';
COMMENT ON COLUMN marketing_campaigns.messages_sent IS 'Actual messages sent';
COMMENT ON COLUMN marketing_campaigns.messages_delivered IS 'Successfully delivered count';
COMMENT ON COLUMN marketing_campaigns.cost_estimate IS 'Estimated SMS costs';

COMMENT ON TABLE campaign_sends IS 'Individual message sends within campaigns';
COMMENT ON COLUMN campaign_sends.campaign_id IS 'Parent campaign';
COMMENT ON COLUMN campaign_sends.lead_id IS 'Recipient lead';
COMMENT ON COLUMN campaign_sends.status IS 'Send status: pending, sent, delivered, failed';
COMMENT ON COLUMN campaign_sends.sent_at IS 'When message was sent';
COMMENT ON COLUMN campaign_sends.delivered_at IS 'When delivery was confirmed';
COMMENT ON COLUMN campaign_sends.error_message IS 'Error details if send failed';
COMMENT ON COLUMN campaign_sends.external_message_id IS 'SMS provider message ID';

-- ============================================================================
-- SMS AND COMMUNICATION TABLES
-- ============================================================================

COMMENT ON TABLE sms_messages IS 'All SMS message history for conversations and campaigns';
COMMENT ON COLUMN sms_messages.conversation_id IS 'Groups messages into conversations';
COMMENT ON COLUMN sms_messages.from_phone IS 'Sender phone number';
COMMENT ON COLUMN sms_messages.to_phone IS 'Recipient phone number';
COMMENT ON COLUMN sms_messages.message_content IS 'SMS message text';
COMMENT ON COLUMN sms_messages.direction IS 'Direction: inbound or outbound';
COMMENT ON COLUMN sms_messages.status IS 'Delivery status from SMS provider';
COMMENT ON COLUMN sms_messages.external_message_id IS 'SMS provider''s message ID';
COMMENT ON COLUMN sms_messages.is_read IS 'Whether message has been read (for inbound)';
COMMENT ON COLUMN sms_messages.metadata IS 'Additional message data from provider';

COMMENT ON TABLE sms_conversations IS 'SMS conversation threads with players';
COMMENT ON COLUMN sms_conversations.phone_number IS 'Player phone number';
COMMENT ON COLUMN sms_conversations.user_id IS 'Linked user account if exists';
COMMENT ON COLUMN sms_conversations.status IS 'Conversation status: active, closed, archived';
COMMENT ON COLUMN sms_conversations.last_message_at IS 'Most recent message timestamp';
COMMENT ON COLUMN sms_conversations.message_count IS 'Total messages in conversation';
COMMENT ON COLUMN sms_conversations.unread_count IS 'Unread inbound messages';
COMMENT ON COLUMN sms_conversations.assigned_to IS 'Admin user handling conversation';
COMMENT ON COLUMN sms_conversations.tags IS 'Conversation tags for categorization';
COMMENT ON COLUMN sms_conversations.notes IS 'Internal notes about conversation';

-- ============================================================================
-- AI SYSTEM TABLES
-- ============================================================================

COMMENT ON TABLE ai_conversations IS 'AI-powered conversation management and context';
COMMENT ON COLUMN ai_conversations.player_id IS 'Player involved in conversation';
COMMENT ON COLUMN ai_conversations.conversation_type IS 'Type: support, engagement, retention';
COMMENT ON COLUMN ai_conversations.context IS 'Conversation context and history for AI';
COMMENT ON COLUMN ai_conversations.last_ai_response IS 'Most recent AI-generated response';
COMMENT ON COLUMN ai_conversations.sentiment_score IS 'AI-detected sentiment (-1 to 1)';
COMMENT ON COLUMN ai_conversations.intent_classification IS 'AI-detected player intent';
COMMENT ON COLUMN ai_conversations.recommended_actions IS 'AI-suggested next actions';
COMMENT ON COLUMN ai_conversations.escalation_needed IS 'Whether human intervention is needed';
COMMENT ON COLUMN ai_conversations.resolution_status IS 'Status: open, resolved, escalated';

COMMENT ON TABLE ai_auto_replies IS 'AI-generated automatic reply system';
COMMENT ON COLUMN ai_auto_replies.enabled IS 'Whether auto-replies are active';
COMMENT ON COLUMN ai_auto_replies.trigger_conditions IS 'Conditions that trigger auto-reply';
COMMENT ON COLUMN ai_auto_replies.response_template IS 'Template for generating responses';
COMMENT ON COLUMN ai_auto_replies.max_uses_per_day IS 'Daily limit for this auto-reply';
COMMENT ON COLUMN ai_auto_replies.used_today IS 'Times used today';
COMMENT ON COLUMN ai_auto_replies.priority IS 'Execution priority when multiple match';
COMMENT ON COLUMN ai_auto_replies.last_used_at IS 'Most recent use timestamp';

COMMENT ON TABLE ai_player_engagement IS 'AI-driven player engagement tracking';
COMMENT ON COLUMN ai_player_engagement.player_id IS 'Player being engaged';
COMMENT ON COLUMN ai_player_engagement.engagement_type IS 'Type: welcome, retention, reactivation, vip';
COMMENT ON COLUMN ai_player_engagement.last_engagement_at IS 'Most recent engagement attempt';
COMMENT ON COLUMN ai_player_engagement.engagement_score IS 'AI-calculated engagement likelihood';
COMMENT ON COLUMN ai_player_engagement.recommended_message IS 'AI-suggested message content';
COMMENT ON COLUMN ai_player_engagement.recommended_bonus IS 'AI-suggested bonus offer';
COMMENT ON COLUMN ai_player_engagement.optimal_contact_time IS 'AI-predicted best contact time';
COMMENT ON COLUMN ai_player_engagement.churn_risk_score IS 'AI-calculated churn probability';
COMMENT ON COLUMN ai_player_engagement.lifetime_value_prediction IS 'AI-predicted LTV';

-- ============================================================================
-- SUPPORT TABLES
-- ============================================================================

COMMENT ON TABLE support_tickets IS 'Customer support ticket tracking system';
COMMENT ON COLUMN support_tickets.user_id IS 'Player who created the ticket';
COMMENT ON COLUMN support_tickets.subject IS 'Ticket subject line';
COMMENT ON COLUMN support_tickets.description IS 'Full ticket description';
COMMENT ON COLUMN support_tickets.category IS 'Ticket category for routing';
COMMENT ON COLUMN support_tickets.priority IS 'Priority: low, medium, high, urgent';
COMMENT ON COLUMN support_tickets.status IS 'Status: open, in_progress, waiting, resolved, closed';
COMMENT ON COLUMN support_tickets.assigned_to IS 'Support agent handling ticket';
COMMENT ON COLUMN support_tickets.resolution IS 'How ticket was resolved';
COMMENT ON COLUMN support_tickets.satisfaction_rating IS 'Customer satisfaction score (1-5)';
COMMENT ON COLUMN support_tickets.first_response_at IS 'Time of first agent response';
COMMENT ON COLUMN support_tickets.resolved_at IS 'When ticket was resolved';
COMMENT ON COLUMN support_tickets.sla_deadline IS 'SLA response deadline';
COMMENT ON COLUMN support_tickets.tags IS 'Ticket tags for categorization';

COMMENT ON TABLE support_ticket_messages IS 'Messages within support tickets';
COMMENT ON COLUMN support_ticket_messages.ticket_id IS 'Parent ticket';
COMMENT ON COLUMN support_ticket_messages.sender_type IS 'Who sent: user or agent';
COMMENT ON COLUMN support_ticket_messages.sender_id IS 'ID of sender';
COMMENT ON COLUMN support_ticket_messages.message IS 'Message content';
COMMENT ON COLUMN support_ticket_messages.is_internal_note IS 'Whether this is an internal note';
COMMENT ON COLUMN support_ticket_messages.attachments IS 'Array of attachment URLs';

-- ============================================================================
-- ADMIN AND REPORTING TABLES
-- ============================================================================

COMMENT ON TABLE admin_users IS 'Admin user accounts with roles and permissions';
COMMENT ON COLUMN admin_users.email IS 'Admin email for login';
COMMENT ON COLUMN admin_users.role IS 'Admin role: support, manager, admin, super_admin';
COMMENT ON COLUMN admin_users.permissions IS 'Specific permissions array';
COMMENT ON COLUMN admin_users.active IS 'Whether account is active';
COMMENT ON COLUMN admin_users.last_login_at IS 'Most recent login timestamp';
COMMENT ON COLUMN admin_users.created_by IS 'Admin who created this account';

COMMENT ON TABLE admin_player_actions IS 'Audit log of admin actions on player accounts';
COMMENT ON COLUMN admin_player_actions.admin_id IS 'Admin who performed action';
COMMENT ON COLUMN admin_player_actions.player_id IS 'Player affected by action';
COMMENT ON COLUMN admin_player_actions.action_type IS 'Type of action performed';
COMMENT ON COLUMN admin_player_actions.action_details IS 'Detailed action information';
COMMENT ON COLUMN admin_player_actions.reason IS 'Reason for the action';
COMMENT ON COLUMN admin_player_actions.ip_address IS 'Admin IP address for audit';

COMMENT ON TABLE player_sessions IS 'Player session tracking for analytics';
COMMENT ON COLUMN player_sessions.session_id IS 'Unique session identifier';
COMMENT ON COLUMN player_sessions.player_id IS 'Player in this session';
COMMENT ON COLUMN player_sessions.started_at IS 'Session start time';
COMMENT ON COLUMN player_sessions.ended_at IS 'Session end time (null if active)';
COMMENT ON COLUMN player_sessions.duration_seconds IS 'Total session duration';
COMMENT ON COLUMN player_sessions.games_played IS 'Number of games played';
COMMENT ON COLUMN player_sessions.total_wagered IS 'Total amount wagered in session';
COMMENT ON COLUMN player_sessions.total_won IS 'Total amount won in session';
COMMENT ON COLUMN player_sessions.device_info IS 'Device and browser information';
COMMENT ON COLUMN player_sessions.ip_address IS 'Player IP address';

COMMENT ON TABLE player_segments IS 'Dynamic player segmentation for marketing';
COMMENT ON COLUMN player_segments.name IS 'Segment name';
COMMENT ON COLUMN player_segments.description IS 'Segment description and criteria';
COMMENT ON COLUMN player_segments.criteria IS 'JSON criteria for segment membership';
COMMENT ON COLUMN player_segments.player_count IS 'Current number of players in segment';
COMMENT ON COLUMN player_segments.auto_update IS 'Whether segment updates automatically';
COMMENT ON COLUMN player_segments.last_calculated_at IS 'When segment was last recalculated';

COMMENT ON TABLE scheduled_reports IS 'Automated report generation configuration';
COMMENT ON COLUMN scheduled_reports.report_name IS 'Report name';
COMMENT ON COLUMN scheduled_reports.report_type IS 'Type of report to generate';
COMMENT ON COLUMN scheduled_reports.schedule_cron IS 'Cron expression for scheduling';
COMMENT ON COLUMN scheduled_reports.recipients IS 'Email addresses to send report to';
COMMENT ON COLUMN scheduled_reports.parameters IS 'Report parameters and filters';
COMMENT ON COLUMN scheduled_reports.last_run_at IS 'When report last ran';
COMMENT ON COLUMN scheduled_reports.next_run_at IS 'Next scheduled execution';

-- ============================================================================
-- CALLBACK AND INTEGRATION TABLES
-- ============================================================================

COMMENT ON TABLE callback_logs IS 'External webhook and callback logging';
COMMENT ON COLUMN callback_logs.source IS 'Source system: fundist, twilio, payment_provider';
COMMENT ON COLUMN callback_logs.endpoint IS 'Which endpoint received the callback';
COMMENT ON COLUMN callback_logs.method IS 'HTTP method used';
COMMENT ON COLUMN callback_logs.headers IS 'Request headers';
COMMENT ON COLUMN callback_logs.payload IS 'Request body/payload';
COMMENT ON COLUMN callback_logs.response_status IS 'HTTP response code we returned';
COMMENT ON COLUMN callback_logs.response_body IS 'Response we sent back';
COMMENT ON COLUMN callback_logs.processing_time_ms IS 'Time taken to process';
COMMENT ON COLUMN callback_logs.error_message IS 'Error details if processing failed';
COMMENT ON COLUMN callback_logs.ip_address IS 'Source IP address';

-- ============================================================================
-- ARCHIVE TABLES
-- ============================================================================

COMMENT ON TABLE archived_transactions IS 'Archived transactions older than 90 days for compliance';
COMMENT ON TABLE archived_game_rounds IS 'Archived game rounds older than 90 days';
COMMENT ON TABLE archived_sms_messages IS 'Archived SMS messages older than 90 days';
COMMENT ON TABLE archived_callback_logs IS 'Archived callback logs older than 30 days';

-- ============================================================================
-- MONITORING SCHEMA TABLES
-- ============================================================================

COMMENT ON SCHEMA monitoring IS 'Database health monitoring and performance tracking';
COMMENT ON TABLE monitoring.health_check_history IS 'Historical record of all health check results for trend analysis';
COMMENT ON COLUMN monitoring.health_check_history.check_name IS 'Name of the health check performed';
COMMENT ON COLUMN monitoring.health_check_history.status IS 'Check result: OK, WARNING, CRITICAL';
COMMENT ON COLUMN monitoring.health_check_history.severity IS 'Issue severity: LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN monitoring.health_check_history.details IS 'Detailed check results in JSON format';

-- ============================================================================
-- ADMIN REPORTING SCHEMA
-- ============================================================================

COMMENT ON SCHEMA admin_reporting IS 'Administrative reporting views and aggregated data';

-- ============================================================================
-- FUNCTION COMMENTS
-- ============================================================================

COMMENT ON FUNCTION execute_balance_transaction IS 'Executes balance updates with proper transaction isolation to prevent race conditions';
COMMENT ON FUNCTION create_transaction_idempotent IS 'Creates transactions with idempotency checking to prevent duplicates';
COMMENT ON FUNCTION soft_delete_user IS 'Performs soft delete on user account with audit trail';
COMMENT ON FUNCTION get_or_create_game IS 'Retrieves existing game or creates new one with SQL injection protection';
COMMENT ON FUNCTION update_updated_at IS 'Trigger function to automatically update updated_at timestamps';
COMMENT ON FUNCTION refresh_analytics_materialized_views IS 'Refreshes all analytics materialized views for dashboard performance';
COMMENT ON FUNCTION monitoring.health_check_summary IS 'Returns comprehensive database health check summary';
COMMENT ON FUNCTION monitoring.check_and_alert IS 'Checks for critical issues and returns alerts';
COMMENT ON FUNCTION monitoring.run_scheduled_health_check IS 'Scheduled function to run health checks and store history';
COMMENT ON FUNCTION analyze_partial_index_savings IS 'Analyzes the size and efficiency of partial indexes';