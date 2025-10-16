# MyPokies - TODO & Action Items

> Tracked action items and future enhancements

**Last Updated**: October 14, 2025

---

## 📊 Summary

This TODO list has been significantly expanded based on comprehensive audits completed on October 14, 2025:

### Audit Sources
1. **DATABASE_AUDIT_REPORT.md** - 133 database issues identified (29 CRITICAL, 34 HIGH, 48 MEDIUM, 22 LOW)
2. **REFACTORING_AUDIT_2025-10-14.md** - 87 refactoring opportunities identified across 224 TypeScript files

### Issue Breakdown by Priority

| Priority Level | Count | Key Focus Areas |
|---------------|-------|-----------------|
| 🚨 **Critical** | 19 | Database integrity, security vulnerabilities, race conditions |
| 🔥 **High** | 31 | Performance bottlenecks, database optimization, component refactoring |
| ⚠️ **Medium** | 45 | Code quality, data integrity, monitoring, type safety |
| 💡 **Future** | 80+ | Long-term enhancements, scalability, advanced features |

### Total Estimated Effort
- **Critical Issues**: ~95 hours (2.5 weeks)
- **High Priority**: ~180 hours (4.5 weeks)
- **Medium Priority**: ~140 hours (3.5 weeks)
- **Total**: ~415 hours (~10 weeks of full-time work)

### Quick Win Opportunities (High Impact, Low Effort)
Top 9 items that can achieve **40-50% of total expected improvement** in just **1 week**:
1. ~~Extract wallet component duplication (2 days) - 40% code reduction~~ ✅ COMPLETED
2. Parallelize Edge Function queries (30 min) - 6x faster response
3. Add memoization (1 day) - 50-70% fewer re-renders
4. Implement code splitting (4 hours) - 200KB smaller bundle
5. Add API response caching (1 day) - 80% fewer database queries
6. Add CHECK constraints on financial columns (4 hours) - Data integrity
7. Fix transaction isolation (12 hours) - Prevent race conditions
8. Add idempotency checks (6 hours) - Prevent duplicate transactions
9. Add rate limiting to Edge Functions (6 hours) - DDoS protection
10. Fix RLS policy gaps (6 hours) - Security hardening

### Health Scores
- **Database Health**: 73/100 (C+) → Target: 88/100 (A-) after critical fixes
- **Code Quality**: Multiple 700+ line files, 60% duplication in key components
- **Performance**: 40-60% improvement possible across all metrics

---

## 🔥 High Priority

### 🗄️ Database Critical Issues (From Comprehensive Audit)

> **Source**: DATABASE_AUDIT_REPORT.md - 133 issues identified
> **Database Health Score**: 73/100 (C+) → Target: 88/100 (A-) after critical fixes

- [ ] **Add CHECK Constraints on Financial Columns** 🚨 CRITICAL
  - **Tables**: `transactions`, `user_balances`, `jackpot_pools`, `player_bonuses`
  - **Problem**: No validation to prevent invalid amounts, balance overflows
  - **Risk**: Data corruption, regulatory violations
  - **Fix**: Add constraints for safe decimal ranges and balance consistency checks
  - **Estimated Time**: 4 hours
  - **Priority**: 1/10

- [ ] **Fix Missing wagering_requirement_remaining Column** 🚨 CRITICAL
  - **Location**: `player_bonuses` table
  - **Problem**: Phone bonus migration references column that doesn't exist
  - **Impact**: Migration fails, bonus awards broken
  - **Fix**: Add GENERATED column for computed remaining wagering
  - **Estimated Time**: 2 hours
  - **Priority**: 2/10

- [ ] **Implement Transaction Isolation for Balance Updates** 🚨 CRITICAL
  - **Files**: All OneWallet callback handlers (debit, credit, promotion, rollback)
  - **Problem**: Race conditions in concurrent balance updates - no SERIALIZABLE isolation
  - **Impact**: Lost bets, incorrect balances, financial loss
  - **Fix**: Create `execute_balance_transaction()` RPC with proper isolation level
  - **Estimated Time**: 12 hours
  - **Priority**: 1/10

- [ ] **Add Idempotency Checks on Transaction IDs** 🚨 CRITICAL
  - **Location**: `transactions` table, Edge Functions
  - **Problem**: Duplicate TIDs throw errors instead of graceful handling
  - **Impact**: Fundist retries create duplicate bets, balance corruption
  - **Fix**: Create `create_transaction_idempotent()` RPC function
  - **Estimated Time**: 6 hours
  - **Priority**: 2/10

- [ ] **Implement Soft Delete Strategy** 🚨 CRITICAL
  - **Tables**: `users`, `transactions`, `player_bonuses`
  - **Problem**: Hard deletes with CASCADE prevent data recovery
  - **Impact**: Regulatory violation, no audit trail, data loss
  - **Fix**: Add `deleted_at`, `deleted_by`, `deletion_reason` columns + soft delete RPC
  - **Estimated Time**: 16 hours
  - **Priority**: 1/10

- [ ] **Add Rate Limiting to Edge Functions** 🚨 CRITICAL
  - **Functions**: `onewallet-callback`, `twilio-inbound-webhook`
  - **Problem**: No rate limiting allows DDoS attacks, SMS abuse
  - **Impact**: Platform downtime, unlimited SMS costs, database overload
  - **Fix**: Implement Upstash rate limiting middleware
  - **Estimated Time**: 6 hours
  - **Priority**: 1/10

- [ ] **Fix RLS Policy Gaps on Admin Views** 🚨 CRITICAL
  - **Schema**: `admin_reporting`
  - **Problem**: Admin views accessible to authenticated users
  - **Impact**: All player PII exposed, GDPR violation
  - **Fix**: Revoke schema access, add explicit RLS, remove from PostgREST
  - **Estimated Time**: 6 hours
  - **Priority**: 1/10

