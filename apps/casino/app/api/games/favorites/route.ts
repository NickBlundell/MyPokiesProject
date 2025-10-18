import { NextResponse } from 'next/server'
import { apiGet, apiPost } from '@/lib/api/middleware'
import { addFavoriteSchema } from '@/lib/schemas/games'

// GET /api/games/favorites - Get user's favorite games
export const GET = apiGet(async (request, { supabase, userId }) => {
  // Fetch user's favorite games with game details
  const { data: favorites, error } = await supabase
    .from('player_favorite_games')
    .select(`
      id,
      created_at,
      game:games(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch favorites', details: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    favorites: favorites?.map(f => ({
      id: f.id,
      created_at: f.created_at,
      ...f.game
    }))
  })
})

// POST /api/games/favorites - Add game to favorites
export const POST = apiPost(async (request, { supabase, userId }) => {
  // Parse and validate request body
  const body = await request.json()
  const validation = addFavoriteSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid input',
        details: validation.error.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      { status: 400 }
    )
  }

  const { game_id } = validation.data

  // Check if game exists
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id')
    .eq('id', game_id)
    .single()

  if (gameError || !game) {
    return NextResponse.json(
      { error: 'Game not found' },
      { status: 404 }
    )
  }

  // Add to favorites
  const { data, error } = await supabase
    .from('player_favorite_games')
    .insert({
      user_id: userId,
      game_id
    })
    .select()
    .single()

  if (error) {
    // Handle duplicate entry
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Game already in favorites' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to add favorite', details: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, favorite: data })
})
