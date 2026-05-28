import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

type StatsCardProps = {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  href?: string
}

export function StatsCard({ label, value, sub, icon: Icon, iconColor = '#0000ff', iconBg = '#eff6ff', href }: StatsCardProps) {
  const inner = (
    <div
      className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-200 group"
      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        {href && <ArrowUpRight size={15} className="text-gray-300 group-hover:text-blue-600 transition-colors" />}
      </div>
      <p className="text-2xl font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.02em' }}>{value}</p>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}