- [ ] **Fix SQL Injection in get_or_create_game()** 🚨 CRITICAL
  - **Location**: `20250107_games_catalog.sql`
  - **Problem**: No input validation on game_desc parameter (SECURITY DEFINER!)
  - **Impact**: SQL injection, potential table drops, privilege escalation
  - **Fix**: Add regex validation, sanitize inputs
  - **Estimated Time**: 3 hours
  - **Priority**: 1/10

- [ ] **Implement Backup Verification Strategy** 🚨 CRITICAL
  - **Problem**: No PITR testing, no restoration drills, no RTO/RPO defined
  - **Impact**: Data loss in catastrophic failure
  - **Fix**: Enable PITR, create restoration test procedure, document disaster recovery
  - **Estimated Time**: 8 hours
  - **Priority**: 1/10

- [ ] **Fix Race Condition on Balance Version Field** 🚨 CRITICAL
  - **Location**: `user_balances` table, `update_balance()` function
  - **Problem**: Version field not auto-incremented by triggers, inconsistent versioning
  - **Impact**: Optimistic locking breaks, concurrent updates corrupt data
  - **Fix**: Add trigger to auto-increment version on every balance change
  - **Estimated Time**: 8 hours
  - **Priority**: 1/10

### Critical Blockers

- [ ] **Fix Missing @mypokies/monitoring Package** 🚨 BLOCKS BUILD
  - **Issue**: All API routes import `@mypokies/monitoring` but package doesn't exist
  - **Impact**: Casino app cannot compile or build
  - **Affected**: 27+ API routes in `apps/casino/app/api/**`
  - **Fix Options**:
    1. Create the monitoring package in `packages/monitoring`
    2. Temporarily replace imports with console.log
  - **Estimated Time**: 1 hour
  - **Status**: Discovered in comprehensive audit (Oct 14, 2025)

- [ ] **Fix TypeScript Compilation Errors** 🚨 (34 errors found)
  - **Test Suite Errors** (12 errors in `balance-counter.test.tsx`):
    - Missing `@testing-library/jest-dom` import
    - Invalid mock object properties (`user_id`, `refetch`)
    - Type mismatches in test assertions
  - **Hook Implementation Errors** (5 errors in `useRealtimeFavoriteGames.ts`):
    - Lines 58, 96, 103-104: Implicit `any` types and property access issues
  - **Context Variable Scope** (1 error in `jackpot-animation-context.tsx`):
    - Line 70: `prevAmount` not declared in scope
  - **Estimated Time**: 2-3 hours
  - **Status**: Blocking tests and type safety

### Security Issues

- [ ] **Fix SQL Injection Risk** 🚨 CRITICAL
  - **Location**: `apps/admin/supabase/functions/process-ai-auto-replies/index.ts:111`
  - **Problem**: String interpolation in SQL query with `.not('id', 'in', \`(${array.join(',')})\`)`
  - **Risk**: Malicious data in `accumulated_message_ids` could inject SQL commands
  - **Fix**: Use parameterized query: `.not('id', 'in', array)` (let Supabase handle escaping)
  - **Estimated Time**: 30 minutes
  - **Impact**: HIGH - Could allow database manipulation

- [ ] **Add XSS Sanitization for AI-Generated Messages** 🚨
  - **Location**: `apps/admin/supabase/functions/process-ai-auto-replies/index.ts:145-172`
  - **Problem**: AI-generated messages sent to SMS without sanitization
  - **Risk**: Could send control characters, exceed length limits, or inject malicious content
  - **Fix**: Create `sanitizeForSMS()` function to strip control chars and limit length
  - **Estimated Time**: 1 hour
  - **Impact**: MEDIUM - Could cause SMS failures or security issues

- [ ] **Fix Phone Verification Timeout** 🚨
  - **Location**: `apps/casino/components/auth-modals.tsx:285-310`
  - **Problem**: SMS verification codes have no expiry check (codes expire after 10 min)
  - **Risk**: Users can verify with expired codes
  - **Fix**: Add timestamp check before verification
  - **Estimated Time**: 30 minutes

### Database Performance Issues (HIGH Priority)

- [ ] **Add Missing Foreign Key Indexes** 🔥
  - **Tables**: `transactions.promotion_id`, `player_bonuses.bonus_offer_id`, `jackpot_tickets.earned_from_transaction_id`, `campaign_sends.campaign_id`
  - **Problem**: PostgreSQL doesn't auto-create indexes on foreign keys, causing slow JOINs
  - **Impact**: Full table scans on JOINs, slow dashboard performance, admin pages timeout
  - **Fix**: Create indexes with CONCURRENTLY to avoid downtime
  - **Estimated Time**: 4 hours
  - **Priority**: 4/10

- [ ] **Add Composite Indexes for Common Queries** 🔥
  - **Queries**:
    - Active bonuses for user: `WHERE user_id = ? AND status = 'active'`
    - Recent transactions: `WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC`
    - Eligible jackpot tickets: `WHERE jackpot_pool_id = ? AND draw_eligible = true`
    - Active game rounds: `WHERE user_id = ? AND status = 'active'`
  - **Problem**: Single-column indexes exist but multi-column WHERE clauses don't have composite indexes
  - **Impact**: Slower queries, database doing more work than necessary
  - **Fix**: Create composite indexes with INCLUDE columns for covering indexes
  - **Estimated Time**: 6 hours
  - **Priority**: 4/10

