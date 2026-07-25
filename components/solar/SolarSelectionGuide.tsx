'use client'

import { ArrowDown, BatteryCharging, BriefcaseBusiness, House, Sun, TentTree } from 'lucide-react'
import { useState } from 'react'

const useCases = [
  {
    id: 'day',
    label: 'Daily essentials',
    title: 'Keep the small things running',
    copy: 'Phones, lights, Wi-Fi and a compact power station — a simple solar setup for everyday independence.',
    watts: '45W–160W',
    detail: 'Lightweight, foldable panels',
    Icon: BatteryCharging,
  },
  {
    id: 'outdoor',
    label: 'Travel & outdoors',
    title: 'Pack power for the road',
    copy: 'Make your campsite, road trip or field work more self-sufficient with portable solar charging.',
    watts: '160W–220W',
    detail: 'A strong balance of output and portability',
    Icon: TentTree,
  },
  {
    id: 'backup',
    label: 'Home backup',
    title: 'Harvest more from every sunny day',
    copy: 'Pair higher-output panels with a larger power station to support longer backup time at home or work.',
    watts: '220W–400W',
    detail: 'Built for higher-demand charging',
    Icon: House,
  },
] as const

export function SolarSelectionGuide() {
  const [selected, setSelected] = useState(0)
  const active = useCases[selected]
  const ActiveIcon = active.Icon

  return (
    <section className="relative overflow-hidden bg-[#071638] py-12 sm:py-16">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{ background: 'radial-gradient(circle at 85% 0%, rgba(37,99,235,0.48), transparent 34%), radial-gradient(circle at 0% 100%, rgba(14,165,233,0.18), transparent 32%)' }}
      />
      <div className="relative mx-auto grid max-w-8xl gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">
            <Sun size={13} aria-hidden="true" />
            Find your fit
          </div>
          <h2 className="max-w-md font-display text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
            Start with how you want to use solar.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300 sm:text-base">
            Explore the panel range by your everyday need. Select a scenario to see a helpful starting point before you shop.
          </p>

          <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label="Solar use cases">
            {useCases.map((item, index) => {
              const Icon = item.Icon
              const isActive = selected === index
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelected(index)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                    isActive
                      ? 'border-white bg-white text-[#0b1b42] shadow-lg shadow-black/20'
                      : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/35 hover:bg-white/10'
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          className="rounded-3xl border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-black/10 backdrop-blur-sm sm:p-7"
        >
          <div className="flex items-start justify-between gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-300 text-[#061333] shadow-lg shadow-sky-400/20">
              <ActiveIcon size={24} aria-hidden="true" />
            </div>
            <div className="rounded-full border border-sky-200/20 bg-sky-300/10 px-3 py-1.5 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200">Suggested range</p>
              <p className="mt-0.5 text-sm font-black text-white">{active.watts}</p>
            </div>
          </div>
          <h3 className="mt-6 text-2xl font-bold tracking-[-0.03em] text-white">{active.title}</h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{active.copy}</p>
          <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5 text-sm font-semibold text-sky-100">
            <BriefcaseBusiness size={17} aria-hidden="true" />
            {active.detail}
          </div>
          <a
            href="#products"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white transition-transform hover:translate-y-0.5"
          >
            Browse solar panels
            <ArrowDown size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}
