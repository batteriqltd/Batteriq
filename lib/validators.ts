import { z } from 'zod'

export const checkoutSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^254[0-9]{9}$/, 'Phone must be in format 254XXXXXXXXX (E.164)'),
  address: z.string().min(5, 'Please enter your delivery address'),
  city: z.string().min(2, 'City is required'),
  county: z.string().min(2, 'County is required'),
  notes: z.string().optional(),
  paymentMethod: z.enum(['mpesa_now', 'cod_cash', 'cod_mpesa']),
})

export const stkPushSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^254[0-9]{9}$/, 'Phone must be in E.164 format: 254XXXXXXXXX'),
  orderId: z.string().uuid('Invalid order ID'),
})

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive().max(99),
      })
    )
    .min(1, 'Cart must have at least one item'),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z
    .string()
    .regex(/^254[0-9]{9}$/, 'Phone must be in E.164 format'),
  deliveryAddress: z.object({
    address: z.string().min(5),
    city: z.string().min(2),
    county: z.string().min(2),
  }),
  paymentMethod: z.enum(['mpesa_now', 'cod_cash', 'cod_mpesa']),
  notes: z.string().optional(),
})

export const newsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
})

export const aiChatSchema = z.object({
  sessionToken: z.string().min(10),
  message: z.string().min(1).max(2000),
  sessionHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        parts: z.array(z.object({ text: z.string() })),
      })
    )
    .default([]),
})

export const adminPricingSchema = z.object({
  brand: z.enum(['EcoFlow', 'Bluetti']).optional(),
  productId: z.string().uuid().optional(),
  adjustmentType: z.enum(['percent', 'fixed']),
  adjustmentValue: z.number(),
  reason: z.string().min(5, 'Please provide a reason for this price change'),
})

export const adminOrderUpdateSchema = z.object({
  orderId: z.string().uuid(),
  fulfillmentStatus: z
    .enum(['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'])
    .optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
})
