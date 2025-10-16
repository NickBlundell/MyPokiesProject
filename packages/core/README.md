# @mypokies/core

Core business logic for the MyPokies platform including bonus engine, VIP/loyalty system, and jackpot management. This package contains the domain logic shared between the player app and admin panel.

## Installation

This package is part of the MyPokies monorepo. Add it to your app's dependencies:

```json
{
  "dependencies": {
    "@mypokies/core": "workspace:*"
  }
}
```

## Usage

### Bonus Engine

Manages bonus offers, wagering requirements, and bonus lifecycle:

```typescript
import { BonusEngine } from '@mypokies/core'

const bonusEngine = new BonusEngine()

// Award a deposit match bonus
const bonus = await bonusEngine.awardDepositBonus({
  userId: 'user-123',
  depositAmount: 100,
  bonusOfferId: 'welcome-100'
})

// Track wagering progress
await bonusEngine.updateWagering({
  bonusId: bonus.id,
  wagerAmount: 10
})

// Check if bonus is complete
const isComplete = await bonusEngine.checkBonusCompletion(bonus.id)
```

### VIP System

Manages player loyalty tiers, points, and benefits:

```typescript
import { VIPSystem } from '@mypokies/core'

const vipSystem = new VIPSystem()

// Award loyalty points for wagers
await vipSystem.awardPoints({
  userId: 'user-123',
  amount: 50,
  source: 'wager'
})

// Check and upgrade tier if eligible
await vipSystem.checkTierUpgrade('user-123')

// Redeem points for cash
const cashback = await vipSystem.redeemPoints({
  userId: 'user-123',
  points: 1000
})

// Get player's VIP status
const status = await vipSystem.getPlayerStatus('user-123')
```

### Jackpot Manager

Manages progressive jackpots, ticket allocation, and draws:

```typescript
import { JackpotManager } from '@mypokies/core'

const jackpotManager = new JackpotManager()

// Award jackpot tickets based on wager
const tickets = await jackpotManager.awardTickets({
  userId: 'user-123',
  wagerAmount: 100,
  jackpotPoolId: 'weekly-jackpot'
})

// Run a jackpot draw
const winners = await jackpotManager.runDraw({
  jackpotPoolId: 'weekly-jackpot',
  prizeDistribution: {
    '1st': 0.5,
    '2nd': 0.3,
    '3rd': 0.2
  }
})

// Get current jackpot amount
const amount = await jackpotManager.getCurrentAmount('weekly-jackpot')
```

### Validation Schemas

Zod schemas for validating business logic inputs:

```typescript
import {
  depositSchema,
  withdrawalSchema,
  betSchema,
  bonusClaimSchema
} from '@mypokies/core'

// Validate a deposit request
const result = depositSchema.safeParse({
  amount: 50,
  currency: 'AUD',
  paymentMethod: 'credit_card'
})

if (result.success) {
  // Process valid deposit
  const deposit = result.data
}
```

## API Documentation

### BonusEngine

- `awardDepositBonus(params)` - Award a deposit match bonus
- `awardNoDepositBonus(params)` - Award a no-deposit bonus
- `updateWagering(params)` - Update wagering progress
- `checkBonusCompletion(bonusId)` - Check if wagering requirements are met
- `forfeitBonus(bonusId, reason)` - Forfeit an active bonus
- `getActiveBonuses(userId)` - Get all active bonuses for a user

### VIPSystem

- `awardPoints(params)` - Award loyalty points
- `redeemPoints(params)` - Redeem points for cash/benefits
- `checkTierUpgrade(userId)` - Check and perform tier upgrade
- `getPlayerStatus(userId)` - Get current VIP status
- `calculateTierBenefits(tierId)` - Get benefits for a tier
- `getTierProgress(userId)` - Get progress to next tier

### JackpotManager

- `awardTickets(params)` - Award jackpot tickets based on wager
- `runDraw(params)` - Execute a jackpot draw
- `getCurrentAmount(poolId)` - Get current jackpot pool amount
- `contributeToPot(params)` - Add contribution to jackpot pool
- `getPlayerTickets(userId, poolId)` - Get player's tickets
- `getDrawHistory(poolId)` - Get past draw results

### Validation Schemas

All validation schemas are exported from `@mypokies/core/validation`:

- `depositSchema` - Validate deposit requests
- `withdrawalSchema` - Validate withdrawal requests
- `betSchema` - Validate bet/wager requests
- `bonusClaimSchema` - Validate bonus claims
- `vipRedemptionSchema` - Validate VIP point redemptions

## Configuration

No specific configuration required. The package uses database and types from other workspace packages.

## Development

### Build the package

```bash
npm run build
```

### Watch mode

```bash
npm run dev
```

### Run tests

```bash
npm run test
```

### Type checking

```bash
npm run type-check
```

## Architecture

This package contains:
- Business logic modules for core features
- Domain models and state management
- Validation schemas with Zod
- Calculations for bonuses, loyalty, and jackpots
- Rules engine for promotional features

## Dependencies

- `@mypokies/database` - Database access layer
- `@mypokies/types` - Shared TypeScript types
- `zod` - Schema validation
