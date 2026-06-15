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
    const month = url.searchParams.get('month')
    const type = url.searchParams.get('type')
    const search = url.searchParams.get('search')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    const includeDeleted = url.searchParams.get('deleted') === 'true'

    const where: Prisma.TransactionWhereInput = { userId: user.id }

    if (!includeDeleted) {
      where.deleted = false
    } else {
      where.deleted = true
    }

    if (type && type !== 'all') {
      where.type = type
    }

    if (month) {
      where.date = { startsWith: month }
    }

    if (search) {
      where.OR = [
        { label: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, string> = {}
      if (dateFrom) dateFilter.gte = dateFrom
      if (dateTo) dateFilter.lte = dateTo
      where.date = dateFilter
    }

    const transactions = await db.transaction.findMany({
      where,
      include: { member: true },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(transactions)
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
    const { date, label, category, type, amount, note, memberId, recurrence } = body

    if (!date || !label || !category || !type || amount === undefined) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const transaction = await db.transaction.create({
      data: {
        date,
        label,
        category,
        type,
        amount: parseFloat(amount),
        note: note || '',
        memberId: memberId || null,
        recurrence: recurrence || '',
        userId: user.id,
      },
      include: { member: true },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'CREATE_TRANSACTION',
        label: label,
        memberId: memberId || null,
        memberName: '',
        userId: user.id,
      },
    })

    return NextResponse.json(transaction)
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
