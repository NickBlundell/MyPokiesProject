/**
 * Client-side API helpers for player data
 * These functions can be used in React components
 */

import type {
  ProfileResponse,
  BalanceResponse,
  TransactionsResponse,
  GameHistoryResponse,
  LinkAccountRequest,
  LinkAccountResponse
} from '@/types/player'

/**
 * Fetch the authenticated player's casino profile
 */
export async function getPlayerProfile(): Promise<ProfileResponse> {
  const res = await fetch('/api/player/profile')

  // Check if response is JSON
  const contentType = res.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error('Authentication required')
  }

  if (!res.ok) {
    throw new Error('Failed to fetch profile')
  }
  return res.json()
}

/**
 * Fetch the authenticated player's balances
 */
export async function getPlayerBalance(): Promise<BalanceResponse> {
  const res = await fetch('/api/player/balance')

  // Check if response is JSON
  const contentType = res.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error('Authentication required')
  }

  if (!res.ok) {
    throw new Error('Failed to fetch balance')
  }
  return res.json()
}

/**
 * Fetch the authenticated player's transaction history
 */
export async function getPlayerTransactions(
  limit: number = 50,
  offset: number = 0
): Promise<TransactionsResponse> {
  const res = await fetch(
    `/api/player/transactions?limit=${limit}&offset=${offset}`
  )

  // Check if response is JSON
  const contentType = res.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error('Authentication required')
  }

  if (!res.ok) {
    throw new Error('Failed to fetch transactions')
  }
  return res.json()
}

/**
 * Fetch the authenticated player's game history
 */
export async function getPlayerGameHistory(
  limit: number = 50,
  offset: number = 0
): Promise<GameHistoryResponse> {
  const res = await fetch(
    `/api/player/game-history?limit=${limit}&offset=${offset}`
  )

  // Check if response is JSON
  const contentType = res.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error('Authentication required')
  }

  if (!res.ok) {
    throw new Error('Failed to fetch game history')
  }
  return res.json()
}

/**
 * Link the authenticated user's account to their Fundist casino account
 */
export async function linkCasinoAccount(
  externalUserId: string
): Promise<LinkAccountResponse> {
  const res = await fetch('/api/player/link-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ external_user_id: externalUserId } as LinkAccountRequest)
  })

  // Check if response is JSON
  const contentType = res.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error('Authentication required')
  }

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Failed to link account')
  }

  return data
}
