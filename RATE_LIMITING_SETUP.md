# Rate Limiting Setup for Edge Functions

## Overview

Rate limiting has been implemented for the following Edge Functions to prevent DDoS attacks, SMS abuse, and database overload:

1. **onewallet-callback** - Fundist game callbacks (100 requests/min per IP)
2. **twilio-inbound-webhook** - SMS webhooks (10 SMS/min per phone number)

## Implementation Details

### Architecture

- **Provider**: Upstash Redis (serverless Redis for edge computing)
- **Library**: @upstash/ratelimit (sliding window algorithm)
- **Fail-safe**: If Redis is unavailable, requests are allowed (fail-open policy)
- **Monitoring**: All rate limit events are logged with full metadata

### Rate Limit Configurations

#### onewallet-callback
- **Limit**: 100 requests per minute per IP address
- **Window**: Sliding window (1 minute)
- **Identifier**: Client IP address (x-forwarded-for or x-real-ip)
- **Response**: Returns HTTP 200 with error body (prevents Fundist retries)
- **Headers**: Includes X-RateLimit-* headers for monitoring

#### twilio-inbound-webhook
- **Limit**: 10 SMS per minute per phone number
- **Window**: Sliding window (1 minute)
- **Identifier**: Phone number (From field)
- **Response**: Returns TwiML message informing user (HTTP 200 to prevent Twilio retries)
- **Headers**: Includes X-RateLimit-* headers for monitoring

## Setup Instructions

### 1. Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Sign up or log in
3. Click "Create Database"
4. Select:
   - **Type**: Regional (lower latency) or Global (higher availability)
   - **Region**: Choose closest to your Supabase region (ap-southeast-2 for Sydney)
   - **Name**: mypokies-rate-limiting
5. Click "Create"
6. Copy the credentials:
   - **UPSTASH_REDIS_REST_URL**
   - **UPSTASH_REDIS_REST_TOKEN**

### 2. Set Environment Variables in Supabase

#### Option A: Using Supabase CLI

```bash
# Set Upstash Redis credentials
supabase secrets set UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
supabase secrets set UPSTASH_REDIS_REST_TOKEN="your-redis-token"

# Verify secrets are set
supabase secrets list
```

#### Option B: Using Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **hupruyttzgeytlysobar** (MyPokies)
3. Navigate to: **Project Settings > Edge Functions > Secrets**
4. Add the following secrets:
   - `UPSTASH_REDIS_REST_URL`: `https://your-redis-url.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN`: `your-redis-token`

### 3. Deploy Edge Functions

#### Deploy onewallet-callback

```bash
cd /Users/jo/MyPokiesProject/apps/casino

# Deploy with all dependencies
supabase functions deploy onewallet-callback \
  --project-ref hupruyttzgeytlysobar \
  --no-verify-jwt
```

#### Deploy twilio-inbound-webhook

```bash
cd /Users/jo/MyPokiesProject/apps/admin

# Deploy with all dependencies
supabase functions deploy twilio-inbound-webhook \
  --project-ref hupruyttzgeytlysobar \
  --no-verify-jwt
```

### 4. Update Local Environment Files

Add Upstash credentials to your local `.env.local` files for testing:

**apps/admin/.env.local**:
```env
# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

**apps/casino/.env.local**:
```env
# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

## Files Modified/Created

### New Files

- `/apps/casino/supabase/functions/_shared/rate-limit.ts` - Rate limiting utility module
- `/apps/admin/supabase/functions/_shared/rate-limit.ts` - Rate limiting utility module (copy)

### Modified Files

- `/apps/casino/supabase/functions/onewallet-callback/index.ts` - Added rate limiting
- `/apps/admin/supabase/functions/twilio-inbound-webhook/index.ts` - Added rate limiting

## Testing

### Test Rate Limiting Locally

You can test rate limiting locally using the Supabase CLI:

```bash
# Start local Supabase
supabase start

# Serve Edge Function locally
cd apps/casino
supabase functions serve onewallet-callback --env-file .env.local

# In another terminal, send rapid requests
for i in {1..15}; do
  curl -X POST http://localhost:54321/functions/v1/onewallet-callback \
    -H "Content-Type: application/json" \
    -d '{"c_action": "ping", "c_hashcode": "test"}' &
done
```

### Monitor Rate Limiting

Check Edge Function logs for rate limit events:

```bash
# View logs
supabase functions logs onewallet-callback --project-ref hupruyttzgeytlysobar

# Look for entries like:
# {
#   "level": "WARN",
#   "message": "Rate limit exceeded",
#   "client_ip": "203.0.113.42",
#   "limit": 100,
#   "remaining": 0,
#   "reset": "2025-10-14T07:15:00.000Z"
# }
```

### Test SMS Rate Limiting

Send multiple SMS to your Twilio number rapidly to trigger rate limiting:

```bash
# The 11th message within a minute should receive the rate limit response
```

## Response Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 2025-10-14T07:15:00.000Z
Retry-After: 42
```

## Rate Limit Exceeded Responses

### onewallet-callback

```json
{
  "i_result": 2,
  "c_text": "Rate limit exceeded"
}
```

HTTP Status: 200 (to prevent Fundist retries)

### twilio-inbound-webhook

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Rate limit exceeded. Please wait before sending more messages.</Message>
</Response>
```

