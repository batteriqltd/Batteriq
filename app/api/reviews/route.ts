import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { rateLimit } from '@/lib/rateLimit'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — public approved reviews (includes auto-approved)
export async function GET() {
  try {
    const supabase = getAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('reviews') as any)
      .select('id, guest_name, rating, comment, product_names, created_at, admin_reply')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(24)
    return NextResponse.json({ reviews: data ?? [] })
  } catch {
    return NextResponse.json({ reviews: [] })
  }
}

// POST — submit new review
// Reviews with rating 4-5 stars auto-approve and go live immediately
// Reviews with rating 1-3 stars go to admin for review first
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const { allowed } = rateLimit(`reviews:${ip}`, 3, 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { orderId, orderNumber, productNames, guestName, rating, comment } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
    }
    if (!guestName?.trim()) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    const supabase = getAdmin()

    // Check duplicate
    if (orderId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase.from('reviews') as any)
        .select('id')
        .eq('order_id', orderId)
        .single()
      if (existing) {
        return NextResponse.json({ error: 'Review already submitted' }, { status: 409 })
      }
    }

    // Auto-approve 4-5 star reviews, hold 1-3 star for admin
    const autoApprove = rating >= 4
    const status = autoApprove ? 'approved' : 'pending'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: review, error } = await (supabase.from('reviews') as any)
      .insert({
        order_id: orderId || null,
        order_number: orderNumber || null,
        product_names: productNames || null,
        guest_name: guestName.trim(),
        rating,
        comment: comment?.trim() || null,
        status,
        auto_approved: autoApprove,
        created_at: new Date().toISOString(),
      })
      .select('id, status')
      .single()

    if (error) {
      console.error('[REVIEW] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (autoApprove) {
      revalidatePath('/')
      console.log(`[REVIEW] ✅ Auto-approved ${rating}★ review from ${guestName} — live immediately`)
    } else {
      console.log(`[REVIEW] ⏳ Pending review (${rating}★) from ${guestName} — awaiting admin approval`)
    }

    return NextResponse.json({
      success: true,
      status,
      message: autoApprove
        ? 'Your review is now live!'
        : 'Thank you! Your review will appear shortly after approval.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH — admin approve/reject
export async function PATCH(req: Request) {
  try {
    const { id, status, featured, admin_reply } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const supabase = getAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = { updated_at: new Date().toISOString() }
    if (status) updates.status = status
    if (typeof featured === 'boolean') updates.featured = featured
    if (admin_reply !== undefined) updates.admin_reply = admin_reply

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('reviews') as any).update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Revalidate so approved review goes live immediately
    revalidatePath('/')
    console.log(`[REVIEW] Admin ${status} review ${id} — homepage updated`)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
