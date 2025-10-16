# @mypokies/types

Shared TypeScript type definitions for the MyPokies platform. Contains all database types, API types, and domain types used across the monorepo.

## Installation

This package is part of the MyPokies monorepo. Add it to your app's dependencies:

```json
{
  "dependencies": {
    "@mypokies/types": "workspace:*"
  }
}
```

## Usage

### Import Types

```typescript
import {
  User,
  Transaction,
  GameRound,
  BonusOffer,
  PlayerBonus,
  JackpotPool,
  LoyaltyTier,
  ApiResponse,
  PaginatedResponse
} from '@mypokies/types'

// Use in your application
const user: User = {
  id: 'user-123',
  external_user_id: 'ext-123',
  email: 'user@example.com',
  auth_user_id: 'auth-123',
  account_status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

// API response typing
const response: ApiResponse<User> = {
  success: true,
  data: user
}

// Paginated response
const paginatedUsers: PaginatedResponse<User> = {
  data: [user],
  total: 1,
  limit: 10,
  offset: 0,
  has_more: false
}
```

### Transaction Types

```typescript
import {
  Transaction,
  TransactionType,
  TRANSACTION_TYPES
} from '@mypokies/types'

const transaction: Transaction = {
  id: 'txn-123',
  tid: 'T-20240101-001',
  user_id: 'user-123',
  currency: 'AUD',
  type: 'debit',
  subtype: 'bet',
  amount: 10.00,
  balance_before: 100.00,
  balance_after: 90.00,
  created_at: new Date().toISOString(),
  processed_at: new Date().toISOString()
}

// Type validation
const validTypes: TransactionType[] = TRANSACTION_TYPES
```

### Bonus System Types

```typescript
import {
  BonusOffer,
  PlayerBonus,
  BonusType,
  BonusStatus,
  BONUS_TYPES,
  BONUS_STATUSES
} from '@mypokies/types'

const bonusOffer: BonusOffer = {
  id: 'bonus-123',
  bonus_code: 'WELCOME100',
  bonus_name: 'Welcome Bonus',
  bonus_type: 'deposit_match',
  match_percentage: 100,
  max_bonus_amount: 500,
  min_deposit_amount: 20,
  wagering_requirement_multiplier: 35,
  wagering_applies_to: 'deposit_and_bonus',
  valid_from: new Date().toISOString(),
  active: true,
  auto_apply: false,
  one_time_per_user: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
```

### VIP/Loyalty Types

```typescript
import {
  LoyaltyTier,
  PlayerLoyalty,
  LoyaltyPointsTransaction
} from '@mypokies/types'

const tier: LoyaltyTier = {
  id: 'tier-gold',
  tier_name: 'Gold',
  tier_level: 3,
  points_required: 10000,
  cashback_rate: 0.05,
  points_per_dollar_redemption: 100,
  withdrawal_priority: 'fast',
  birthday_bonus: 50,
  has_personal_manager: false,
  jackpot_ticket_rate: 1.2,
  benefits: {
    weeklyBonus: true,
    prioritySupport: true
  },
  created_at: new Date().toISOString()
}
```

### Jackpot Types

```typescript
import {
  JackpotPool,
  JackpotTicket,
  JackpotWinner,
  JackpotType,
  JackpotStatus
} from '@mypokies/types'

const jackpot: JackpotPool = {
  id: 'jackpot-weekly',
  jackpot_name: 'Weekly Mega Jackpot',
  jackpot_type: 'weekly',
  current_amount: 50000,
  seed_amount: 10000,
  contribution_rate: 0.01,
  draw_frequency: 'weekly',
  draw_day_of_week: 5,
  draw_time: '20:00:00',
  next_draw_at: new Date().toISOString(),
  status: 'active',
  draw_number: 52,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
```

### Admin Types

```typescript
import {
  AdminUser,
  AdminAuditLog,
  AdminRole,
  ADMIN_ROLES
} from '@mypokies/types'

const admin: AdminUser = {
  id: 'admin-123',
  email: 'admin@mypokies.com',
  full_name: 'John Admin',
  role: 'admin',
  permissions: ['view_users', 'edit_bonuses'],
  is_active: true,
  two_factor_enabled: true,
  last_login: new Date().toISOString(),
  last_ip: '192.168.1.1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
```

