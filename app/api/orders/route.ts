import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailOrderConfirmation, emailAdminNewOrder } from '@/lib/email'
import { rateLimit } from '@/lib/rateLimit'
import { sanitizeString, sanitizeEmail, sanitizePhone } from '@/lib/sanitize'
import { sendAdminPush } from '@/lib/push'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertWithRetry(supabase: any, data: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[ORDER] Insert attempt ${attempt}/${maxRetries}`)
    const { data: result, error } = await supabase
      .from('orders')
      .insert(data)
      .select('id, order_number')
      .single()

    if (!error) return { data: result, error: null }

    const isRetryable =
      error?.status === 522 ||
      error?.status === 503 ||
      error?.status === 504 ||
      String(error?.message).includes('timeout') ||
      String(error?.message).includes('connection')

    if (!isRetryable || attempt === maxRetries) {
      return { data: null, error }
    }

    console.log(`[ORDER] Retryable error on attempt ${attempt}, waiting 2s...`)
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  return { data: null, error: new Error('Max retries exceeded') }
}

function generateOrderNumber(): string {
  const now = new Date()
  const date =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 900000 + 100000).toString()
  return `BQ-${date}-${random}`
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const { allowed } = rateLimit(`orders:${ip}`, 10, 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  console.log('[ORDER] Creating new order...')

  try {
    const body = await req.json()
    console.log('[ORDER] Request body keys:', Object.keys(body))

    const name = sanitizeString(body.guestName, 100)
    const email = sanitizeEmail(body.guestEmail)
    const phone = sanitizePhone(body.guestPhone)

    const {
      items,
      subtotalKes,
      deliveryFeeKes,
      totalKes,
      paymentMethod,
      deliveryAddress,
    } = body as {
      items?: unknown[]
      subtotalKes?: number
      deliveryFeeKes?: number
      totalKes?: number
      paymentMethod?: string
      deliveryAddress?: Record<string, string>
    }

    // Validate required fields
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Full name must be at least 2 characters' }, { status: 400 })
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 })
    }
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 })
    }
    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 })
    }

    const itemsSubtotal = Number(subtotalKes) || 0
    const deliveryFee = Number(deliveryFeeKes) || 0
    const total = Number(totalKes) || (itemsSubtotal + deliveryFee) || 0
    const orderNumber = generateOrderNumber()
    console.log('[ORDER] Generated order number:', orderNumber)

    const safeAddress = {
      street: String(deliveryAddress?.street || deliveryAddress?.address || 'Not provided').trim(),
      city: String(deliveryAddress?.city || 'Nairobi').trim(),
      county: String(deliveryAddress?.county || 'Nairobi').trim(),
      instructions: String(deliveryAddress?.instructions || deliveryAddress?.notes || '').trim(),
    }

    const safeItems = (items as Record<string, unknown>[]).map((item) => ({
      id: String(item.id || item.productId || ''),
      name: String(item.name || 'Product').trim(),
      brand: String(item.brand || 'EcoFlow').trim(),
      price_kes: Number(item.price_kes) || 0,
      quantity: Number(item.quantity) || 1,
      image: (item.image as string | null) || null,
    }))

    const urlCheck = process.env.NEXT_PUBLIC_SUPABASE_URL
    console.log('[ORDER] Supabase URL check:', urlCheck?.startsWith('https://') ? '✅ Valid' : `❌ MISSING https:// — got: ${urlCheck?.slice(0, 40)}`)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const insertData = {
      order_number: orderNumber,
      guest_name: name,
      guest_email: email,
      guest_phone: phone,
      items: safeItems,
      subtotal_kes: itemsSubtotal || total,
      delivery_fee_kes: deliveryFee,
      total_kes: total,
      payment_method: paymentMethod,
      payment_status: 'pending',
      fulfillment_status: 'unfulfilled',
      delivery_address: safeAddress,
    }

    console.log('[ORDER] Inserting:', {
      ...insertData,
      items: `${safeItems.length} items`,
    })

    const { data: order, error } = await insertWithRetry(supabase, insertData)

    if (error) {
      console.error('[ORDER] Supabase insert error:', error)
      return NextResponse.json({
        error: `Database error: ${error.message}`,
        details: error,
      }, { status: 500 })
    }

    console.log('[ORDER] ✅ Order created:', order.order_number)

    // Instant push alert to admin devices — fire-and-forget
    sendAdminPush({
      title: '🛒 New Order Received',
      body: `${name} · KES ${Number(total).toLocaleString('en-KE')}`,
      tag: 'order',
      id: String(order.id),
      url: `/admin/orders/${order.id}`,
    }).catch(() => {})

    // Send emails in background — never block the response
    const emailPayload = {
      order_number: order.order_number,
      guest_name: name,
      guest_email: email,
      guest_phone: phone,
      items: safeItems,
      total_kes: total,
      payment_method: paymentMethod,
      payment_status: 'pending',
      delivery_address: safeAddress as Record<string, string>,
      created_at: new Date().toISOString(),
    }

    Promise.allSettled([
      emailOrderConfirmation(emailPayload),
      emailAdminNewOrder(emailPayload),
    ]).then((results) => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[ORDER] Email ${i} failed:`, r.reason)
        else console.log(`[ORDER] Email ${i} sent`)
      })
    })

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create order'
    console.error('[ORDER] Exception:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
