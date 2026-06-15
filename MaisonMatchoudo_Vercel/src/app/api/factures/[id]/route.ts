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

    const existing = await db.facture.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })

    const facture = await db.facture.update({
      where: { id },
      data: {
        type: body.type,
        title: body.title,
        description: body.description,
        mois: body.mois,
        echeance: body.echeance,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        indexVal: body.indexVal !== undefined ? parseFloat(body.indexVal) : undefined,
        reference: body.reference,
        statut: body.statut,
        memberId: body.memberId,
      },
      include: { member: true },
    })

    await db.auditLog.create({
      data: {
        action: 'UPDATE_FACTURE',
        label: body.title || existing.title,
        userId: user.id,
      },
    })

    return NextResponse.json(facture)
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
    const existing = await db.facture.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })

    await db.facture.delete({ where: { id } })

    await db.auditLog.create({
      data: {
        action: 'DELETE_FACTURE',
        label: existing.title,
        userId: user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
