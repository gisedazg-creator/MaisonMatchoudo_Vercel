import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const email = decodeURIComponent(userEmail)
    const user = await db.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

    const logs = await db.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(logs)
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const email = decodeURIComponent(userEmail)
    const user = await db.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

    const body = await req.json()
    const { action, label, memberId, memberName } = body

    const log = await db.auditLog.create({
      data: {
        action: action || 'GENERIC',
        label: label || '',
        memberId: memberId || null,
        memberName: memberName || '',
        userId: user.id,
      },
    })

    return NextResponse.json(log)
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
