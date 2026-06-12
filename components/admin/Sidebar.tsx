'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingBag, Tag,
  MessageSquare, Mail, LogOut, CreditCard, Send, Newspaper,
  Users, BarChart3, Download, Star, ImageIcon, Menu, X
} from 'lucide-react'
import { useState, useEffect } from 'react'

function LiveClock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  useEffect(() => {
    function update() {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }))
      setDate(now.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])
  return (
    <div className="flex flex-col items-end">
      <span className="font-black tabular-nums text-white" style={{ fontSize: '22px', letterSpacing: '-0.02em', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{time}</span>
      <span className="text-xs font-medium mt-0.5 hidden sm:block" style={{ color: 'rgba(255,255,255,0.65)' }}>{date}</span>
    </div>
  )
}

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/new-order', label: 'New Order', icon: ShoppingBag },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, badge: 'live' as const },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/images', label: 'Images', icon: ImageIcon },
  { href: '/admin/stock', label: 'Stock', icon: BarChart3 },
  { href: '/admin/pricing', label: 'Pricing Engine', icon: Tag },
  { href: '/admin/ai-chat', label: 'Chat Monitor', icon: MessageSquare },
  { href: '/admin/broadcast', label: 'Broadcast', icon: Send },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Newspaper },
  { href: '/admin/messages', label: 'Messages', icon: Mail },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
]

export function AdminSidebar({ adminName = 'Batteriq Admin', adminRole = 'super_admin' }: {
  adminName?: string
  adminRole?: string
}) {
  const pathname = usePathname()
  const [time, setTime] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false) }, [pathname])

  // Close on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function handleSignOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    window.location.href = '/admin/secure-bq9x2026'
  }

  function isActive(item: typeof NAV[0]) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  const SidebarContent = () => (
    <aside
      style={{height:"100vh",display:"flex",flexDirection:"column",width:"260px",background:"linear-gradient(180deg, #00004d 0%, #000033 100%)"}}
    >
      {/* Logo + Clock */}
      <div className="h-[72px] px-6 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ffffff' }}>
            <span className="text-[#00004d] font-black text-lg">B</span>
          </div>
          <div>
            <p className="text-white font-black text-sm tracking-tight leading-none">BATTERIQ™</p>
            <p className="text-[10px] mt-0.5 font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Admin Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-mono font-black text-blue-400">{time}</p>
          {/* Close button on mobile */}
          <button onClick={() => setOpen(false)} className="lg:hidden ml-2 p-1 rounded-lg text-white/50 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1" style={{overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",scrollbarWidth:"thin",scrollbarColor:"rgba(255,255,255,0.15) transparent"}}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Management</p>
        {NAV.map(item => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 h-12 rounded-xl transition-all duration-200 group relative"
              style={{ background: active ? '#0000ff' : 'transparent', boxShadow: active ? '0 8px 24px rgba(0,0,255,0.25)' : 'none' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <item.icon size={18} style={{ color: active ? '#ffffff' : '#94a3b8' }} />
              <span className="text-[14px] font-semibold flex-1" style={{ color: active ? '#ffffff' : '#cbd5e1' }}>{item.label}</span>
              {item.badge === 'live' && (
                <span className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[9px] font-black text-green-400 uppercase tracking-wider">Live</span>
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Export */}
      <div className="px-4 pb-4 border-t pt-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Export Data</p>
        <div className="flex gap-2">
          <a href="/api/admin/export?type=orders"
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[11px] font-black transition-all border border-white/5"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}>
            <Download size={12} /> ORDERS
          </a>
          <a href="/api/admin/export?type=products"
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[11px] font-black transition-all border border-white/5"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}>
            <Download size={12} /> STOCKS
          </a>
        </div>
      </div>

      {/* User + sign out */}
      <div className="px-4 pb-6 border-t pt-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 px-4 h-[64px] mb-3 rounded-2xl border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm text-[#00004d]" style={{ background: '#ffffff' }}>
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-white truncate leading-none mb-1">{adminName.toUpperCase()}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{adminRole.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 h-11 rounded-xl w-full transition-all text-left"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => { ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; ;(e.currentTarget as HTMLElement).style.color = '#f87171' }}
          onMouseLeave={e => { ;(e.currentTarget as HTMLElement).style.background = 'transparent'; ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >
          <LogOut size={16} />
          <span className="text-[13px] font-bold uppercase tracking-wider">Sign Out</span>
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 z-30 w-[260px]" style={{height:"100vh",overflow:"hidden"}}>
        <SidebarContent />
      </div>

      {/* Mobile/tablet overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Mobile/tablet drawer */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-50 lg:hidden transition-transform duration-300 ease-in-out w-[260px] ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent />
      </div>

      {/* Mobile hamburger button — shown when sidebar is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 left-4 z-40 lg:hidden w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: '#00004d', border: '1px solid rgba(255,255,255,0.15)' }}
          aria-label="Open menu"
        >
          <Menu size={20} className="text-white" />
        </button>
      )}
    </>
  )
}

export function AdminTopBar() {
  return (
    <div
      className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4"
      style={{
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1e2f8f 100%)',
        boxShadow: '0 2px 20px rgba(26,35,126,0.45), 0 1px 0 rgba(255,255,255,0.08) inset',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 100%)' }} />

      {/* Left — offset on mobile to avoid hamburger overlap */}
      <div className="relative pl-14 lg:pl-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Operations Console</p>
        <h2 className="text-base sm:text-xl font-black text-white" style={{ letterSpacing: '-0.02em', textShadow: '0 1px 6px rgba(0,0,0,0.25)' }}>
          Welcome back, Admin
        </h2>
      </div>

      {/* Right */}
      <div className="relative flex items-center gap-3 sm:gap-6">
        <LiveClock />
        <div className="w-px h-10 hidden sm:block" style={{ background: 'rgba(255,255,255,0.2)' }} />
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', backdropFilter: 'blur(4px)' }}
          >B</div>
          <div className="hidden sm:block">
            <p className="text-xs font-black text-white">Batteriq Admin</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>info@batteriq.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}
