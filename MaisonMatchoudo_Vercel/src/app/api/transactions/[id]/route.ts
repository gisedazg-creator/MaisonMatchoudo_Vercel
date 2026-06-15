import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userEmail = req.headers.get('x-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const email = decodeURIComponent(userEmail)
    const user = await db.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

    const { id } = await params
    const body = await req.json()

    const existing = await db.transaction.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Transaction non trouvée' }, { status: 404 })

    const transaction = await db.transaction.update({
      where: { id },
      data: {
        date: body.date,
        label: body.label,
        category: body.category,
        type: body.type,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        note: body.note,
        memberId: body.memberId,
        recurrence: body.recurrence,
      },
      include: { member: true },
    })

    await db.auditLog.create({
      data: {
        action: 'UPDATE_TRANSACTION',
        label: body.label || existing.label,
        userId: user.id,
      },
    })

    return NextResponse.json(transaction)
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userEmail = req.headers.get('x-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const email = decodeURIComponent(userEmail)
    const user = await db.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

    const { id } = await params
    const existing = await db.transaction.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Transaction non trouvée' }, { status: 404 })

    // Soft delete
    const transaction = await db.transaction.update({
      where: { id },
      data: { deleted: true },
    })

    await db.auditLog.create({
      data: {
        action: 'DELETE_TRANSACTION',
        label: existing.label,
        userId: user.id,
      },
    })

    return NextResponse.json(transaction)
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