- [ ] **Implement Archival Strategy for Unbounded Tables** 🔥
  - **Tables**: `callback_logs`, `transactions`, `sms_messages`, `game_rounds`
  - **Problem**: Tables grow indefinitely without archival, will exceed Supabase free tier (500MB)
  - **Impact**: Database size explosion, slow queries, expensive backups, $0.125/GB/month on paid plan
  - **Fix**: Create archival function + cron job to move data older than 90 days to archived tables
  - **Estimated Time**: 12 hours
  - **Priority**: 3/10

- [ ] **Add Column-Level Encryption for PII** 🔥
  - **Tables**: `users.email`, `users.phone`, `marketing_leads.phone_number`, `sms_messages.message_content`
  - **Problem**: Sensitive data stored in plaintext - GDPR violation
  - **Impact**: Data breach exposure in database dumps, compliance failure
  - **Fix**: Enable pgcrypto extension, add encrypted columns, create decryption views
  - **Estimated Time**: 20 hours
  - **Priority**: 5/10

- [ ] **Configure Connection Pooling** 🔥
  - **Location**: All Edge Functions and Next.js API routes
  - **Problem**: No connection pooling configured, leading to exhausted connections (50 max on free tier)
  - **Impact**: "Too many connections" errors during peak, slow response times
  - **Fix**: Use Supabase pooler URL, configure pool settings in dashboard
  - **Estimated Time**: 4 hours
  - **Priority**: 6/10

- [ ] **Tune Autovacuum for High-Write Tables** 🔥
  - **Tables**: `transactions`, `callback_logs`, `sms_messages`
  - **Problem**: Default autovacuum settings lead to 20%+ dead tuples, table bloat
  - **Impact**: Queries scan dead tuples, wasted disk space, longer backups
  - **Fix**: Set `autovacuum_vacuum_scale_factor = 0.05` (5% instead of default 20%)
  - **Estimated Time**: 4 hours
  - **Priority**: 7/10

- [ ] **Enable pg_stat_statements for Query Monitoring** 🔥
  - **Problem**: Extension not enabled, can't identify slow queries
  - **Impact**: No way to optimize queries, no performance baseline
  - **Fix**: Enable extension, create slow_queries and missing_indexes views
  - **Estimated Time**: 5 hours
  - **Priority**: 7/10

### Code Quality

- [ ] **Replace console.log with proper logging** (~50 instances in source code)
  - Replace console.log/console.error with `@mypokies/monitoring` logger
  - **Priority Files**:
    - `apps/casino/components/stake-sidebar.tsx` (7 logs in one function!)
    - `apps/casino/supabase/functions/jackpot-draw/index.ts`
    - `apps/admin/supabase/functions/process-ai-auto-replies/index.ts`
  - Benefits: Better log management, filtering, and monitoring
  - Status: Guide created (LOGGING_MIGRATION_GUIDE.md), gradual migration in progress
  - **Note**: 2,403 total includes node_modules; ~50 in actual source code
  - **Estimated Time**: 2 days

- [ ] **Address TODO/FIXME comments in code** (5 critical TODOs)
  - See detailed list in Medium Priority → Features section below
  - Should either implement or remove these comments

### Testing

- [ ] **Expand test coverage** (Currently: 53 tests, Target: 80%+)
  - **Create unit tests for critical flows**:
    - Authentication (login, signup, password reset)
    - Wallet operations (deposit, withdrawal, balance updates)
    - Game loading and initialization
    - Bonus claiming and validation
    - VIP tier calculations

  - **Add integration tests**:
    - User registration → first deposit → game play flow
    - Bonus claiming → wagering → completion flow
    - Jackpot ticket earning → draw participation
    - VIP tier progression

  - **Add E2E tests with Playwright**:
    - Critical user journeys
    - Payment flows
    - Game interactions

---

## 📝 Medium Priority

### Database Data Quality & Integrity

- [ ] **Add Missing NOT NULL Constraints** ⚠️
  - **Columns**: `users.created_at`, `transactions.created_at`, `player_bonuses.issued_at`, `game_rounds.started_at`
  - **Problem**: Columns that should never be NULL lack NOT NULL constraints
  - **Impact**: NULLs in required fields, missing timestamps in audit trails
  - **Fix**: Fix existing NULLs first, then add NOT NULL constraints
  - **Estimated Time**: 3 hours
  - **Priority**: 8/10

- [ ] **Add CHECK Constraint on Bonus Expiry Dates** ⚠️
  - **Table**: `player_bonuses`
  - **Problem**: No CHECK constraint ensures `expires_at > activated_at`
  - **Impact**: Invalid date ranges allowed, business logic must validate instead of database
  - **Fix**: Add CHECK constraint + trigger to auto-set expires_at if not provided
  - **Estimated Time**: 3 hours
  - **Priority**: 5/10

- [ ] **Fix Missing CONCURRENTLY on Index Creation** ⚠️
  - **Location**: Multiple migration files
  - **Problem**: Indexes created without CONCURRENTLY keyword cause table locks during deployment
  - **Impact**: Downtime during migrations, players can't place bets during index creation
  - **Fix**: Add CONCURRENTLY to all CREATE INDEX statements
  - **Estimated Time**: 2 hours
  - **Priority**: 8/10

- [ ] **Add Missing Triggers for updated_at Columns** ⚠️
  - **Tables**: `marketing_campaigns`, `player_segments`, `scheduled_reports`
  - **Problem**: `updated_at` columns exist but no triggers to auto-update them
  - **Impact**: Stale timestamps, can't track when records changed, cache invalidation broken
  - **Fix**: Add `update_updated_at_column()` trigger to all tables with updated_at
  - **Estimated Time**: 3 hours
  - **Priority**: 9/10

- [ ] **Standardize Naming Conventions** ⚠️
  - **Problem**: Inconsistent naming across database
    - Some FKs: `user_id`, others: `userId`
    - Some timestamps: `created_at`, others: `createdAt`
    - Some booleans: `is_active`, others: `active`
  - **Impact**: Developer confusion, typos, reduced maintainability
  - **Fix**: Standardize on snake_case with prefixes (`is_`, `has_`, `_at`, `_id`)
  - **Estimated Time**: 6 hours
  - **Priority**: 9/10

