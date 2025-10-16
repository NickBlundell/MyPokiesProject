# @mypokies/security

Security utilities for MyPokies platform including rate limiting, IP whitelisting, input sanitization, secrets management, and audit logging.

## Installation

This package is part of the MyPokies monorepo. Add it to your app's dependencies:

```json
{
  "dependencies": {
    "@mypokies/security": "workspace:*"
  }
}
```

## Usage

### Rate Limiting

```typescript
import { checkRateLimit, rateLimitMiddleware, rateLimiters } from '@mypokies/security'

// Check rate limit
const result = await checkRateLimit('user-123', 'api')
if (!result.success) {
  throw new Error(`Rate limit exceeded. Try again at ${new Date(result.reset)}`)
}

// Use in Next.js API route
export async function POST(request: Request) {
  const { success, headers } = await rateLimitMiddleware(request, 'strict')

  if (!success) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers
    })
  }

  // Process request
  const response = await handleRequest(request)

  // Add rate limit headers
  for (const [key, value] of headers) {
    response.headers.set(key, value)
  }

  return response
}

// Available rate limiters
rateLimiters.api        // 100 req/min - General API
rateLimiters.strict     // 10 req/min - Sensitive operations
rateLimiters.auth       // 5 req/15min - Authentication
rateLimiters.financial  // 3 req/hour - Withdrawals/deposits
rateLimiters.sms        // 20 req/day - SMS sending
rateLimiters.bonus      // 10 req/day - Bonus claims
```

### IP Whitelisting

```typescript
import {
  isWhitelisted,
  addToWhitelist,
  removeFromWhitelist,
  checkIpAccess
} from '@mypokies/security'

// Check if IP is whitelisted
const allowed = await isWhitelisted('192.168.1.1')

// Add IP to whitelist
await addToWhitelist('192.168.1.1', {
  description: 'Office IP',
  expiresAt: new Date('2024-12-31')
})

// Check access and throw if not allowed
await checkIpAccess(request, {
  whitelist: ['192.168.1.0/24'],
  strictMode: true
})

// Remove from whitelist
await removeFromWhitelist('192.168.1.1')
```

### Input Sanitization

```typescript
import {
  sanitizeHtml,
  sanitizeInput,
  stripTags,
  escapeHtml
} from '@mypokies/security'

// Sanitize HTML content
const clean = sanitizeHtml(userInput, {
  allowedTags: ['b', 'i', 'em', 'strong'],
  allowedAttributes: {}
})

// Sanitize general input
const safe = sanitizeInput(userInput, {
  maxLength: 1000,
  allowHtml: false
})

// Strip all HTML tags
const text = stripTags('<p>Hello <b>world</b></p>')
// Result: "Hello world"

// Escape HTML entities
const escaped = escapeHtml('<script>alert("xss")</script>')
// Result: "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
```

### Secrets Management

```typescript
import {
  encryptSecret,
  decryptSecret,
  hashPassword,
  verifyPassword,
  generateToken
} from '@mypokies/security'

// Encrypt sensitive data
const encrypted = await encryptSecret('sensitive-data')

// Decrypt
const decrypted = await decryptSecret(encrypted)

// Hash passwords
const hash = await hashPassword('user-password')

// Verify password
const isValid = await verifyPassword('user-password', hash)

// Generate secure tokens
const token = generateToken(32) // 32-byte random token
```

### Audit Logging

```typescript
import {
  auditLog,
  AuditLogger,
  AuditAction,
  AuditCategory
} from '@mypokies/security'

// Log audit events
await auditLog({
  action: AuditAction.USER_LOGIN,
  category: AuditCategory.AUTHENTICATION,
  userId: 'user-123',
  ipAddress: '192.168.1.1',
  metadata: {
    userAgent: 'Mozilla/5.0...',
    success: true
  }
})

// Create custom audit logger
const logger = new AuditLogger({
  service: 'admin-panel',
  environment: 'production'
})

await logger.log({
  action: AuditAction.BALANCE_ADJUSTMENT,
  category: AuditCategory.FINANCIAL,
  userId: 'admin-456',
  targetUserId: 'user-123',
  metadata: {
    amount: 100,
    reason: 'Bonus adjustment'
  }
})

// Query audit logs
const logs = await logger.query({
  userId: 'user-123',
  category: AuditCategory.FINANCIAL,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
})
```