### Support Types

```typescript
import {
  SupportTicket,
  TicketMessage,
  TicketStatus,
  TicketPriority,
  TICKET_STATUSES,
  TICKET_PRIORITIES
} from '@mypokies/types'

const ticket: SupportTicket = {
  id: 'ticket-123',
  player_id: 'user-123',
  subject: 'Withdrawal issue',
  description: 'Cannot process withdrawal',
  status: 'open',
  priority: 'high',
  category: 'financial',
  assigned_to: 'admin-456',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
```

### Game Types

```typescript
import { Game, GameStatistics } from '@mypokies/types'

const game: Game = {
  id: 1,
  game_name: 'Mega Fortune Slots',
  game_provider: 'NetEnt',
  game_type: 'slot',
  thumbnail_url: 'https://cdn.example.com/games/mega-fortune.jpg',
  is_active: true,
  popularity_score: 95,
  release_date: '2023-01-01',
  rtp: 96.5,
  volatility: 'high',
  max_win: 100000,
  features: ['free_spins', 'multiplier', 'wild'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
```

## Type Categories

### Core Types
- `User` - User account
- `UserBalance` - User balance tracking
- `Transaction` - Financial transactions
- `GameRound` - Game sessions
- `RoundAction` - Game actions

### Loyalty System
- `LoyaltyTier` - VIP tier definitions
- `PlayerLoyalty` - Player loyalty status
- `LoyaltyPointsTransaction` - Points history

### Bonus System
- `BonusOffer` - Bonus definitions
- `PlayerBonus` - Player bonus instances

### Jackpot System
- `JackpotPool` - Jackpot definitions
- `JackpotTicket` - Ticket allocations
- `JackpotWinner` - Draw results

### Gaming
- `Game` - Game catalog
- `GameStatistics` - Game analytics

### Admin
- `AdminUser` - Admin accounts
- `AdminAuditLog` - Audit trail
- `PlayerNote` - Player notes

### Support
- `SupportTicket` - Support tickets
- `TicketMessage` - Ticket messages

### Marketing
- `MarketingLead` - CRM leads
- `SMSMessage` - SMS communications

### Unified Views
- `UnifiedUserProfile` - Complete user profile with aggregated data

### API Types
- `ApiResponse<T>` - Standard API response
- `PaginatedResponse<T>` - Paginated data response

## Type Enums

### Status Enums
- `TransactionType` - debit, credit, rollback, promotion_win
- `BonusType` - deposit_match, no_deposit, cashback, free_spins, reload
- `BonusStatus` - pending, active, completed, forfeited, expired, cancelled
- `JackpotType` - weekly, daily, monthly
- `JackpotStatus` - active, drawing, paused
- `GameRoundStatus` - active, completed, rolled_back
- `TicketStatus` - open, in_progress, resolved, closed
- `TicketPriority` - low, medium, high, urgent
- `AdminRole` - super_admin, admin, support, marketing, finance

### Constant Arrays
- `TRANSACTION_TYPES` - All transaction types
- `BONUS_TYPES` - All bonus types
- `BONUS_STATUSES` - All bonus statuses
- `ADMIN_ROLES` - All admin roles
- `TICKET_STATUSES` - All ticket statuses
- `TICKET_PRIORITIES` - All ticket priorities

## Configuration

No configuration required. This package only exports TypeScript types.

## Development

### Build the package

```bash
npm run build
```

### Watch mode

```bash
npm run dev
```

### Type checking

```bash
npm run type-check
```

## Best Practices

1. Import types, not values (use `import type` when possible)
2. Use discriminated unions for status types
3. Prefer specific types over `any`
4. Use const arrays for validation
5. Keep types in sync with database schema
6. Document complex types with JSDoc comments

## Type Safety

All types are:
- Fully typed with TypeScript
- Aligned with database schema
- Shared across all applications
- Validated at compile time
- Self-documenting

## Dependencies

This package has no runtime dependencies. It only exports TypeScript types.
