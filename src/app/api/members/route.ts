import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const email = decodeURIComponent(userEmail)
    const user = await db.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

    const members = await db.member.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    })

    // Cross-user claim check: find members with the same name claimed by other users
    const memberNames = members.map(m => m.name)
    const claimedByOthers: Record<string, string> = {}
    if (memberNames.length > 0) {
      const otherClaims = await db.member.findMany({
        where: {
          name: { in: memberNames },
          claimedBy: { not: null },
          userId: { not: user.id },
        },
        select: { name: true, claimedBy: true },
      })
      for (const claim of otherClaims) {
        if (claim.claimedBy && claim.claimedBy !== email) {
          claimedByOthers[claim.name] = claim.claimedBy
        }
      }
    }

    // Merge cross-user claim info into the user's own members
    const enrichedMembers = members.map(m => ({
      ...m,
      claimedBy: m.claimedBy || (claimedByOthers[m.name] ? claimedByOthers[m.name] : null),
    }))

    return NextResponse.json(enrichedMembers)
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
    const { name, role, color, isAdmin, claimMemberId } = body

    // Claim a member identity (link member to this user account)
    if (claimMemberId) {
      const member = await db.member.findUnique({ where: { id: claimMemberId } })
      if (!member) {
        return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 })
      }
      // Check if already claimed by another user on this member record
      if (member.claimedBy && member.claimedBy !== email) {
        return NextResponse.json({ error: 'Ce profil est déjà pris par un autre compte' }, { status: 409 })
      }
      // Cross-user check: any member with the same name claimed by a different user
      const sameNameClaimed = await db.member.findFirst({
        where: {
          name: member.name,
          claimedBy: { not: null },
          userId: { not: user.id },
        },
      })
      if (sameNameClaimed && sameNameClaimed.claimedBy !== email) {
        return NextResponse.json({ error: 'Ce profil est déjà pris par un autre compte' }, { status: 409 })
      }
      // Claim it
      const updated = await db.member.update({
        where: { id: claimMemberId },
        data: { claimedBy: email },
      })
      return NextResponse.json(updated)
    }

    if (!name) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    }

    const member = await db.member.create({
      data: {
        name,
        role: role || 'Membre',
        color: color || '#1A3A5C',
        isAdmin: isAdmin || false,
        userId: user.id,
      },
    })

    await db.auditLog.create({
      data: {
        action: 'CREATE_MEMBER',
        label: name,
        userId: user.id,
      },
    })

    return NextResponse.json(member)
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
