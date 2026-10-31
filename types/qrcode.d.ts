/**
 * Minimal local type declarations for `qrcode`.
 * Kept in-repo so the build never depends on `@types/qrcode` resolving on CI
 * (only the tiny surface we actually use is declared) — same pattern as
 * types/web-push.d.ts.
 */
declare module 'qrcode' {
  export interface QRCodeToDataURLOptions {
    margin?: number
    width?: number
    color?: { dark?: string; light?: string }
  }

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>

  const QRCode: {
    toDataURL: typeof toDataURL
  }
  export default QRCode
}
