import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase'
import { createSession, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json()

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: 'Username must be 3-20 chars' }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: 'Username: letters, numbers, underscores only' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 chars' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Check existing
    const { data: existing } = await supabase
      .from('spinna_players')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Email or username already taken' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { data: player, error } = await supabase
      .from('spinna_players')
      .insert({
        username,
        email: email.toLowerCase(),
        password_hash: passwordHash,
      })
      .select('id, username, email')
      .single()

    if (error || !player) {
      console.error('Register error:', error)
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    const token = await createSession({
      playerId: player.id,
      username: player.username,
      email: player.email,
    })

    await setSessionCookie(token)

    return NextResponse.json({
      player: { id: player.id, username: player.username, email: player.email },
    })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
