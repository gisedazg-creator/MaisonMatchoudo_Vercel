import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email, name, password, supabaseId } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      // Update existing user with Supabase ID if provided
      if (supabaseId && !existing.passwordHash) {
        const updated = await db.user.update({
          where: { email },
          data: { passwordHash: 'supabase_managed' },
        })
        return NextResponse.json({
          id: updated.id,
          email: updated.email,
          name: updated.name,
        })
      }
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })
    }

    const user = await db.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash: supabaseId ? 'supabase_managed' : password,
      },
    })

    // Seed default members
    const defaultMembers = [
      { name: 'Ayouba Matchoudo', role: 'Membre', color: '#1A3A5C', isAdmin: false, userId: user.id },
      { name: 'Elkana Matchoudo', role: 'Membre', color: '#0F6E56', isAdmin: false, userId: user.id },
      { name: 'Maman Hikma', role: 'Mère', color: '#993556', isAdmin: true, userId: user.id },
      { name: 'Papa Hikma', role: 'Père', color: '#BA7517', isAdmin: true, userId: user.id },
    ]
    await db.member.createMany({ data: defaultMembers })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
