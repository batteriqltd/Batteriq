'use client'

import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type NotifType = 'success' | 'error' | 'warning' | 'info'

interface Notif {
  id: number
  type: NotifType
  title: string
  message?: string
}

interface NotifContextValue {
  notify: (type: NotifType, title: string, message?: string) => void
}

const NotifContext = createContext<NotifContextValue>({ notify: () => {} })

export function useAdminNotify() {
  return useContext(NotifContext)
}

const CONFIG: Record<NotifType, { icon: typeof CheckCircle; bg: string; accent: string; iconBg: string }> = {
  success: {
    icon: CheckCircle,
    bg: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
    accent: '#00A651',
    iconBg: 'linear-gradient(135deg, #00A651, #00C853)',
  },
  error: {
    icon: XCircle,
    bg: 'linear-gradient(135deg, #ffffff 0%, #fff5f5 100%)',
    accent: '#e53e3e',
    iconBg: 'linear-gradient(135deg, #e53e3e, #fc8181)',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
    accent: '#d69e2e',
    iconBg: 'linear-gradient(135deg, #d69e2e, #f6c244)',
  },
  info: {
    icon: Info,
    bg: 'linear-gradient(135deg, #ffffff 0%, #f0f5ff 100%)',
    accent: '#0000ff',
    iconBg: 'linear-gradient(135deg, #0000ff, #4d9fff)',
  },
}

export function AdminNotifyProvider({ children }: { children: ReactNode }) {
  const [notifs, setNotifs] = useState<Notif[]>([])

  const notify = useCallback((type: NotifType, title: string, message?: string) => {
    const id = Date.now() + Math.random()
    setNotifs(prev => [...prev.slice(-2), { id, type, title, message }])
    setTimeout(() => {
      setNotifs(prev => prev.filter(n => n.id !== id))
    }, 4200)
  }, [])

  return (
    <NotifContext.Provider value={{ notify }}>
      {children}

      {/* Notification stack — bottom right */}
      <div className="fixed bottom-6 right-6 z-[120] flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-48px)] sm:max-w-md">
        <AnimatePresence>
          {notifs.map(n => {
            const cfg = CONFIG[n.type]
            const Icon = cfg.icon
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, x: 80, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.92, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="pointer-events-auto rounded-[20px] overflow-hidden flex items-stretch"
                style={{
                  background: cfg.bg,
                  boxShadow: '0 12px 48px rgba(0,0,40,0.16), 0 2px 8px rgba(0,0,40,0.08)',
                  border: '1px solid rgba(0,0,40,0.05)',
                  minWidth: '300px',
                }}
              >
                {/* Accent bar */}
                <div className="w-1.5 flex-shrink-0" style={{ background: cfg.iconBg }} />

                <div className="flex items-start gap-3.5 px-4 py-4 flex-1 min-w-0">
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: cfg.iconBg, boxShadow: `0 4px 14px ${cfg.accent}40` }}
                  >
                    <Icon size={17} className="text-white" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[13px] font-black text-gray-900 leading-snug">{n.title}</p>
                    {n.message && (
                      <p className="text-[11px] font-medium text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                    )}
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={() => setNotifs(prev => prev.filter(x => x.id !== n.id))}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Auto-dismiss progress */}
                <motion.div
                  className="absolute bottom-0 left-0 h-[2.5px]"
                  style={{ background: cfg.iconBg }}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 4.2, ease: 'linear' }}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </NotifContext.Provider>
  )
}
