/**
 * Response utility functions for Fundist OneWallet API
 *
 * Response codes (i_result):
 * 0 = Success
 * 1 = Invalid HMAC signature
 * 2 = Other errors (invalid params, system errors, etc.)
 * 3 = Insufficient funds
 */

export interface OneWalletResponse {
  i_result: number
  c_text?: string
  n_balance?: number
  c_tid?: string
  [key: string]: any
}

/**
 * Creates a success response
 */
export function SuccessResponse(data: Partial<OneWalletResponse> = {}): OneWalletResponse {
  return {
    i_result: 0,
    c_text: 'Success',
    ...data
  }
}

/**
 * Creates an error response
 *
 * @param message Error message
 * @param code Error code (1 = HMAC error, 2 = other error, 3 = insufficient funds)
 */
export function ErrorResponse(message: string, code: number = 2): OneWalletResponse {
  return {
    i_result: code,
    c_text: message
  }
}

/**
 * Creates a balance response
 */
export function BalanceResponse(balance: number, currency?: string): OneWalletResponse {
  return {
    i_result: 0,
    c_text: 'Success',
    n_balance: balance,
    ...(currency && { c_currency: currency })
  }
}

/**
 * Creates a transaction response (debit/credit)
 */
export function TransactionResponse(
  balance: number,
  tid: string,
  currency?: string
): OneWalletResponse {
  return {
    i_result: 0,
    c_text: 'Success',
    n_balance: balance,
    c_tid: tid,
    ...(currency && { c_currency: currency })
  }
}

/**
 * Creates a rollback response
 */
export function RollbackResponse(balance: number, tid: string): OneWalletResponse {
  return {
    i_result: 0,
    c_text: 'Rollback successful',
    n_balance: balance,
    c_tid: tid
  }
}
