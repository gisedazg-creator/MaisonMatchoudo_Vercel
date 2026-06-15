import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Email non trouvé' }, { status: 401 })
    }

    // If password is managed by Supabase, don't check locally
    if (user.passwordHash === 'supabase_managed') {
      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
      })
    }

    // Local password check
    if (user.passwordHash && user.passwordHash !== password) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
