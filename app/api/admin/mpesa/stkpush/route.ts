import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getTimestamp() {
  const d = new Date()
  return d.getFullYear().toString() +
    String(d.getMonth()+1).padStart(2,'0') +
    String(d.getDate()).padStart(2,'0') +
    String(d.getHours()).padStart(2,'0') +
    String(d.getMinutes()).padStart(2,'0') +
    String(d.getSeconds()).padStart(2,'0')
}

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: order } = await supabase
      .from('orders')
      .select('id, guest_phone, total_kes, order_number')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const phone = String(order.guest_phone).replace(/\s/g, '')
    const normalizedPhone = phone.startsWith('254') ? phone : phone.startsWith('0') ? '254' + phone.slice(1) : '254' + phone
    const amount = Math.max(1, Math.round(Number(order.total_kes)))

    const consumerKey = process.env.MPESA_CONSUMER_KEY!
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET!
    const shortcode = process.env.MPESA_BUSINESS_SHORTCODE!
    const passkey = process.env.MPESA_PASSKEY!
    const callbackUrl = process.env.MPESA_CALLBACK_URL!
    const baseUrl = 'https://api.safaricom.co.ke'

    const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}` }
    })
    const tokenData = await tokenRes.json()
    const token = tokenData.access_token
    if (!token) return NextResponse.json({ error: 'Token failed', details: tokenData }, { status: 500 })

    const timestamp = getTimestamp()
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerBuyGoodsOnline',
        Amount: amount,
        PartyA: normalizedPhone,
        PartyB: '4575142',
        PhoneNumber: normalizedPhone,
        CallBackURL: callbackUrl,
        AccountReference: 'BATTERIQ',
        TransactionDesc: `Order ${order.order_number}`,
      })
    })

    const stkData = await stkRes.json()
    if (stkData.ResponseCode === '0') {
      await supabase.from('orders').update({
        mpesa_checkout_request_id: stkData.CheckoutRequestID,
        payment_status: 'pending'
      }).eq('id', orderId)
      return NextResponse.json({ success: true, checkoutRequestId: stkData.CheckoutRequestID })
    }
    return NextResponse.json({ error: 'STK push failed', details: stkData }, { status: 500 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