- [ ] **Add Database Comments for Documentation** ⚠️
  - **Problem**: Only ~30% of tables have COMMENT documentation
  - **Impact**: New developers struggle, unclear column purposes, out-of-sync docs
  - **Fix**: Add COMMENT ON TABLE/COLUMN for all tables and complex columns
  - **Estimated Time**: 8 hours
  - **Priority**: 9/10

### Database Monitoring & Health

- [ ] **Create Database Health Monitoring** ⚠️
  - **Problem**: No automated monitoring for table bloat, slow queries, connection pool exhaustion
  - **Impact**: Problems go unnoticed until critical, no early warning system
  - **Fix**: Create monitoring views, alerting function, schedule health checks every 15 min
  - **Estimated Time**: 10 hours
  - **Priority**: 6/10

- [ ] **Create Materialized Views for Analytics Dashboards** ⚠️
  - **Views Needed**:
    - `mv_player_lifetime_value` - Total deposits, withdrawals, wagered, won
    - `mv_game_performance` - Play counts, unique players, house edge per game
    - `mv_campaign_roi` - Campaign effectiveness metrics
  - **Problem**: Complex analytics queries recalculated on every dashboard load
  - **Impact**: Dashboard loads take 5-10 seconds, high CPU usage
  - **Fix**: Create materialized views, refresh every hour via cron
  - **Expected Improvement**: 10x faster (5s → 0.5s)
  - **Estimated Time**: 12 hours
  - **Priority**: 9/10

- [ ] **Add Partial Indexes for Status Filtering** ⚠️
  - **Tables**: `player_bonuses` (active only), `support_tickets` (open/in_progress only), `jackpot_tickets` (eligible only)
  - **Problem**: Full indexes on status columns but 90% of queries filter for active/pending only
  - **Impact**: Indexes much larger than necessary, slower maintenance
  - **Fix**: Replace full indexes with partial indexes (WHERE status IN (...))
  - **Expected Result**: 60-80% smaller indexes, 2-3x faster filtered queries
  - **Estimated Time**: 3 hours
  - **Priority**: 6/10

### Performance & Architecture

- [ ] **Refactor Oversized Components** (3 files >700 lines)
  - **wallet-dropdown.tsx** (744 lines) - Refactor Score: 3/10
    - 60% duplicate code with wallet-modal.tsx
    - Should split into: `BonusOfferList`, `PaymentMethodGrid`, `AmountInput`, `BalanceSummary`
    - Create shared hooks: `useWalletState`, `useBonusOffers`, `usePaymentMethods`
  - **wallet-modal.tsx** (738 lines) - Refactor Score: 3/10
    - 60% duplicate code with wallet-dropdown.tsx
    - Has SSR incompatibility with `document.body` (needs hydration check)
    - Excessive z-index (`z-[100000]` → should be `z-50`)
  - **players-table-with-modal.tsx** (919 lines - LARGEST FILE) - Refactor Score: 4/10
    - No error handling for button clicks
    - Uses mock data instead of real data (Lines 98-135)
    - No loading states
    - Should split into 5+ sub-components
  - **Estimated Time**: 3-4 days total
  - **Benefits**: Better maintainability, reduced duplication, improved performance

- [ ] **Optimize Database Queries - N+1 Problem**
  - **Location**: `apps/admin/supabase/functions/generate-ai-outreach/index.ts:243-317`
  - **Problem**: Makes 6 sequential database calls in `gatherPlayerContext()`
  - **Impact**: Slow response times, inefficient database usage
  - **Fix**: Use `Promise.all()` to run queries in parallel
  - **Expected Improvement**: 6x faster (from ~600ms to ~100ms)
  - **Estimated Time**: 2 hours

- [ ] **Add Batching to AI Outreach Processing**
  - **Location**: `apps/admin/supabase/functions/generate-ai-outreach/index.ts:57-123`
  - **Problem**: Processes players one-by-one in loop without batching
  - **Impact**: Slow processing, expensive AI API calls, no rate limiting
  - **Fix**: Process in batches of 10 with `Promise.allSettled()`
  - **Estimated Time**: 3 hours

- [ ] **Fix Memory Leak Risks in Large Components**
  - **auth-modals.tsx:235-257** - State updates without mounted check
  - **wallet-modal.tsx:342** - Portal rendering without hydration check
  - **stake-sidebar.tsx:194-225** - Complex click handling with manual DOM manipulation
  - **Estimated Time**: 4 hours
  - **Status**: 14 files audited, 3 issues found

- [ ] **Add Migration Rollback Scripts**
  - **Problem**: 32 SQL migration files have no rollback strategy
  - **Risk**: If migration fails halfway, no way to recover
  - **Fix**: Add `DROP POLICY IF EXISTS` with transactions, use `CREATE OR REPLACE`
  - **Priority**: Index creation should use `CONCURRENTLY` flag to avoid table locks
  - **Estimated Time**: 2 days

### Type Safety

- [ ] **Audit and reduce `any` type usage** (~200 in source code, 68k total including node_modules)
  - Many files still use the `any` type which bypasses TypeScript safety
  - **Priority Files** (implicit `any` errors):
    - `apps/casino/lib/hooks/useRealtimeFavoriteGames.ts:58`
    - `apps/casino/lib/hooks/useRealtimeGames.ts:36`
    - Edge functions dealing with Fundist API (may be legitimate)
  - Review each usage and replace with proper types where possible
  - Some may be legitimate (external APIs, dynamic data), but most should have proper types
  - **Consider**: Enable stricter TypeScript: `noImplicitAny`, `strictNullChecks`
  - **Estimated Time**: 2-3 days

