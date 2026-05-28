import { CheckCircle } from 'lucide-react'

export function TrustBanner() {
  return (
    <div className="bg-bq-blue py-4">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-white text-center">
        <div data-trust-item className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold text-sm lg:text-base">
            Kenya&apos;s Official Authorised EcoFlow Distributor
          </span>
        </div>
        <span className="hidden sm:block text-blue-300">|</span>
        <span data-trust-item className="text-sm text-blue-100">
          Genuine products · Official warranty · EcoFlow-certified service
        </span>
      </div>
    </div>
  )
}