### Security Middleware

```typescript
import {
  securityHeaders,
  csrfProtection,
  contentSecurityPolicy
} from '@mypokies/security'

// Add security headers
export function middleware(request: Request) {
  const response = await next(request)

  // Add security headers
  securityHeaders(response)

  return response
}

// CSRF protection
export async function POST(request: Request) {
  await csrfProtection(request)
  // Process request
}

// Content Security Policy
const csp = contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"]
  }
})
```

## API Documentation

### Rate Limiting

- `rateLimiters` - Pre-configured rate limiters
  - `api` - 100 requests/minute
  - `strict` - 10 requests/minute
  - `auth` - 5 requests/15 minutes
  - `financial` - 3 requests/hour
  - `sms` - 20 requests/day
  - `bonus` - 10 requests/day
- `checkRateLimit(identifier, type)` - Check rate limit
- `rateLimitMiddleware(request, type)` - Middleware for Next.js
- `RateLimitError` - Rate limit error class

### IP Whitelisting

- `isWhitelisted(ip)` - Check if IP is whitelisted
- `addToWhitelist(ip, options)` - Add IP to whitelist
- `removeFromWhitelist(ip)` - Remove from whitelist
- `checkIpAccess(request, options)` - Verify IP access
- `getWhitelist()` - Get all whitelisted IPs
- `clearWhitelist()` - Clear all whitelisted IPs

### Sanitization

- `sanitizeHtml(input, options)` - Sanitize HTML content
- `sanitizeInput(input, options)` - General input sanitization
- `stripTags(html)` - Remove all HTML tags
- `escapeHtml(text)` - Escape HTML entities
- `validateEmail(email)` - Email validation
- `validateUrl(url)` - URL validation

### Secrets Management

- `encryptSecret(data, key?)` - Encrypt sensitive data
- `decryptSecret(encrypted, key?)` - Decrypt data
- `hashPassword(password)` - Hash password with bcrypt
- `verifyPassword(password, hash)` - Verify password
- `generateToken(bytes)` - Generate random token
- `generateApiKey()` - Generate API key

### Audit Logging

- `auditLog(entry)` - Log audit event
- `AuditLogger` - Audit logger class
- `AuditAction` - Audit action enum
- `AuditCategory` - Audit category enum

Audit Categories:
- `AUTHENTICATION` - Login, logout, password changes
- `AUTHORIZATION` - Permission changes
- `FINANCIAL` - Deposits, withdrawals, adjustments
- `USER_MANAGEMENT` - User CRUD operations
- `SYSTEM` - System configuration changes
- `SECURITY` - Security events

## Configuration

Set the following environment variables:

```bash
# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Encryption
ENCRYPTION_KEY=your-32-byte-encryption-key

# Security
IP_WHITELIST_ENABLED=true
STRICT_SECURITY=true
```

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

## Security Best Practices

1. Always rate limit sensitive endpoints
2. Sanitize all user input
3. Use IP whitelisting for admin panels
4. Log all security-relevant events
5. Encrypt sensitive data at rest
6. Use HTTPS only
7. Implement CSRF protection
8. Set secure headers
9. Regular security audits
10. Keep dependencies updated

## Rate Limit Configuration

Choose appropriate rate limits based on operation sensitivity:

- **Public APIs**: 100-1000 req/min
- **Authenticated APIs**: 60-100 req/min
- **Authentication**: 5-10 req/15min
- **Financial operations**: 3-5 req/hour
- **SMS/Email**: 10-20 req/day

## Dependencies

- `@upstash/ratelimit` - Rate limiting
- `@upstash/redis` - Redis client
- `isomorphic-dompurify` - HTML sanitization (browser-compatible)
