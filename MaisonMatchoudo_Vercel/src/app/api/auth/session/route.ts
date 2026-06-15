import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const email = decodeURIComponent(userEmail)
    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      currency: user.currency,
      darkMode: user.darkMode,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
