import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const WARRANTY_MONTHS: Record<string, number> = {
  'Power Station': 24,
  'Solar Panel': 24,
  'Extra Battery': 24,
  'Smart Generator': 24,
  'Appliance': 24,
  'Accessory': 12,
}

const PRODUCT_TYPE_MAP: Record<string, string> = {
  'DELTA': 'Power Station',
  'RIVER': 'Power Station',
  'Solar Panel': 'Solar Panel',
  'Extra Battery': 'Extra Battery',
  'EB300': 'Extra Battery',
  'EB600': 'Extra Battery',
  'Smart Generator': 'Smart Generator',
  'GLACIER': 'Appliance',
  'WAVE': 'Appliance',
  'Charger': 'Accessory',
  'Inverter': 'Accessory',
  'Power Bank': 'Accessory',
}

function getProductType(name: string): string {
  for (const [key, type] of Object.entries(PRODUCT_TYPE_MAP)) {
    if (name.includes(key)) return type
  }
  return 'Accessory'
}

function generateRegistrationNumber(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(10000 + Math.random() * 90000)
  return `BQ-WR-${yy}${mm}-${random}`
}

const schema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(9, 'Valid phone required'),
  county: z.string().min(1, 'County required'),
  productBrand: z.enum(['EcoFlow', 'Bluetti']),
  productName: z.string().min(1, 'Product required'),
  productSku: z.string().optional(),
  serialNumber: z.string().min(3, 'Serial number required'),
  purchaseDate: z.string().min(1, 'Purchase date required'),
  purchaseChannel: z.string().min(1, 'Purchase channel required'),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid form data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = createAdminClient()

    // Duplicate serial number check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('warranty_registrations') as any)
      .select('id')
      .eq('serial_number', data.serialNumber.trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'This serial number is already registered. Contact support if this is a mistake.' },
        { status: 409 }
      )
    }

    const productType = getProductType(data.productName)
    const warrantyMonths = WARRANTY_MONTHS[productType] ?? 12
    const purchaseDateObj = new Date(data.purchaseDate)
    const warrantyEnd = new Date(purchaseDateObj)
    warrantyEnd.setMonth(warrantyEnd.getMonth() + warrantyMonths)
    const registrationNumber = generateRegistrationNumber()
    const warrantyEndStr = warrantyEnd.toISOString().split('T')[0]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from('warranty_registrations') as any).insert({
      registration_number: registrationNumber,
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      county: data.county,
      product_brand: data.productBrand,
      product_name: data.productName,
      product_sku: data.productSku?.trim() || null,
      serial_number: data.serialNumber.trim(),
      purchase_date: data.purchaseDate,
      purchase_channel: data.purchaseChannel,
      product_type: productType,
      warranty_months: warrantyMonths,
      warranty_end: warrantyEndStr,
    })

    if (insertError) {
      console.error('Warranty insert error:', insertError)
      return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
    }

    // Fire-and-forget confirmation email
    sendWarrantyConfirmationEmail({
      email: data.email,
      firstName: data.firstName,
      productName: data.productName,
      registrationNumber,
      warrantyEnd: warrantyEndStr,
      warrantyMonths,
    }).catch((e) => console.error('Warranty email error:', e))

    return NextResponse.json({
      success: true,
      registrationNumber,
      warrantyEnd: warrantyEndStr,
      warrantyMonths,
    })
  } catch (error) {
    console.error('Warranty registration error:', error)
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}

async function sendWarrantyConfirmationEmail({
  email,
  firstName,
  productName,
  registrationNumber,
  warrantyEnd,
  warrantyMonths,
}: {
  email: string
  firstName: string
  productName: string
  registrationNumber: string
  warrantyEnd: string
  warrantyMonths: number
}) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const [year, month, day] = warrantyEnd.split('-')
  const formattedEnd = `${day}/${month}/${year}`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: `Warranty Registered — ${registrationNumber} | Batteriq`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:DM Sans,system-ui,sans-serif;background:#f5f5f5;margin:0;padding:20px">
        <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden">
          <div style="background:#000000;padding:24px;text-align:center">
            <h1 style="color:white;margin:0;font-size:22px;letter-spacing:-0.5px">BATTERIQ™</h1>
            <p style="color:#888;margin:4px 0 0;font-size:12px">Guarantee your Uptime.</p>
          </div>
          <div style="padding:32px">
            <h2 style="color:#000;margin:0 0 8px">Warranty Registered!</h2>
            <p style="color:#666;margin:0 0 24px">Hi ${firstName}, your product warranty has been successfully registered with Batteriq Kenya.</p>
            <div style="background:#f0f0ff;border-radius:8px;padding:20px;margin-bottom:24px">
              <p style="margin:0 0 4px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.08em">Registration Number</p>
              <p style="margin:0;font-size:22px;font-weight:700;font-family:monospace;color:#0000ff">${registrationNumber}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr style="border-bottom:1px solid #eee">
                <td style="padding:10px 0;color:#666;font-size:13px;width:160px">Product</td>
                <td style="padding:10px 0;font-weight:600;font-size:13px">${productName}</td>
              </tr>
              <tr style="border-bottom:1px solid #eee">
                <td style="padding:10px 0;color:#666;font-size:13px">Warranty Period</td>
                <td style="padding:10px 0;font-weight:600;font-size:13px">${warrantyMonths} months</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#666;font-size:13px">Expires</td>
                <td style="padding:10px 0;font-weight:600;font-size:13px;color:#22c55e">${formattedEnd}</td>
              </tr>
            </table>
            <div style="background:#f9fafb;border-radius:8px;padding:16px">
              <p style="margin:0;font-size:13px;color:#333"><strong>Need warranty support?</strong></p>
              <p style="margin:6px 0 0;font-size:13px;color:#666">Keep this registration number safe — you will need it for any warranty claim. Contact us on WhatsApp or visit batteriq.com/support/warranty.</p>
            </div>
          </div>
          <div style="background:#f5f5f5;padding:16px;text-align:center">
            <p style="margin:0;font-size:12px;color:#888">© 2025 Batteriq Solutions Ltd. Nairobi, Kenya. Authorised EcoFlow &amp; Bluetti Dealer.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  })
}
