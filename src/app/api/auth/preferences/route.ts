import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const email = decodeURIComponent(userEmail)
    const user = await db.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

    const body = await req.json()
    const { currency, darkMode } = body

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        ...(currency !== undefined && { currency }),
        ...(darkMode !== undefined && { darkMode }),
      },
    })

    return NextResponse.json({ id: updated.id, email: updated.email, name: updated.name, currency: updated.currency, darkMode: updated.darkMode })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
