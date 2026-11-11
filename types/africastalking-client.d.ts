/**
 * Minimal local type declarations for `africastalking-client` (browser
 * WebRTC softphone SDK). Kept in-repo for the same reason as
 * types/africastalking.d.ts — no official types package exists.
 * Shapes verified against the package's own README (events + methods
 * tables), not guessed.
 */
declare module 'africastalking-client' {
  export type VoiceClientEvent =
    | 'ready'
    | 'notready'
    | 'calling'
    | 'incomingcall'
    | 'callaccepted'
    | 'hangup'
    | 'offline'
    | 'closed'

  export interface IncomingCallParams {
    from: string
    [key: string]: unknown
  }

  export interface HangupCause {
    code: string | number
    reason: string
  }

  export class VoiceClient {
    constructor(token: string)
    on(event: 'incomingcall', handler: (params: IncomingCallParams) => void, useCapture?: boolean): void
    on(event: 'hangup', handler: (cause: HangupCause) => void, useCapture?: boolean): void
    on(event: VoiceClientEvent, handler: (...args: unknown[]) => void, useCapture?: boolean): void
    call(numberOrClient: string): void
    answer(): void
    hangup(): void
    dtmf(digit: string): void
    mute(): void
    unmute(): void
    hold(): void
    unhold(): void
    destroy(): void
  }

  const Africastalking: { Client: typeof VoiceClient }
  export default Africastalking
}
