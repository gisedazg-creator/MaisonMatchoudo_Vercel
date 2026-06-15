import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const email = decodeURIComponent(userEmail)
    const user = await db.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

    // Check if user already has data
    const txCount = await db.transaction.count({ where: { userId: user.id } })
    const facCount = await db.facture.count({ where: { userId: user.id } })
    if (txCount > 0 || facCount > 0) {
      return NextResponse.json({ message: 'Des données existent déjà, pas de seed' })
    }

    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')

    const members = await db.member.findMany({ where: { userId: user.id } })

    // Seed demo transactions
    const demoTransactions = [
      { date: `${y}-${m}-01`, label: 'Salaire Papa', category: 'Salaire', type: 'Entrée', amount: 250000, note: '', memberId: members[3]?.id || null, recurrence: 'monthly' },
      { date: `${y}-${m}-01`, label: 'Salaire Maman', category: 'Salaire', type: 'Entrée', amount: 180000, note: '', memberId: members[2]?.id || null, recurrence: 'monthly' },
      { date: `${y}-${m}-03`, label: 'Courses alimentaires', category: 'Alimentation', type: 'Dépense', amount: 45000, note: 'Marché central', memberId: members[2]?.id || null, recurrence: '' },
      { date: `${y}-${m}-05`, label: 'Loyer', category: 'Logement', type: 'Dépense', amount: 80000, note: '', memberId: members[3]?.id || null, recurrence: 'monthly' },
      { date: `${y}-${m}-07`, label: 'Transport', category: 'Transport', type: 'Dépense', amount: 15000, note: 'Taxi + bus', memberId: members[0]?.id || null, recurrence: '' },
      { date: `${y}-${m}-10`, label: 'École Elkana', category: 'Éducation', type: 'Dépense', amount: 35000, note: '', memberId: members[1]?.id || null, recurrence: 'monthly' },
      { date: `${y}-${m}-12`, label: 'Consultation médicale', category: 'Santé', type: 'Dépense', amount: 20000, note: '', memberId: members[2]?.id || null, recurrence: '' },
      { date: `${y}-${m}-15`, label: 'Commerce Ayouba', category: 'Commerce', type: 'Entrée', amount: 75000, note: '', memberId: members[0]?.id || null, recurrence: '' },
      { date: `${y}-${m}-18`, label: 'Épargne mensuelle', category: 'Épargne', type: 'Dépense', amount: 50000, note: '', memberId: members[3]?.id || null, recurrence: 'monthly' },
      { date: `${y}-${m}-20`, label: 'Habillement', category: 'Habillement', type: 'Dépense', amount: 25000, note: '', memberId: null, recurrence: '' },
    ]

    for (const tx of demoTransactions) {
      await db.transaction.create({
        data: { ...tx, userId: user.id },
      })
    }

    // Seed demo factures
    const demoFactures = [
      { type: 'Eau', title: 'Facture eau juin', description: '', mois: `${y}-${m}`, echeance: `${y}-${m}-25`, amount: 12000, indexVal: 15, reference: 'EAU-2026-001', statut: 'payer', memberId: members[3]?.id || null },
      { type: 'Électricité', title: 'Facture électricité juin', description: '', mois: `${y}-${m}`, echeance: `${y}-${m}-20`, amount: 28000, indexVal: 245, reference: 'ELEC-2026-001', statut: 'retard', memberId: members[3]?.id || null },
      { type: 'Eau', title: 'Facture eau mai', description: 'Payée', mois: `${y}-05`, echeance: `${y}-05-25`, amount: 9500, indexVal: 12, reference: 'EAU-2026-005', statut: 'payee', memberId: members[2]?.id || null },
    ]

    for (const fac of demoFactures) {
      await db.facture.create({
        data: { ...fac, userId: user.id },
      })
    }

    await db.auditLog.create({
      data: {
        action: 'SEED_DATA',
        label: 'Données de démonstration',
        userId: user.id,
      },
    })

    return NextResponse.json({ message: 'Données de démonstration ajoutées', transactions: demoTransactions.length, factures: demoFactures.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
