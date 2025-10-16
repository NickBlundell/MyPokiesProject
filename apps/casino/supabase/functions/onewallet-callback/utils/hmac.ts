import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'
import { logError } from './logger.ts'

/**
 * Validates HMAC-SHA256 signature according to Fundist OneWallet specification
 *
 * Algorithm:
 * 1. Sort all request fields alphabetically by key
 * 2. For boolean values: use "1" for true, "" (empty string) for false
 * 3. Concatenate all values (without keys or separators)
 * 4. Generate HMAC-SHA256 using secret key
 * 5. Compare with c_hashcode field
 *
 * @param requestBody The JSON request body
 * @param secret The HMAC secret key
 * @returns true if HMAC is valid, false otherwise
 */
export function validateHMAC(requestBody: any, secret: string): boolean {
  try {
    const { c_hashcode, ...fieldsToHash } = requestBody

    if (!c_hashcode) {
      logError('Missing c_hashcode in request')
      return false
    }

    // Sort fields alphabetically
    const sortedKeys = Object.keys(fieldsToHash).sort()

    // Build concatenated string according to Fundist spec
    let concatenatedValues = ''

    for (const key of sortedKeys) {
      let value = fieldsToHash[key]

      // Handle boolean values: true = "1", false = ""
      if (typeof value === 'boolean') {
        value = value ? '1' : ''
      }
      // Convert to string
      else if (value !== null && value !== undefined) {
        value = String(value)
      } else {
        value = ''
      }

      concatenatedValues += value
    }

    // Generate HMAC-SHA256
    const hmac = createHmac('sha256', secret)
    hmac.update(concatenatedValues)
    const calculatedHash = hmac.digest('hex')

    // Compare hashes (case-insensitive)
    const isValid = calculatedHash.toLowerCase() === c_hashcode.toLowerCase()

    if (!isValid) {
      logError('HMAC validation failed', undefined, {
        expected: c_hashcode,
        calculated: calculatedHash,
        concatenated: concatenatedValues,
        sortedKeys
      })
    }

    return isValid

  } catch (error) {
    logError('Error validating HMAC', error)
    return false
  }
}

/**
 * Generates HMAC-SHA256 signature for response
 * Used for outgoing responses to Fundist (if required)
 *
 * @param responseBody The response object
 * @param secret The HMAC secret key
 * @returns The HMAC signature
 */
export function generateHMAC(responseBody: any, secret: string): string {
  try {
    // Remove existing hashcode if present
    const { c_hashcode, ...fieldsToHash } = responseBody

    // Sort fields alphabetically
    const sortedKeys = Object.keys(fieldsToHash).sort()

    // Build concatenated string
    let concatenatedValues = ''

    for (const key of sortedKeys) {
      let value = fieldsToHash[key]

      // Handle boolean values
      if (typeof value === 'boolean') {
        value = value ? '1' : ''
      }
      // Convert to string
      else if (value !== null && value !== undefined) {
        value = String(value)
      } else {
        value = ''
      }

      concatenatedValues += value
    }

    // Generate HMAC-SHA256
    const hmac = createHmac('sha256', secret)
    hmac.update(concatenatedValues)
    return hmac.digest('hex')

  } catch (error) {
    logError('Error generating HMAC', error)
    throw error
  }
}
