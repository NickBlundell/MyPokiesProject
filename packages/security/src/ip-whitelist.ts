/**
 * IP Whitelisting for Admin Panel
 */

// Get whitelisted IPs from environment variable (comma-separated)
const getWhitelistedIPs = (): Set<string> => {
  const ips = process.env.ADMIN_IP_WHITELIST || ''
  const ipList = ips.split(',').map(ip => ip.trim()).filter(Boolean)

  // Always allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    ipList.push('127.0.0.1', '::1', 'localhost')
  }

  return new Set(ipList)
}

// Cache whitelist to avoid parsing on every request
let whitelistCache: Set<string> | null = null

/**
 * Check if an IP is whitelisted
 */
export function isIPWhitelisted(ip: string): boolean {
  // Skip check in development mode unless explicitly configured
  if (process.env.NODE_ENV === 'development' && !process.env.ENFORCE_IP_WHITELIST) {
    return true
  }

  // Initialize cache if needed
  if (!whitelistCache) {
    whitelistCache = getWhitelistedIPs()
  }

  // Check if IP is in whitelist
  return whitelistCache.has(ip) ||
         whitelistCache.has('*') || // Allow wildcard for all IPs
         checkIPRange(ip, whitelistCache)
}

/**
 * Check if IP matches any CIDR range in whitelist
 */
function checkIPRange(ip: string, whitelist: Set<string>): boolean {
  // Check for CIDR notation support (e.g., 192.168.1.0/24)
  for (const entry of whitelist) {
    if (entry.includes('/')) {
      if (isIPInCIDR(ip, entry)) {
        return true
      }
    }
  }
  return false
}

/**
 * Check if IP is within a CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  const [range, bits = '32'] = cidr.split('/')
  const mask = ~(2 ** (32 - parseInt(bits)) - 1)

  const ipNum = ipToNumber(ip)
  const rangeNum = ipToNumber(range)

  return (ipNum & mask) === (rangeNum & mask)
}

/**
 * Convert IP address to number for CIDR comparison
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.')
  return parts.reduce((acc, part, i) => {
    return acc + (parseInt(part) << (8 * (3 - i)))
  }, 0)
}

/**
 * Get client IP from request
 */
export function getClientIP(req: Request): string {
  const headers = req.headers

  // Check various headers for real IP
  const forwarded = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfConnectingIp = headers.get('cf-connecting-ip') // Cloudflare
  const xClientIp = headers.get('x-client-ip')

  // Return first valid IP found
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  if (realIp) {
    return realIp
  }
  if (xClientIp) {
    return xClientIp
  }

  return 'unknown'
}

/**
 * Middleware for IP whitelisting
 */
export async function ipWhitelistMiddleware(req: Request): Promise<{
  allowed: boolean
  ip: string
  reason?: string
}> {
  const ip = getClientIP(req)

  if (ip === 'unknown') {
    return {
      allowed: false,
      ip,
      reason: 'Could not determine client IP address',
    }
  }

  const allowed = isIPWhitelisted(ip)

  return {
    allowed,
    ip,
    reason: allowed ? undefined : `IP ${ip} is not whitelisted for admin access`,
  }
}

/**
 * Refresh IP whitelist cache (call when whitelist is updated)
 */
export function refreshIPWhitelist(): void {
  whitelistCache = null
}