### Features (from code comments)

**Casino App** (`apps/casino`):
- [ ] **Game Favorites** - Implement actual favorite games filtering
  - Location: `app/home-content.tsx:favoritesGames`
  - Current: Shows first 8 games
  - Needed: Filter by user's actual favorites

- [ ] **Recent Games** - Implement actual recent play history
  - Location: `app/home-content.tsx:recentsGames`
  - Current: Shows first 8 games
  - Needed: Filter by actual recent plays

- [ ] **Popular Games** - Implement popularity tracking
  - Location: `app/home-content.tsx:popularGames`
  - Current: Shows first 12 games
  - Needed: Sort by play count/popularity

- [ ] **Jackpot Wagering Tracker** - Track progress toward next ticket
  - Location: `components/account-dashboard.tsx`
  - Current: Placeholder comment
  - Needed: Real-time wagering tracking

**Admin App** (`apps/admin`):
- [ ] **Promotion Status Updates** - API endpoint for status changes
  - Location: `app/dashboard/promotions/PromotionsClient.tsx`
  - Needed: Backend API endpoint

- [ ] **Promotion Saving** - API endpoint for saving promotions
  - Location: `app/dashboard/promotions/PromotionsClient.tsx`
  - Needed: Backend API endpoint

- [ ] **Lead Conversion Bonus** - MyPokies API integration
  - Location: `app/api/leads/convert/route.ts`
  - Needed: Integration with bonus assignment API

**Shared Packages**:
- [ ] **Error Reporting Integration** - Connect to Sentry/LogRocket
  - Location: `packages/ui/src/components/error-boundary.tsx`
  - Current: Comment placeholder
  - Needed: Actual error service integration

---

## 🎯 Refactoring Priorities (From Comprehensive Audit)

> **Source**: REFACTORING_AUDIT_2025-10-14.md - 87 opportunities identified
> **Expected Overall Impact**: 40-60% performance improvement across all metrics

### 🔥 Quick Wins (High Impact, Low Effort - DO FIRST!)

- [x] **Extract Wallet Component Duplication** ✅ COMPLETED (Oct 14, 2025)
  - **Files**: `wallet-dropdown.tsx` (now 291 lines) + `wallet-modal.tsx` (now 277 lines)
  - **Solution**: Extracted to shared hooks and components
    - Created `useWalletState` hook (67 lines) - manages wallet view state
    - Created `useBonusOffers` hook (240 lines) - handles bonus logic
    - Created `usePaymentMethods` hook (76 lines) - payment method management
    - Created shared components: `BonusOfferList`, `PaymentMethodGrid`, `AmountInput`, `BalanceSummary`
  - **Achieved Impact**:
    - **62% code reduction** in main components (1,482 → 568 lines)
    - Created 754 lines of reusable shared code
    - Estimated **30-40KB bundle size reduction**
    - Single source of truth for wallet logic achieved
  - **Completion Time**: Already completed
  - **Documentation**: See WALLET_REFACTORING_SUMMARY.md for details

- [ ] **Parallelize Edge Function Database Queries** ⭐
  - **File**: `apps/admin/supabase/functions/generate-ai-outreach/index.ts:243-317`
  - **Problem**: Makes 6 sequential database calls (600ms total)
  - **Fix**: Use `Promise.all()` to run queries in parallel
  - **Expected Impact**: **6x faster** (600ms → 100ms)
  - **Estimated Time**: 30 minutes
  - **Risk**: Very Low

- [ ] **Add Memoization to Expensive Calculations** ⭐
  - **Files**:
    - `stake-sidebar.tsx:80-140` - Recalculates styles on every render
    - `wallet-dropdown/modal.tsx:58-73` - Bonus calculation
    - `player-context.tsx:106-116` - Bonus totals
  - **Fix**: Add `useMemo` and `useCallback` hooks
  - **Expected Impact**: 50-70% reduction in unnecessary re-renders
  - **Estimated Time**: 1 day
  - **Risk**: Very Low

- [ ] **Implement Code Splitting for Heavy Components** ⭐
  - **Components**: Auth modals (775 lines), Wallet modals (738+744 lines)
  - **Problem**: ~200KB of modal code loads in initial bundle
  - **Fix**: Use `React.lazy()` and `Suspense`
  - **Expected Impact**:
    - 200KB smaller initial bundle (20-30% reduction)
    - 1-2 seconds faster Time to Interactive
    - +10-15 points Lighthouse score
  - **Estimated Time**: 4 hours
  - **Risk**: Low

- [ ] **Add Response Caching to API Routes** ⭐
  - **Routes**: `/api/games`, `/api/jackpot/current`, `/api/bonuses/available`, `/api/loyalty/status`
  - **Fix**: Add `revalidate` export or implement Redis caching
  - **Expected Impact**:
    - 80% reduction in database queries
    - 10ms (cache) vs 100ms (database) = **10x faster**
    - Significant Supabase cost reduction
  - **Estimated Time**: 1 day
  - **Risk**: Low

- [ ] **Split Oversized Player Profile Modal**
  - **File**: `apps/admin/components/players-table-with-modal.tsx` (919 lines - LARGEST FILE)
  - **Problem**: 780 lines of modal code embedded in table component
  - **Fix**: Split into directory structure with separate tab components
  - **Expected Impact**:
    - Better maintainability (20 focused files vs 1 massive file)
    - Lazy load tabs only when clicked
    - Much easier to modify individual features
  - **Estimated Time**: 3 days
  - **Risk**: Medium (large refactor)

