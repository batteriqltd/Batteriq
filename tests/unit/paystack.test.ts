import { createHmac } from 'crypto'
import { describe, it, expect } from 'vitest'
import {
  assessTransaction,
  isValidReference,
  readMetadata,
  toSubunits,
  verifyWebhookSignature,
} from '@/lib/paystack'
import { calculateCardFee, isCardPaymentMethod } from '@/lib/cardFee'

const BODY = JSON.stringify({ event: 'charge.success', data: { reference: 'BQ-1-abcd' } })
const WHSEC = 'whsec_test_secret'
const SK = 'sk_test_secret'
const NOW = 1_760_270_400

const hmac = (secret: string, payload: string) => createHmac('sha512', secret).update(payload).digest('hex')
const signed = (t: number, secret = WHSEC, body = BODY) => `t=${t},v1=whk_3f9a1c2e:${hmac(secret, `${t}.${body}`)}`

const verify = (over: Partial<Parameters<typeof verifyWebhookSignature>[0]>) =>
  verifyWebhookSignature({
    rawBody: BODY,
    signedHeader: null,
    legacyHeader: null,
    webhookSecret: WHSEC,
    secretKey: SK,
    nowSeconds: NOW,
    ...over,
  })

describe('verifyWebhookSignature', () => {
  it('accepts x-paystack-signature signed with the secret key (the documented form)', () => {
    expect(verify({ legacyHeader: hmac(SK, BODY) })).toBe(true)
  })

  it('accepts x-paystack-signature signed with the webhook secret', () => {
    expect(verify({ legacyHeader: hmac(WHSEC, BODY) })).toBe(true)
  })

  it('accepts Paystack-Signature signed with the webhook secret', () => {
    expect(verify({ signedHeader: signed(NOW) })).toBe(true)
  })

  it('accepts a rotation header when any v1 matches', () => {
    const other = `v1=whk_old:${hmac('whsec_old', `${NOW}.${BODY}`)}`
    expect(verify({ signedHeader: `${other.replace('v1', `t=${NOW},v1`)},v1=whk_new:${hmac(WHSEC, `${NOW}.${BODY}`)}` })).toBe(true)
  })

  it('rejects a Paystack-Signature outside the replay window', () => {
    expect(verify({ signedHeader: signed(NOW - 301) })).toBe(false)
  })

  it('rejects a body that does not match its signature', () => {
    expect(verify({ rawBody: `${BODY} `, legacyHeader: hmac(SK, BODY) })).toBe(false)
    expect(verify({ rawBody: `${BODY} `, signedHeader: signed(NOW) })).toBe(false)
  })

  it('rejects a signature from any other secret', () => {
    expect(verify({ legacyHeader: hmac('sk_attacker', BODY) })).toBe(false)
    expect(verify({ signedHeader: signed(NOW, 'whsec_attacker') })).toBe(false)
  })

  it('rejects missing and malformed signatures without throwing', () => {
    expect(verify({})).toBe(false)
    expect(verify({ legacyHeader: 'not-hex' })).toBe(false)
    expect(verify({ legacyHeader: 'ab' })).toBe(false)
    expect(verify({ signedHeader: 't=abc,v1=x:y' })).toBe(false)
    expect(verify({ signedHeader: `v1=whk:${hmac(WHSEC, BODY)}` })).toBe(false)
  })

  it('rejects everything when no secrets are configured', () => {
    expect(verify({ webhookSecret: null, secretKey: null, legacyHeader: hmac(SK, BODY), signedHeader: signed(NOW) })).toBe(false)
    expect(verify({ webhookSecret: '', secretKey: '', legacyHeader: hmac('', BODY) })).toBe(false)
  })
})

describe('assessTransaction', () => {
  const expected = { reference: 'BQ-1-abcd', amountSubunits: 102000 }
  const success = { status: 'success', reference: 'BQ-1-abcd', amount: 102000, currency: 'KES' }

  it('is paid only when status, reference, currency and amount all match', () => {
    expect(assessTransaction(success, expected)).toBe('paid')
  })

  it('never reports paid on a mismatch', () => {
    expect(assessTransaction({ ...success, amount: 101999 }, expected)).toBe('mismatch')
    expect(assessTransaction({ ...success, amount: 102001 }, expected)).toBe('mismatch')
    expect(assessTransaction({ ...success, currency: 'NGN' }, expected)).toBe('mismatch')
    expect(assessTransaction({ ...success, reference: 'other' }, expected)).toBe('mismatch')
    expect(assessTransaction({ ...success, amount: undefined }, expected)).toBe('mismatch')
    expect(assessTransaction({ ...success, amount: 0 }, { ...expected, amountSubunits: 0 })).toBe('mismatch')
  })

  it('leaves in-flight statuses pending, including abandoned', () => {
    for (const status of ['abandoned', 'ongoing', 'pending', 'processing', 'queued', undefined]) {
      expect(assessTransaction({ ...success, status }, expected)).toBe('pending')
    }
  })

  it('maps failed and reversed', () => {
    expect(assessTransaction({ ...success, status: 'failed' }, expected)).toBe('failed')
    expect(assessTransaction({ ...success, status: 'reversed' }, expected)).toBe('refunded')
  })
})

describe('helpers', () => {
  it('converts KES to integer cents without float drift', () => {
    expect(toSubunits(1020)).toBe(102000)
    expect(toSubunits(1020.5)).toBe(102050)
    expect(toSubunits(19.99)).toBe(1999)
    expect(toSubunits('78450.10')).toBe(7845010)
  })

  it('only accepts characters Paystack allows in a reference', () => {
    expect(isValidReference('BQ-20260820-123456-a1b2c3d4')).toBe(true)
    expect(isValidReference('')).toBe(false)
    expect(isValidReference('../../customer')).toBe(false)
    expect(isValidReference('a b')).toBe(false)
  })

  it('reads metadata whether Paystack returns an object or a string', () => {
    expect(readMetadata({ order_id: 'x' })).toEqual({ order_id: 'x' })
    expect(readMetadata('{"order_id":"x"}')).toEqual({ order_id: 'x' })
    expect(readMetadata('not json')).toEqual({})
    expect(readMetadata(null)).toEqual({})
  })

  it('recognises the stored card method, and nothing M-Pesa', () => {
    expect(isCardPaymentMethod('pesapal_card')).toBe(true)
    expect(isCardPaymentMethod('mpesa_now')).toBe(false)
    expect(isCardPaymentMethod(undefined)).toBe(false)
  })
})

describe('calculateCardFee', () => {
  it('always sums exactly, in whole cents', () => {
    for (const subtotal of [2, 1000, 129999, 45500, 78450, 0.01]) {
      const f = calculateCardFee(subtotal)
      expect(Math.round((f.subtotalKes + f.feeKes) * 100)).toBe(Math.round(f.totalChargedKes * 100))
    }
  })

  it('charges 2% by default', () => {
    const f = calculateCardFee(1000)
    expect(f.feeKes).toBe(20)
    expect(f.totalChargedKes).toBe(1020)
  })

  it('never produces a negative charge from bad input', () => {
    expect(calculateCardFee(-5).totalChargedKes).toBe(0)
    expect(calculateCardFee(NaN).totalChargedKes).toBe(0)
  })
})
