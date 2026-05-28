declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test'
    readonly NEXT_PUBLIC_SUPABASE_URL: string
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    readonly SUPABASE_SERVICE_ROLE_KEY: string
    readonly GEMINI_API_KEY: string
    readonly MPESA_CONSUMER_KEY: string
    readonly MPESA_CONSUMER_SECRET: string
    readonly MPESA_SHORTCODE: string
    readonly MPESA_PASSKEY: string
    readonly MPESA_CALLBACK_URL: string
    readonly MPESA_ENVIRONMENT: string
    readonly RESEND_API_KEY: string
    readonly NEXT_PUBLIC_SITE_URL: string
    [key: string]: string | undefined
  }

  interface Process {
    env: ProcessEnv
  }
}

declare var process: NodeJS.Process
