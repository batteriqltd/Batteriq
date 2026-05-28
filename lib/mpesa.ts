const REQUIRED_ENV_VARS = [
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_BUSINESS_SHORTCODE',
  'MPESA_PASSKEY',
  'MPESA_CALLBACK_URL',
] as const

export function validateMpesaEnv(): { valid: boolean; missing: string[] } {
  const missing = REQUIRED_ENV_VARS.filter((k) => !process.env[k])
  return { valid: missing.length === 0, missing }
}

const MPESA_BASE_URL =
  process.env.MPESA_ENVIRONMENT === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

async function getOAuthToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64')

  const res = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    }
  )

  if (!res.ok) {
    throw new Error(`M-Pesa OAuth failed: ${res.status}`)
  }

  const data = await res.json()
  return data.access_token as string
}

function getMpesaTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  )
}

function getMpesaPassword(timestamp: string): string {
  const raw = `${process.env.MPESA_BUSINESS_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  return Buffer.from(raw).toString('base64')
}

export type STKPushResult = {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

export async function initiateSTKPush({
  phoneNumber,
  amount,
  orderId,
  orderNumber,
}: {
  phoneNumber: string
  amount: number
  orderId: string
  orderNumber: string
}): Promise<STKPushResult> {
  const token = await getOAuthToken()
  const timestamp = getMpesaTimestamp()
  const password = getMpesaPassword(timestamp)

  const body = {
    BusinessShortCode: process.env.MPESA_BUSINESS_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.ceil(amount),
    PartyA: phoneNumber,
    PartyB: process.env.MPESA_BUSINESS_SHORTCODE,
    PhoneNumber: phoneNumber,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: `BQ-${orderNumber}`,
    TransactionDesc: `Batteriq Order ${orderNumber}`,
  }

  const res = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`STK Push failed: ${err}`)
  }

  return res.json() as Promise<STKPushResult>
}

export type STKCallbackBody = {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>
      }
    }
  }
}

export function extractMpesaReceiptNumber(body: STKCallbackBody): string | null {
  const items = body.Body.stkCallback.CallbackMetadata?.Item ?? []
  const receipt = items.find((i) => i.Name === 'MpesaReceiptNumber')
  return receipt?.Value?.toString() ?? null
}
