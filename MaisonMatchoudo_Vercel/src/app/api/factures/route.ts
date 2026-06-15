import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const email = decodeURIComponent(userEmail)
    const user = await db.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

    const url = new URL(req.url)
    const type = url.searchParams.get('type')
    const statut = url.searchParams.get('statut')

    const where: Prisma.FactureWhereInput = { userId: user.id }

    if (type && type !== 'all') {
      where.type = type
    }
    if (statut && statut !== 'all') {
      where.statut = statut
    }

    const factures = await db.facture.findMany({
      where,
      include: { member: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(factures)
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
    const { type, title, description, mois, echeance, amount, indexVal, reference, statut, memberId } = body

    if (!title || !type || amount === undefined) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const facture = await db.facture.create({
      data: {
        type,
        title,
        description: description || '',
        mois: mois || '',
        echeance: echeance || '',
        amount: parseFloat(amount),
        indexVal: indexVal ? parseFloat(indexVal) : 0,
        reference: reference || '',
        statut: statut || 'payer',
        memberId: memberId || null,
        userId: user.id,
      },
      include: { member: true },
    })

    await db.auditLog.create({
      data: {
        action: 'CREATE_FACTURE',
        label: title,
        memberId: memberId || null,
        memberName: '',
        userId: user.id,
      },
    })

    return NextResponse.json(facture)
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
