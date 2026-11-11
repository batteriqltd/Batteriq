/**
 * Minimal local type declarations for `africastalking` (server SDK).
 * Kept in-repo so the build never depends on an external @types package
 * resolving on CI — same pattern as types/web-push.d.ts and
 * types/qrcode.d.ts. Shapes verified against the installed package's
 * source (node_modules/africastalking/lib/voice.js, actionbuilder.js),
 * not guessed.
 */
declare module 'africastalking' {
  export interface VoiceCallParams {
    callFrom: string
    callTo: string | string[]
    clientRequestId?: string
  }

  export interface CapabilityTokenParams {
    clientName: string
    phoneNumber: string
    incoming?: boolean
    outgoing?: boolean
    /** Seconds, or a string like "3600s". Defaults to 86400s. */
    expire?: number | string
  }

  export interface CapabilityTokenResponse {
    clientName: string
    incoming: boolean
    outgoing: boolean
    lifeTimeSec: string
    token: string
  }

  export interface DialAttributes {
    callerId?: string
    record?: boolean
    sequential?: boolean
    maxDuration?: number
    ringBackTone?: string
  }

  export interface GetDigitsAttributes {
    finishOnKey?: string
    numDigits?: number
    timeout?: number
    callbackUrl?: string
  }

  export interface RecordAttributes {
    finishOnKey?: string
    maxLength?: number
    timeout?: number
    playBeep?: boolean
    trimSilence?: boolean
    callbackUrl?: string
  }

  export interface SayAttributes {
    voice?: string
    playBeep?: boolean
  }

  export class ActionBuilder {
    say(text: string, attributes?: SayAttributes): this
    play(url: string): this
    dial(phoneNumbers: string, attributes?: DialAttributes): this
    getDigits(children: { say?: { text: string; voice?: string }; play?: { url: string } }, attributes?: GetDigitsAttributes): this
    record(children: { say?: { text: string; voice?: string }; play?: { url: string } }, attributes?: RecordAttributes): this
    enqueue(attributes?: { holdMusic?: string; name?: string }): this
    dequeue(phoneNumber: string, attributes?: { name?: string }): this
    redirect(url: string): this
    conference(): this
    reject(): this
    build(): string
  }

  export class Voice {
    ActionBuilder: typeof ActionBuilder
    call(params: VoiceCallParams): Promise<unknown>
    requestCapabilityToken(params: CapabilityTokenParams): Promise<CapabilityTokenResponse>
    getNumQueuedCalls(params: { phoneNumbers: string | string[] }): Promise<unknown>
    uploadMediaFile(params: { url: string; phoneNumber: string }): Promise<unknown>
  }

  export interface AfricasTalkingInstance {
    VOICE: Voice
  }

  export default function AfricasTalking(options: {
    username: string
    apiKey: string
    format?: 'json' | 'xml'
  }): AfricasTalkingInstance
}
