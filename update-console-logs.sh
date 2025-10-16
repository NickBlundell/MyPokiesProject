#!/bin/bash

# Script to replace console statements with client logger in browser-compatible files

# List of files to update
files=(
  "apps/casino/lib/contexts/player-context.tsx"
  "apps/casino/lib/contexts/jackpot-animation-context.tsx"
  "apps/casino/lib/hooks/useRealtimeBonus.ts"
  "apps/casino/lib/hooks/useRealtimeLoyalty.ts"
  "apps/casino/lib/hooks/useRealtimeJackpotCached.ts"
  "apps/casino/lib/hooks/useRealtimeBalance.ts"
  "apps/casino/lib/hooks/useRealtimeTransactions.ts"
  "apps/casino/lib/hooks/cache-store.ts"
  "apps/casino/lib/hooks/useRealtimeGameRounds.ts"
  "apps/casino/lib/hooks/useRealtimeMyTickets.ts"
  "apps/casino/lib/hooks/useRealtimeJackpot.ts"
  "apps/casino/lib/hooks/useBonusOffers.ts"
  "apps/casino/app/error.tsx"
  "apps/admin/app/dashboard/crm/scheduled-messages/ScheduledMessagesClient.tsx"
  "apps/admin/app/dashboard/promotions/PromotionsClient.tsx"
)

echo "Updating console statements to use client logger..."

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Add import if not already present
    if ! grep -q "from '@/lib/utils/client-logger'" "$file" 2>/dev/null && ! grep -q "from '@/lib/utils/client-logger'" "$file" 2>/dev/null; then
      # Find the last import line and add our import after it
      sed -i '' '/^import .* from/a\
import { logDebug, logInfo, logWarn, logError } from '"'"'@/lib/utils/client-logger'"'"'
' "$file"
    fi

  else
    echo "Warning: $file not found, skipping..."
  fi
done

echo "Done! Files have been updated."
echo "Note: You may need to manually adjust the imports and replace console statements."
