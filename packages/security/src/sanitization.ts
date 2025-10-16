import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(dirty: string, options?: {
  allowedTags?: string[]
  allowedAttributes?: string[]
}): string {
  const config = {
    ALLOWED_TAGS: options?.allowedTags || [],
    ALLOWED_ATTR: options?.allowedAttributes || [],
    KEEP_CONTENT: true,
  }

  return DOMPurify.sanitize(dirty, config)
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [] })
}

/**
 * Sanitize user input for database storage
 */
export function sanitizeInput(input: string): string {
  // Remove any HTML tags
  let sanitized = stripHtml(input)

  // Trim whitespace
  sanitized = sanitized.trim()

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Normalize unicode
  sanitized = sanitized.normalize('NFC')

  return sanitized
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options?: {
    skipKeys?: string[]
    maxDepth?: number
  }
): T {
  const skipKeys = new Set(options?.skipKeys || [])
  const maxDepth = options?.maxDepth || 10

  function sanitizeRecursive(value: any, depth: number): any {
    if (depth > maxDepth) {
      throw new Error('Maximum sanitization depth exceeded')
    }

    if (value === null || value === undefined) {
      return value
    }

    if (typeof value === 'string') {
      return sanitizeInput(value)
    }

    if (Array.isArray(value)) {
      return value.map(item => sanitizeRecursive(item, depth + 1))
    }

    if (typeof value === 'object' && value.constructor === Object) {
      const sanitized: any = {}
      for (const [key, val] of Object.entries(value)) {
        if (!skipKeys.has(key)) {
          sanitized[key] = sanitizeRecursive(val, depth + 1)
        } else {
          sanitized[key] = val
        }
      }
      return sanitized
    }

    return value
  }

  return sanitizeRecursive(obj, 0) as T
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  // Check if it's a valid length (10-15 digits for international)
  return digits.length >= 10 && digits.length <= 15
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Escape SQL special characters (for raw queries - prefer parameterized queries)
 */
export function escapeSql(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/"/g, '""')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x00/g, '\\x00')
}

/**
 * Generate a random secure token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
  } else {
    // Fallback for Node.js
    const crypto = require('crypto')
    for (let i = 0; i < length; i++) {
      result += chars[crypto.randomInt(0, chars.length)]
    }
  }

  return result
}