HTTP Status: 200 (to prevent Twilio retries)

## Monitoring & Analytics

### Upstash Dashboard

1. Log into [Upstash Console](https://console.upstash.com/)
2. Select your database
3. Go to the **Analytics** tab
4. View:
   - Total requests
   - Rate limit hits
   - Geographic distribution
   - Top identifiers (IPs/phone numbers)

### Supabase Logs

Monitor rate limit events in Edge Function logs:

```bash
# Real-time logs
supabase functions logs onewallet-callback --tail

# Filter for rate limit events
supabase functions logs onewallet-callback | grep "Rate limit"
```

### Log Format

Rate limit logs include:

```json
{
  "timestamp": "2025-10-14T07:12:34.567Z",
  "endpoint": "onewallet-callback",
  "identifier": "203.0.113.42",
  "allowed": false,
  "limit": 100,
  "remaining": 0,
  "reset": "2025-10-14T07:15:00.000Z",
  "enabled": true
}
```

## Adjusting Rate Limits

To adjust rate limits, edit the configuration in the Edge Function code:

### onewallet-callback Rate Limit

File: `apps/casino/supabase/functions/onewallet-callback/index.ts`

```typescript
const rateLimitResult = await checkRateLimit(clientIP, {
  requests: 100,      // Change this value
  window: '1 m',      // Change window: '10 s', '1 m', '1 h', '24 h'
  prefix: 'ratelimit:onewallet',
  analytics: true
})
```

### twilio-inbound-webhook Rate Limit

File: `apps/admin/supabase/functions/twilio-inbound-webhook/index.ts`

```typescript
const rateLimitResult = await checkRateLimit(phoneNumber, {
  requests: 10,       // Change this value
  window: '1 m',      // Change window: '10 s', '1 m', '1 h', '24 h'
  prefix: 'ratelimit:sms',
  analytics: true
})
```

After changing, redeploy the Edge Function:

```bash
supabase functions deploy onewallet-callback --project-ref hupruyttzgeytlysobar
```

## Cost Estimate

### Upstash Redis Pricing

- **Free Tier**: 10,000 requests/day
- **Pay-as-you-go**: $0.20 per 100,000 requests
- **Fixed Pricing**: Starting at $10/month for 1M requests

### Recommended Plan

For production with 100K requests/day:
- **Estimated cost**: ~$6/month
- **Plan**: Pay-as-you-go (most cost-effective)

## Troubleshooting

### Rate Limiting Not Working

1. **Check Redis credentials**:
   ```bash
   supabase secrets list
   ```

2. **Verify credentials are correct**:
   - Log into Upstash Console
   - Check REST URL and token
   - Ensure region is accessible from Supabase

3. **Check Edge Function logs**:
   ```bash
   supabase functions logs onewallet-callback
   ```
   Look for: "Rate limiting not enabled - Redis credentials not configured"

### Legitimate Traffic Being Blocked

If legitimate traffic is being rate limited:

1. **Increase rate limits** (see "Adjusting Rate Limits" section)
2. **Consider different identifier strategy**:
   - For onewallet-callback: Use user ID instead of IP
   - For twilio-inbound-webhook: Increase per-number limit

3. **Whitelist specific IPs** (onewallet-callback):
   ```bash
   supabase secrets set FUNDIST_ALLOWED_IPS="203.0.113.42,203.0.113.43"
   ```

### Redis Connection Issues

If you see Redis connection errors:

1. **Check network access**:
   - Supabase Edge Functions run in Deno Deploy
   - Ensure Upstash database is accessible globally

2. **Verify credentials**:
   ```bash
   # Test credentials locally
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-redis-url.upstash.io/ping
   ```

3. **Fail-safe behavior**:
   - The system automatically allows requests if Redis is unavailable
   - This prevents service disruption but temporarily disables rate limiting

## Security Best Practices

1. **Never commit credentials** to version control
2. **Rotate tokens regularly** (every 90 days recommended)
3. **Monitor for unusual patterns** in Upstash Analytics
4. **Set up alerts** for rate limit threshold breaches
5. **Review rate limits quarterly** based on traffic patterns

## Support

### Upstash Support
- Documentation: https://docs.upstash.com/
- Support: https://console.upstash.com/support

### Supabase Support
- Documentation: https://supabase.com/docs/guides/functions
- Support: https://supabase.com/support

## Next Steps

1. **Set up Upstash Redis database**
2. **Configure environment variables**
3. **Deploy Edge Functions**
4. **Monitor initial traffic**
5. **Adjust rate limits if needed**
6. **Set up alerting** (optional but recommended)

## Summary

- **onewallet-callback**: Protected with 100 req/min per IP
- **twilio-inbound-webhook**: Protected with 10 SMS/min per phone number
- **Environment variables**: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
- **Deployment**: Use `supabase functions deploy` command
- **Monitoring**: Via Upstash Console and Supabase logs
- **Cost**: ~$6/month for 100K requests/day

Rate limiting is now implemented and ready for deployment. Follow the setup instructions above to enable it in production.
