export const LEAD_STATUSES = [
  'new',
  'contacted',
  'replied',
  'interested',
  'hot',
  'customer',
  'opted_out',
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_CATEGORIES = [
  'school',
  'ngo',
  'government',
  'hospital',
  'retail',
  'hotel',
  'organization',
  'shop',
  'website_inquiry',
  'other',
] as const

export type LeadCategory = (typeof LEAD_CATEGORIES)[number]

export type LeadSource =
  | 'google_places'
  | 'website_form'
  | 'whatsapp_inbound'
  | 'manual'

export type ConversationMode = 'ai' | 'human'

export type ConversationStatus = 'open' | 'pending_human' | 'closed' | 'opted_out'

export type OutreachModule =
  | 'lead_finder'
  | 'email_campaign'
  | 'whatsapp'
  | 'ai_takeover'
  | 'followups'
  | 'calling'
  | 'compliance'
  | 'autopilot'
  | 'proforma'

export const NOTIFY_EVENTS = [
  'whatsapp_message',
  'client_reply',
  'hot_lead',
  'batch_failed',
  'autopilot_error',
] as const

export type NotifyEvent = (typeof NOTIFY_EVENTS)[number]

export interface OutreachSettings {
  id: string
  campaign_paused: boolean
  review_before_send: boolean
  daily_email_limit: number
  sender_name: string
  sender_email: string
  reply_to_email: string
  target_categories: string[]
  target_cities: string[]
  discovery_cursor: number
  followup_days: number
  whatsapp_followup_template: string
  whatsapp_default_template: string
  whatsapp_cold_template: string
  calling_enabled: boolean
  auto_attach_proforma: boolean
  autopilot_enabled: boolean
  autopilot_interval_minutes: number
  auto_cold_whatsapp: boolean
  last_autopilot_at: string | null
  updated_at: string
  /** Workspace-wide notification settings — there's no per-user settings
   *  infrastructure anywhere else in the app yet, so these follow the same
   *  shared-settings pattern as everything else here rather than introducing
   *  a new per-user table for this alone. */
  notify_events: NotifyEvent[]
  /** 24h "HH:MM" in Africa/Nairobi, or null for no quiet hours. */
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

export interface OutreachLead {
  id: string
  business_name: string
  category: LeadCategory
  city: string | null
  address: string | null
  website_url: string | null
  domain: string | null
  google_place_id: string | null
  email: string | null
  phone_e164: string | null
  source: LeadSource
  source_details: Record<string, unknown>
  status: LeadStatus
  rating: number | null
  business_summary: string | null
  whatsapp_opted_in: boolean
  whatsapp_last_inbound_at: string | null
  human_contacted_at: string | null
  followup_sent_at: string | null
  last_emailed_at: string | null
  email_count: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OutreachEmail {
  id: string
  lead_id: string
  to_email: string
  from_identity: string
  reply_to: string | null
  subject: string
  body_html: string
  body_text: string
  unsubscribe_token: string
  status:
    | 'pending_review'
    | 'approved'
    | 'queued'
    | 'sent'
    | 'failed'
    | 'suppressed'
    | 'rejected'
  resend_message_id: string | null
  claude_model: string | null
  error_message: string | null
  retry_count: number
  reviewed_by: string | null
  reviewed_at: string | null
  sent_at: string | null
  unsubscribed_at: string | null
  proforma_number?: string | null
  proforma_total_kes?: number | null
  created_at: string
  outreach_leads?: Partial<OutreachLead> | null
}

export interface OutreachConversation {
  id: string
  lead_id: string | null
  phone_e164: string
  contact_name: string | null
  mode: ConversationMode
  unread_count: number
  last_inbound_at: string | null
  last_outbound_at: string | null
  last_message_preview: string | null
  opted_in: boolean
  escalated_reason: string | null
  escalated_at: string | null
  status: ConversationStatus
  created_at: string
  updated_at: string
  outreach_leads?: Partial<OutreachLead> | null
}

export interface OutreachMessage {
  id: string
  conversation_id: string
  lead_id: string | null
  direction: 'inbound' | 'outbound'
  sender_type: 'lead' | 'ai' | 'human' | 'system_template'
  message_type: 'text' | 'template' | 'interactive' | 'unsupported'
  body: string
  template_name: string | null
  wa_message_id: string | null
  delivery_status: 'received' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  ai_metadata: Record<string, unknown>
  error_message: string | null
  created_at: string
}

export interface OutreachCallLog {
  id: string
  lead_id: string
  phone_e164: string
  eligibility_reason: 'lead_replied' | 'requested_contact'
  ai_disclosure_script: string
  provider: string
  status: 'stub_queued' | 'initiated' | 'completed' | 'failed' | 'blocked'
  provider_session_id: string | null
  notes: string | null
  created_at: string
  outreach_leads?: Partial<OutreachLead> | null
}

export interface OutreachLogEntry {
  id: string
  module: OutreachModule
  level: 'info' | 'warn' | 'error'
  event: string
  message: string
  metadata: Record<string, unknown>
  created_at: string
}

export const DEFAULT_OUTREACH_SETTINGS: OutreachSettings = {
  id: 'default',
  campaign_paused: false,
  review_before_send: false,
  daily_email_limit: 50,
  sender_name: 'Batteriq Kenya Business Solutions',
  sender_email:
    process.env.RESEND_OUTREACH_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'sales@batteriq.com',
  reply_to_email: process.env.OUTREACH_REPLY_TO_EMAIL || 'sale@batteriq.com',
  target_categories: [
    'schools & universities',
    'ngos & foundations',
    'government parastatals',
    'retail & baby shops',
    'hospitals & clinics',
    'hotels & lodges',
    'organizations & saccos',
  ],
  target_cities: [
    'Nairobi',
    'Mombasa',
    'Kisumu',
    'Nakuru',
    'Eldoret',
    'Thika',
    'Naivasha',
    'Nanyuki',
    'Malindi',
    'Machakos',
  ],
  discovery_cursor: 0,
  followup_days: 7,
  whatsapp_followup_template: 'batteriq_inquiry_followup',
  whatsapp_default_template: 'batteriq_business_reply',
  whatsapp_cold_template: 'batteriq_quote_ready',
  calling_enabled: false,
  auto_attach_proforma: true,
  autopilot_enabled: true,
  autopilot_interval_minutes: 30,
  auto_cold_whatsapp: false,
  last_autopilot_at: null,
  updated_at: new Date(0).toISOString(),
  notify_events: [...NOTIFY_EVENTS],
  quiet_hours_start: null,
  quiet_hours_end: null,
}