- [ ] **Optimize Realtime Subscription Pattern**
  - **File**: `apps/casino/lib/contexts/player-context.tsx:226-337`
  - **Problem**: Subscription handlers make unnecessary API calls
  - **Fix**: Update state directly from payload, add error handling
  - **Expected Impact**:
    - 50% reduction in API calls
    - More responsive real-time updates
    - Better battery life on mobile
  - **Estimated Time**: 1 day
  - **Risk**: Medium (need careful testing)

- [ ] **Split Auth Modals Component**
  - **File**: `apps/casino/components/auth-modals.tsx` (775 lines)
  - **Problem**: All 3 modals (login, signup, forgot password) load even when only one is used
  - **Fix**: Split into separate files with lazy loading
  - **Expected Impact**: ~250KB reduction in initial bundle
  - **Estimated Time**: 3 hours
  - **Risk**: Low

- [ ] **Create Shared Bonus Offer Fetching Hook**
  - **Files**: `wallet-dropdown.tsx:76-132` + `wallet-modal.tsx:73-120`
  - **Problem**: Identical 57-line bonus fetching logic in both files
  - **Fix**: Create `useBonusOffers()` hook
  - **Expected Impact**: Single source of truth, 114 lines → 60 lines
  - **Estimated Time**: 1 hour
  - **Risk**: Very Low
  - **Note**: Do this AFTER wallet component refactoring

- [ ] **Add Lazy Loading to Game Catalog**
  - **File**: `apps/casino/components/game-catalog-optimized.tsx`
  - **Problem**: Loads all games at once
  - **Fix**: Implement intersection observer + virtual scrolling
  - **Expected Impact**:
    - 2-3 seconds faster initial load
    - 60-70% reduction in memory usage
    - Much smoother mobile scrolling
  - **Estimated Time**: 1 day
  - **Risk**: Low

### 🚀 Major Refactorings (High Impact, High Effort)

- [ ] **Implement Centralized State Management with Zustand**
  - **Current**: 4 separate React Context providers causing unnecessary re-renders
  - **Fix**: Migrate to Zustand for fine-grained subscriptions
  - **Expected Impact**:
    - 60-80% reduction in re-renders across the app
    - ~10KB bundle size reduction
    - Better TypeScript support and DevTools
  - **Estimated Time**: 1 week
  - **Risk**: Medium-High (requires careful migration)

- [ ] **Database Query Optimization with Materialized Views**
  - **Problem**: Complex queries run on every page load
  - **Fix**: Create materialized views for common queries (player dashboard, loyalty status)
  - **Expected Impact**:
    - **10x faster** dashboard loads (500ms → 50ms)
    - 80% reduction in complex JOIN queries
    - Can handle 10x more concurrent users
  - **Estimated Time**: 1 week
  - **Risk**: Medium (requires refresh strategy)

- [ ] **Implement Service Worker for Offline Support**
  - **Current**: App breaks without internet connection
  - **Fix**: Add service worker with caching strategies
  - **Expected Impact**:
    - App remains functional offline
    - Instant load for cached resources
    - Better experience on unstable mobile connections
  - **Estimated Time**: 3 days
  - **Risk**: Medium

### 🔧 Incremental Improvements (Medium Impact, Low Effort)

- [ ] **Add React.memo to Prevent Unnecessary Re-renders**
  - **Components**: GameCard, BonusOfferCard, PaymentMethodButton, BalanceRow, StatusBadge
  - **Expected Impact**: 30-50% reduction in list component re-renders
  - **Estimated Time**: 2 hours
  - **Risk**: Very Low

- [ ] **Extract Repeated UI Patterns into Reusable Components**
  - **Patterns**: StatusBadge, LoadingSpinner, ErrorMessage, EmptyState
  - **Expected Impact**: ~200 lines eliminated, better consistency
  - **Estimated Time**: 4 hours
  - **Risk**: Very Low

- [ ] **Add Error Boundaries to Critical Sections**
  - **Areas**: Game catalog, wallet ops, auth modals, player dashboard
  - **Expected Impact**: App remains functional when one component fails
  - **Estimated Time**: 3 hours
  - **Risk**: Very Low

- [ ] **Optimize Image Loading with Next.js Image**
  - **Files**: `stake-sidebar.tsx:567,606`, game catalog, bonus offers
  - **Expected Impact**:
    - 20-30% improvement in LCP
    - 50-70% smaller image sizes
    - +5-10 Lighthouse points
  - **Estimated Time**: 2 hours
  - **Risk**: Very Low

- [ ] **Add Request Deduplication**
  - **Problem**: Multiple components trigger same API call simultaneously
  - **Fix**: Create `useApiRequest` hook with deduplication
  - **Expected Impact**: 40-60% reduction for common requests
  - **Estimated Time**: 3 hours
  - **Risk**: Low

### 📋 Long-Term Roadmap (Medium Impact, High Effort)

- [ ] **Migrate to Next.js 15 Server Components**
  - **Candidates**: Static game lists, promotion pages, VIP tiers, T&C, FAQ
  - **Expected Impact**: 30-40% reduction in client-side JavaScript
  - **Estimated Time**: 2 weeks
  - **Risk**: High (architectural changes)

- [ ] **Implement GraphQL API Layer**
  - **Current**: REST API with potential overfetching
  - **Expected Impact**: More flexible data fetching, reduced API calls
  - **Estimated Time**: 3 weeks
  - **Risk**: High (new technology)

- [ ] **Add Advanced Caching with Redis**
  - **Data**: User sessions, game catalog, bonus offers, leaderboards
  - **Expected Impact**: 70-80% reduction in database queries
  - **Estimated Time**: 1 week
  - **Risk**: Medium (requires Redis setup)

## 🚀 Future Enhancements

### Code Quality Improvements

