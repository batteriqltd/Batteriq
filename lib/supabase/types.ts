export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          sku: string
          brand: 'EcoFlow' | 'Bluetti' | 'Anker' | 'Eufy' | 'Soundcore' | 'Nebula'
          category: 'Power Stations' | 'Solar Panels' | 'Accessories' | 'Batteries' | 'Appliances' | 'Solar Home Systems' | 'Power Banks'
          subcategory: string | null
          name: string
          slug: string
          description: string | null
          specs: Json
          images: string[]
          price_kes: number
          compare_price_kes: number | null
          discount_percent: number | null
          discount_badge: string | null
          in_stock: boolean
          stock_qty: number
          featured: boolean
          sort_order: number
          meta_title: string | null
          meta_description: string | null
          schema_rating: number
          schema_review_count: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          items: Json
          subtotal_kes: number
          total_kes: number
          payment_method: 'mpesa_now' | 'cod_cash' | 'cod_mpesa' | 'sales_confirmation' | 'pesapal_card'
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
          fulfillment_status: 'unfulfilled' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          delivery_address: Json | null
          mpesa_checkout_request_id: string | null
          mpesa_transaction_code: string | null
          mpesa_failure_reason: string | null
          // Pesapal card payments (migration 005) — null on M-Pesa orders
          pesapal_order_tracking_id: string | null
          pesapal_merchant_reference: string | null
          pesapal_payment_method: string | null
          pesapal_confirmation_code: string | null
          pesapal_status_description: string | null
          card_fee_rate: number | null
          card_fee_kes: number | null
          total_charged_kes: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      ai_chat_sessions: {
        Row: {
          id: string
          session_token: string
          user_id: string | null
          guest_name: string | null
          messages: Json
          order_generated: string | null
          started_at: string
          last_active: string
        }
        Insert: Omit<Database['public']['Tables']['ai_chat_sessions']['Row'], 'id' | 'started_at' | 'last_active'>
        Update: Partial<Database['public']['Tables']['ai_chat_sessions']['Insert']>
      }
      admin_users: {
        Row: {
          id: string
          role: 'super_admin' | 'staff'
          name: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_users']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>
      }
      newsletter_subscribers: {
        Row: {
          id: string
          email: string
          name: string | null
          subscribed_at: string
        }
        Insert: Omit<Database['public']['Tables']['newsletter_subscribers']['Row'], 'id' | 'subscribed_at'>
        Update: Partial<Database['public']['Tables']['newsletter_subscribers']['Insert']>
      }
      price_audit_log: {
        Row: {
          id: string
          product_id: string | null
          old_price: number | null
          new_price: number | null
          changed_by: string | null
          reason: string | null
          changed_at: string
        }
        Insert: Omit<Database['public']['Tables']['price_audit_log']['Row'], 'id' | 'changed_at'>
        Update: never
      }
    }
  }
}

export type Product = Database['public']['Tables']['products']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type AiChatSession = Database['public']['Tables']['ai_chat_sessions']['Row']
export type AdminUser = Database['public']['Tables']['admin_users']['Row']
export type NewsletterSubscriber = Database['public']['Tables']['newsletter_subscribers']['Row']
export type PriceAuditLog = Database['public']['Tables']['price_audit_log']['Row']

export type ContactSubmission = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  inquiry_type: string | null
  message: string
  status: string
  submitted_at: string
}

export type CartItem = {
  productId: string
  name: string
  brand: string
  slug: string
  price_kes: number
  quantity: number
  image: string
}

export type CheckoutFormData = {
  name: string
  email: string
  phone: string
  address: string
  city: string
  county: string
  notes?: string
  paymentMethod: 'mpesa_now' | 'cod_cash' | 'cod_mpesa'
}

export type MpesaSTKPushResponse = {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
