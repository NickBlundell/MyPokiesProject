# Rate Limiting Quick Start Guide

## 5-Minute Setup

### 1. Create Upstash Redis Database (2 minutes)

1. Visit: https://console.upstash.com/
2. Sign up/Login
3. Click "Create Database"
4. Select:
   - Region: **Asia Pacific (Sydney)** (ap-southeast-2)
   - Name: `mypokies-rate-limiting`
5. Copy credentials from database page

### 2. Set Supabase Secrets (1 minute)

```bash
# Set secrets
supabase secrets set UPSTASH_REDIS_REST_URL="https://your-url.upstash.io" --project-ref hupruyttzgeytlysobar
supabase secrets set UPSTASH_REDIS_REST_TOKEN="your-token-here" --project-ref hupruyttzgeytlysobar

# Verify
supabase secrets list --project-ref hupruyttzgeytlysobar
```

### 3. Deploy Edge Functions (2 minutes)

```bash
# Run deployment script
cd /Users/jo/MyPokiesProject
./deploy-rate-limited-functions.sh
```

**OR** deploy manually:

```bash
# Deploy onewallet-callback
cd apps/casino
supabase functions deploy onewallet-callback --project-ref hupruyttzgeytlysobar --no-verify-jwt

# Deploy twilio-inbound-webhook
cd ../apps/admin
supabase functions deploy twilio-inbound-webhook --project-ref hupruyttzgeytlysobar --no-verify-jwt
```

## That's It!

Rate limiting is now active:
- **onewallet-callback**: 100 requests/min per IP
- **twilio-inbound-webhook**: 10 SMS/min per phone number

## Verify It's Working

### Test onewallet-callback

```bash
# Send 15 rapid requests (should see rate limit after ~10th)
for i in {1..15}; do
  curl -X POST https://hupruyttzgeytlysobar.supabase.co/functions/v1/onewallet-callback \
    -H "Content-Type: application/json" \
    -d '{"c_action":"ping","c_hashcode":"test"}' &
done
```

### Monitor Logs

```bash
# Real-time logs
supabase functions logs onewallet-callback --project-ref hupruyttzgeytlysobar --tail

# Look for "Rate limit exceeded" warnings
```

### Check Upstash Analytics

1. Go to: https://console.upstash.com/
2. Select your database
3. Click "Analytics" tab
4. View rate limit hits and patterns

## Response Examples

### Rate Limit Exceeded - onewallet-callback

**Response**:
```json
{
  "i_result": 2,
  "c_text": "Rate limit exceeded"
}
```

**Headers**:
```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-10-14T07:15:00.000Z
Retry-After: 42
```

### Rate Limit Exceeded - twilio-inbound-webhook

**Response**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Rate limit exceeded. Please wait before sending more messages.</Message>
</Response>
```

## Troubleshooting

### Rate Limiting Not Working?

1. **Check secrets are set**:
   ```bash
   supabase secrets list --project-ref hupruyttzgeytlysobar
   ```

2. **Check Edge Function logs**:
   ```bash
   supabase functions logs onewallet-callback --project-ref hupruyttzgeytlysobar
   ```
   Look for: "Rate limiting not enabled - Redis credentials not configured"

3. **Test Redis connection**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-redis-url.upstash.io/ping
   ```

### Adjust Rate Limits

Edit the configuration and redeploy:

**onewallet-callback** (`apps/casino/supabase/functions/onewallet-callback/index.ts`):
```typescript
const rateLimitResult = await checkRateLimit(clientIP, {
  requests: 200,  // Change from 100 to 200
  window: '1 m',
  prefix: 'ratelimit:onewallet',
  analytics: true
})
```

**twilio-inbound-webhook** (`apps/admin/supabase/functions/twilio-inbound-webhook/index.ts`):
```typescript
const rateLimitResult = await checkRateLimit(phoneNumber, {
  requests: 20,  // Change from 10 to 20
  window: '1 m',
  prefix: 'ratelimit:sms',
  analytics: true
})
```

Then redeploy:
```bash
./deploy-rate-limited-functions.sh
```

## Cost

- **Free tier**: 10,000 requests/day
- **Production**: ~$6/month for 100K requests/day

## Support

Full documentation: [RATE_LIMITING_SETUP.md](./RATE_LIMITING_SETUP.md)

## Summary

✅ **onewallet-callback** protected (100 req/min per IP)
✅ **twilio-inbound-webhook** protected (10 SMS/min per phone)
✅ Upstash Redis configured
✅ Edge Functions deployed
✅ Monitoring enabled
✅ Fail-safe: allows traffic if Redis is down

**You're all set!** 🎉