- [ ] **Add Component Performance Optimizations**
  - Use `useMemo` for expensive calculations in large components
  - Use `React.memo` for sub-components that re-render unnecessarily
  - Add `React.lazy` for modal components
  - **Priority Files**:
    - `players-table-with-modal.tsx` - Modal renders even when closed
    - `stake-sidebar.tsx` - Recalculates styles on every pathname change
    - `wallet-dropdown.tsx` - Recalculates bonuses on every render
  - **Expected Impact**: Reduce unnecessary re-renders by 50-70%

- [ ] **Package Script Safety Improvements**
  - Add confirmation prompts to dangerous scripts (like `clean`)
  - Add pre-deploy checks (tests, linting, build verification)
  - Create `verify` script that runs all quality checks
  - **Recommended additions**:
    - `predeploy:casino`: Run tests + build before deploy
    - `predeploy:admin`: Run tests + build before deploy
    - `verify`: Run lint + type-check + test

- [ ] **Improve Error Boundaries**
  - Add error boundaries to all modal components
  - Add error boundaries to page-level components
  - Currently only in `packages/ui/src/components/error-boundary.tsx`
  - Need integration with error reporting (Sentry/LogRocket)

### Testing & Quality
- [ ] Increase test coverage to 90%
- [ ] Add E2E tests with Playwright
- [ ] Add performance testing
- [ ] Add visual regression testing
- [ ] Add automated RLS policy testing
- [ ] Add database integration tests
- [ ] Add load testing for Edge Functions
- [ ] Add security testing (penetration tests)

### Features
- [ ] A/B testing framework
- [ ] Feature flags system
- [ ] Advanced analytics dashboard
- [ ] Real-time notifications
- [ ] Mobile app (React Native)
- [ ] Multi-language support (i18n)
- [ ] Dark mode toggle
- [ ] Game search and filtering improvements
- [ ] Social features (friends, achievements)
- [ ] Tournament system

### Infrastructure
- [ ] Multi-region deployment
- [ ] Microservices architecture (at 50K+ users)
- [ ] Advanced caching strategies with Redis
- [ ] GraphQL API layer
- [ ] WebSocket improvements
- [ ] CDN optimization for static assets
- [ ] Database read replicas for scaling
- [ ] Kubernetes deployment for high availability
- [ ] Disaster recovery automation

### Database Optimizations (Long-term)
- [ ] **Implement Database Sharding Strategy**
  - Shard by user_id for horizontal scaling
  - Route queries to appropriate shards
  - Implement cross-shard queries where needed
  - **When**: At 100K+ active users

- [ ] **Add Database Partitioning**
  - Partition `transactions` table by date (monthly partitions)
  - Partition `callback_logs` by date (weekly partitions)
  - Partition `game_rounds` by date (monthly partitions)
  - **Expected Impact**: 10x faster queries on recent data
  - **When**: When tables exceed 10M rows

- [ ] **Implement Event Sourcing for Critical Tables**
  - Store all balance changes as immutable events
  - Rebuild balance from event stream
  - Better audit trail and debugging
  - **When**: Before launching real money transactions

- [ ] **Add Database Replication**
  - Set up read replicas for analytics queries
  - Separate read/write workloads
  - Reduce load on primary database
  - **When**: Database CPU consistently >70%

### Security Enhancements
- [ ] Implement rate limiting on all API routes
- [ ] Add CAPTCHA for signup/login
- [ ] Implement 2FA for withdrawals
- [ ] Add fraud detection system
- [ ] Implement IP geofencing for compliance
- [ ] Add session management improvements
- [ ] Implement CSP headers
- [ ] Add CSRF protection
- [ ] Regular security audits and penetration testing

### Performance Optimizations (Advanced)
- [ ] Implement Service Worker for offline support
- [ ] Add Progressive Web App (PWA) features
- [ ] Implement virtual scrolling for all long lists
- [ ] Add image lazy loading and optimization
- [ ] Implement skeleton screens for better perceived performance
- [ ] Add request batching and deduplication
- [ ] Optimize bundle splitting strategy
- [ ] Implement HTTP/3 and QUIC protocol
- [ ] Add edge caching with Vercel Edge Functions

### AI/ML
- [ ] Predictive analytics for player behavior
- [ ] Personalized game recommendations
- [ ] Fraud detection with ML models
- [ ] Customer churn prediction
- [ ] Automated customer segmentation
- [ ] Natural language processing for SMS conversations
- [ ] Sentiment analysis for support tickets
- [ ] Anomaly detection for suspicious transactions

### Compliance & Legal
- [ ] GDPR data export/deletion automation
- [ ] Responsible gambling tools (limits, self-exclusion)
- [ ] Age verification improvements
- [ ] Automated compliance reporting
- [ ] Transaction monitoring for AML compliance
- [ ] Audit log improvements
- [ ] Terms of service version tracking
- [ ] Cookie consent management

### Analytics & Business Intelligence
- [ ] Real-time dashboards for KPIs
- [ ] Player cohort analysis
- [ ] Funnel analysis for conversion optimization
- [ ] Predictive lifetime value calculations
- [ ] A/B testing framework with statistical significance
- [ ] Revenue attribution modeling
- [ ] Automated anomaly detection in metrics
- [ ] Custom report builder for non-technical users

---

## ✅ Recently Completed

### October 14, 2025

**Wallet Component Refactoring Completed:**

- [x] **Extract Wallet Component Duplication** ✅
  - Refactored `wallet-dropdown.tsx` and `wallet-modal.tsx` from 1,482 lines to 568 lines (62% reduction)
  - Created 3 shared hooks: `useWalletState`, `useBonusOffers`, `usePaymentMethods` (383 lines total)
  - Created 4 shared components: `BonusOfferList`, `PaymentMethodGrid`, `AmountInput`, `BalanceSummary` (371 lines total)
  - Achieved single source of truth for wallet logic
  - Estimated 30-40KB bundle size reduction
  - Improved maintainability and testability
  - Added performance optimizations (memoization) in wallet-modal
  - Full documentation in WALLET_REFACTORING_SUMMARY.md

