import { describe, it, expect } from 'vitest'
import { extractApiError, mapPesapalStatus } from '@/lib/pesapal'
import { calculateCardFee } from '@/lib/cardFee'

/**
 * Regression cover for a bug that cost a real card payment.
 *
 * Pesapal attaches an `error` envelope to EVERY response — including successful
 * ones, where every field is null. The client originally did `if (data.error)`,
 * which is truthy for that empty object, so a COMPLETED payment threw, the IPN
 * returned 500, and the order stayed "pending" while the customer's card had
 * already been charged.
 */
describe('extractApiError', () => {
  it('treats the empty error envelope on a successful response as no error', () => {
    const success = {
      payment_method: 'Visa',
      amount: 2.04,
      confirmation_code: '7872343632656656804057',
      payment_status_description: 'Completed',
      status_code: 1,
      error: { error_type: null, code: null, message: null },
      status: '200',
    }
    expect(extractApiError(success)).toBeNull()
  })

  it('reports a populated error envelope', () => {
    const pending = {
      status_code: 0,
      payment_status_description: 'INVALID',
      error: {
        error_type: 'api_error',
        code: 'payment_details_not_found',
        message: 'Pending Payment',
      },
      status: '500',
    }
    expect(extractApiError(pending)).toEqual({
      code: 'payment_details_not_found',
      message: 'Pending Payment',
      type: 'api_error',
    })
  })

  it('ignores empty strings, missing envelopes and arrays', () => {
    expect(extractApiError({ error: { error_type: '', code: '', message: '' } })).toBeNull()
    expect(extractApiError({ status_code: 1 })).toBeNull()
    expect(extractApiError({ error: null })).toBeNull()
    expect(extractApiError([{ ipn_id: 'x' }])).toBeNull()
    expect(extractApiError(null)).toBeNull()
  })
})

describe('mapPesapalStatus', () => {
  it('maps a completed transaction to paid', () => {
    expect(mapPesapalStatus({ status_code: 1 })).toBe('paid')
  })

  it('maps failed and reversed distinctly', () => {
    expect(mapPesapalStatus({ status_code: 2 })).toBe('failed')
    expect(mapPesapalStatus({ status_code: 3 })).toBe('refunded')
  })

  it('leaves an unfinished payment pending rather than failing it', () => {
    // status_code 0 is returned both for INVALID and for "not paid yet", so it
    // must never mark a live order as failed.
    expect(mapPesapalStatus({ status_code: 0 })).toBe('pending')
    expect(mapPesapalStatus({})).toBe('pending')
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
