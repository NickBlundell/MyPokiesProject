#!/bin/bash

# Deploy Rate-Limited Edge Functions
# This script deploys the updated Edge Functions with rate limiting enabled

set -e  # Exit on error

PROJECT_REF="hupruyttzgeytlysobar"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "Deploying Rate-Limited Edge Functions"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}Error: Not logged into Supabase CLI${NC}"
    echo "Login with: supabase login"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking environment variables...${NC}"
echo ""

# Check if secrets are set
echo "Checking if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set..."
echo ""
echo -e "${YELLOW}Note: If these are not set, rate limiting will be disabled (fail-safe mode)${NC}"
echo ""

read -p "Have you set up Upstash Redis credentials in Supabase? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}Please set up Upstash Redis credentials first:${NC}"
    echo ""
    echo "1. Create a database at https://console.upstash.com/"
    echo "2. Copy the REST URL and TOKEN"
    echo "3. Set secrets with:"
    echo ""
    echo "   supabase secrets set UPSTASH_REDIS_REST_URL=\"your-url\" --project-ref $PROJECT_REF"
    echo "   supabase secrets set UPSTASH_REDIS_REST_TOKEN=\"your-token\" --project-ref $PROJECT_REF"
    echo ""
    echo "For detailed instructions, see: RATE_LIMITING_SETUP.md"
    echo ""
    exit 0
fi

echo ""
echo -e "${GREEN}Step 2: Deploying onewallet-callback...${NC}"
echo ""

cd "$SCRIPT_DIR/apps/casino" || exit 1

echo "Deploying onewallet-callback Edge Function..."
supabase functions deploy onewallet-callback \
    --project-ref "$PROJECT_REF" \
    --no-verify-jwt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ onewallet-callback deployed successfully${NC}"
else
    echo -e "${RED}✗ Failed to deploy onewallet-callback${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 3: Deploying twilio-inbound-webhook...${NC}"
echo ""

cd "$SCRIPT_DIR/apps/admin" || exit 1

echo "Deploying twilio-inbound-webhook Edge Function..."
supabase functions deploy twilio-inbound-webhook \
    --project-ref "$PROJECT_REF" \
    --no-verify-jwt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ twilio-inbound-webhook deployed successfully${NC}"
else
    echo -e "${RED}✗ Failed to deploy twilio-inbound-webhook${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Rate limiting is now active for:"
echo "  • onewallet-callback: 100 requests/min per IP"
echo "  • twilio-inbound-webhook: 10 SMS/min per phone number"
echo ""
echo "Next steps:"
echo "  1. Monitor logs: supabase functions logs onewallet-callback --project-ref $PROJECT_REF"
echo "  2. Check Upstash analytics: https://console.upstash.com/"
echo "  3. Test rate limiting with rapid requests"
echo ""
echo "For monitoring and troubleshooting, see: RATE_LIMITING_SETUP.md"
echo ""