**Comprehensive Project Audit Completed:**

- [x] **Project-Wide Code Audit** ✅
  - Audited all 8 largest files (500-919 lines each)
  - Analyzed 32 SQL migration files
  - Reviewed 100+ TypeScript/JavaScript files
  - Identified 34 TypeScript compilation errors
  - Found 4 npm security vulnerabilities
  - Discovered critical SQL injection and XSS risks
  - Mapped 50 console.log statements in source code
  - Analyzed ~200 `any` type usages
  - Reviewed all edge functions for security issues
  - Generated comprehensive 400+ line audit report
  - All findings added to TODO.md with priorities and time estimates

- [x] **Comprehensive Refactoring & Performance Audit** ✅
  - Deep-dive analysis of entire codebase (224 TypeScript files)
  - Identified **87 refactoring opportunities** organized by impact/effort
  - Analyzed component architecture, database queries, API routes, bundle size
  - Found 60% code duplication in wallet components
  - Identified N+1 query problems (6x performance improvement possible)
  - Discovered ~200KB of unnecessarily bundled modal code
  - Mapped memoization opportunities (50-70% re-render reduction)
  - Created detailed 3-month refactoring roadmap
  - Generated 2,550-line report: `REFACTORING_AUDIT_2025-10-14.md`
  - **Key Finding**: Top 10 quick wins can achieve 40-50% of total expected improvement in just 1 week
  - All refactorings added to TODO.md with impact estimates and timelines

**Major Infrastructure Work:**

- [x] **Supabase Configuration Refactor**
  - Standardized environment variables across casino and admin apps
  - Fixed mismatched ANON keys between apps
  - Added service role client helper to casino app
  - Enhanced all Supabase client configurations with comprehensive documentation
  - Created admin app config.toml
  - Fixed all TypeScript build errors in admin app
  - Both apps now build successfully
  - Created comprehensive SUPABASE_SETUP.md guide (400+ lines)

- [x] **Testing Infrastructure Setup** ✅
  - Installed Jest 30.2.0 + React Testing Library in both apps
  - Created jest.config.js with Next.js integration
  - Set up test environment with mocks for Next.js router, Image, env vars
  - Created 53 passing example tests across all packages
  - Added test scripts (test, test:watch, test:coverage)
  - Created comprehensive TESTING.md guide (300+ lines)
  - Created TESTING_QUICK_REFERENCE.md for common patterns
  - Created TEST_SETUP_SUMMARY.md with detailed overview

- [x] **Security Audit Addressed**
  - Reviewed npm/pnpm audit vulnerabilities (4 found: 1 low, 3 moderate)
  - Vulnerabilities are in dev dependencies only (esbuild, fast-redact)
  - Updated packages to latest versions
  - Documented that remaining issues are non-critical (dev-only, no fix available)
  - Production builds are not affected

- [x] **Logging Infrastructure Documentation**
  - Created LOGGING_MIGRATION_GUIDE.md (comprehensive guide)
  - Documented migration patterns from console.log to @mypokies/monitoring
  - Provided phase-by-phase migration strategy
  - Started migration in critical paths (example in player profile API)
  - 2,403 console statements identified for gradual migration

- [x] **Memory Leak Fixes** (October 14, 2025)
  - Audited all 14 files with setInterval/setTimeout
  - Fixed 3 critical memory leaks (jackpot-animation-context, balance-counter, jackpot-counter)
  - Verified 9 files already had proper cleanup
  - Added useRef tracking and cleanup functions where missing
  - Verified 2 intentional one-time timers as acceptable

- [x] **ESLint-Disable Comments Cleanup** (October 14, 2025)
  - Reviewed all 36 eslint-disable comments
  - Fixed 34 underlying issues (94%)
  - Fixed 8 @typescript-eslint/no-unused-vars - exported interfaces
  - Fixed 24 @typescript-eslint/no-explicit-any - proper Supabase types
  - Kept 2 legitimate disables (test mocks) with explanatory comments
  - Modified 27 files total
  - Both apps now have cleaner, more type-safe code

### January 2025
- [x] Full TypeScript error resolution (34 → 0)
- [x] Complete lint warning cleanup (198 → 0)
- [x] Documentation consolidation
- [x] Package READMEs (11 created)
- [x] Environment file examples
- [x] Old shared/ directory cleanup

### October 2025
- [x] Monorepo migration to Turborepo
- [x] 11 shared packages created
- [x] Security implementation (@mypokies/security)
- [x] Performance optimization (cache, database, edge)
- [x] Full CI/CD pipeline
- [x] Comprehensive monitoring

---

## 📋 How to Use This File

### Adding New TODOs
When you find something that needs to be done:
1. Add it to the appropriate priority section
2. Include location (file and line number)
3. Describe what's needed clearly
4. Add any relevant context

### Completing TODOs
When you complete an item:
1. Move it to "Recently Completed" section
2. Add the completion date
3. Remove from the priority section

### Priority Guidelines
- **High Priority**: Impacts functionality, security, or user experience
- **Medium Priority**: Feature enhancements or code quality improvements
- **Future Enhancements**: Nice-to-have features for later

---

## 🔗 Related Documents

- **[PROJECT-OVERVIEW.md](./PROJECT-OVERVIEW.md)** - Current project state
- **[HISTORY.md](./HISTORY.md)** - Project evolution
- **[AGENTS.md](./AGENTS.md)** - Development guidelines

---

**Note**: This file should be updated regularly as work progresses. Feel free to add, modify, or complete items as needed.
