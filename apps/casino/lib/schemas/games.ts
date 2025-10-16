import { z } from 'zod'

/**
 * Schema for adding game to favorites
 */
export const addFavoriteSchema = z.object({
  game_id: z.string()
    .uuid('Invalid game ID format')
})

/**
 * Schema for game list query parameters
 */
export const gameListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum(['slots', 'table_games', 'live_casino', 'jackpots', 'other']).optional(),
  provider: z.string().max(100).optional(),
  search: z.string().max(255).optional(),
  is_new: z.enum(['true', 'false']).optional(),
  is_featured: z.enum(['true', 'false']).optional(),
  has_jackpot: z.enum(['true', 'false']).optional(),
  tags: z.string().optional(),
  sort_field: z.enum(['game_name', 'provider', 'display_order', 'created_at']).default('display_order'),
  sort_direction: z.enum(['asc', 'desc']).default('asc')
})

export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>
export type GameListQuery = z.infer<typeof gameListQuerySchema>
