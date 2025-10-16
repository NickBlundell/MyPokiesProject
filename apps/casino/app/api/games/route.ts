import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

// GET /api/games - List all games with filtering and pagination
export async function GET(request: NextRequest) {
  // Rate limiting - standard (10 requests per 10 seconds)
  const { success, limit: rateLimitLimit, remaining, reset } = await checkRateLimit(request)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    )
  }

  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams

  // Pagination
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  // Filters
  const category = searchParams.get('category')
  const provider = searchParams.get('provider')
  const search = searchParams.get('search')
  const is_new = searchParams.get('is_new')
  const is_featured = searchParams.get('is_featured')
  const has_jackpot = searchParams.get('has_jackpot')
  const tags = searchParams.get('tags')?.split(',')

  // Sorting
  const sortField = searchParams.get('sort_field') || 'display_order'
  const sortDirection = searchParams.get('sort_direction') || 'asc'

  // Check if user is authenticated for favorites
  const { data: { user } } = await supabase.auth.getUser()

  // Build query
  let query = supabase
    .from('games')
    .select('*, statistics:game_statistics(*)', { count: 'exact' })
    .eq('is_active', true)

  // Apply filters
  if (category) {
    query = query.eq('category', category)
  }

  if (provider) {
    query = query.eq('provider', provider)
  }

  if (search) {
    query = query.or(`game_name.ilike.%${search}%,game_type.ilike.%${search}%`)
  }

  if (is_new === 'true') {
    query = query.eq('is_new', true)
  }

  if (is_featured === 'true') {
    query = query.eq('is_featured', true)
  }

  if (has_jackpot === 'true') {
    query = query.eq('has_jackpot', true)
  }

  if (tags && tags.length > 0) {
    query = query.contains('tags', tags)
  }

  // Apply sorting
  type ValidSortField = 'game_name' | 'provider' | 'display_order' | 'created_at'
  query = query.order(sortField as ValidSortField, { ascending: sortDirection === 'asc' })

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data: games, error, count } = await query

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch games', details: error.message },
      { status: 500 }
    )
  }

  // Get user favorites if authenticated
  let favoriteGameIds: string[] = []
  if (user) {
    const { data: favorites } = await supabase
      .from('player_favorite_games')
      .select('game_id')
      .eq('user_id', user.id)

    favoriteGameIds = favorites?.map(f => f.game_id) || []
  }

  // Add is_favorite flag to games
  const gamesWithFavorites = games?.map(game => ({
    ...game,
    statistics: game.statistics?.[0] || null,
    is_favorite: favoriteGameIds.includes(game.id)
  }))

  const response = NextResponse.json({
    games: gamesWithFavorites,
    total: count || 0,
    page,
    limit
  })

  // Cache public game list for 1 minute
  if (!user) {
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300')
  } else {
    // Don't cache personalized results
    response.headers.set('Cache-Control', 'private, no-cache')
  }

  return response
}
