import AfricasTalking, { ActionBuilder, type AfricasTalkingInstance } from 'africastalking'

let cachedClient: AfricasTalkingInstance | null = null

export interface VoiceReadiness {
  configured: boolean
  username: string | null
  callerId: string | null
}

export function getVoiceReadiness(): VoiceReadiness {
  const apiKey = process.env.AFRICASTALKING_API_KEY?.trim() || ''
  const username = process.env.AFRICASTALKING_USERNAME?.trim() || null
  const callerId = process.env.AFRICASTALKING_CALLER_ID?.trim() || null
  return {
    configured: Boolean(apiKey && username && callerId),
    username,
    callerId,
  }
}

/** Throws a clear, specific error rather than a generic SDK failure when env vars are missing. */
function getVoiceClient(): AfricasTalkingInstance {
  const apiKey = process.env.AFRICASTALKING_API_KEY?.trim()
  const username = process.env.AFRICASTALKING_USERNAME?.trim()
  if (!apiKey || !username) {
    throw new Error(
      'Africa’s Talking is not configured — set AFRICASTALKING_API_KEY, AFRICASTALKING_USERNAME and AFRICASTALKING_CALLER_ID.'
    )
  }
  if (!cachedClient) {
    cachedClient = AfricasTalking({ username, apiKey, format: 'json' })
  }
  return cachedClient
}

/**
 * WebRTC client names must be unique, space-free identifiers. Admin UUIDs
 * already satisfy that, but we prefix them so they're recognizable in AT's
 * dashboard/logs as ours.
 */
export function clientNameForAdmin(adminUserId: string): string {
  return `bq_${adminUserId.replace(/-/g, '')}`
}

export async function requestWebrtcCapabilityToken(adminUserId: string): Promise<{ token: string; clientName: string }> {
  const { callerId } = getVoiceReadiness()
  if (!callerId) {
    throw new Error('AFRICASTALKING_CALLER_ID is not configured.')
  }
  const client = getVoiceClient()
  const clientName = clientNameForAdmin(adminUserId)
  const result = await client.VOICE.requestCapabilityToken({
    clientName,
    phoneNumber: callerId,
    incoming: true,
    outgoing: true,
    expire: 20 * 60 * 60, // 20h — refreshed well before Africa's Talking's own 24h cap
  })
  return { token: result.token, clientName: result.clientName }
}

/**
 * Builds the XML for an inbound call: ring every available agent's WebRTC
 * client simultaneously (sequential=false — Africa's Talking's own
 * first-to-answer behavior, no custom race logic needed), recording the
 * call. Falls back to voicemail when nobody is available.
 */
export function buildRingGroupXml(params: {
  availableAdminUserIds: string[]
  callerId: string
}): string {
  const builder = new ActionBuilder()
  if (params.availableAdminUserIds.length === 0) {
    return buildVoicemailXml()
  }
  const destinations = params.availableAdminUserIds
    .map((id) => `${process.env.AFRICASTALKING_USERNAME}.${clientNameForAdmin(id)}`)
    .join(',')
  builder.dial(destinations, {
    sequential: false,
    record: true,
    maxDuration: 3600,
    callerId: params.callerId,
  })
  return builder.build()
}

export function buildVoicemailXml(): string {
  const builder = new ActionBuilder()
  builder.record(
    { say: { text: 'Sorry, nobody is available to take your call right now. Please leave a message after the beep, and we will call you back.' } },
    { maxLength: 120, playBeep: true, trimSilence: true, finishOnKey: '#' }
  )
  return builder.build()
}
