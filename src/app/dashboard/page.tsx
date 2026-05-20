'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const USD_TO_PEN = 3.4

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data, error } = await supabase.from('reviews').select('*')
    if (!error) setData(data || [])
    setLoading(false)
  }

  const workersMap: any = {}

  data.forEach((item) => {
    const worker = item.worker_email?.split('@')[0] || 'unknown'
    const service = item.service_type || 'uñas'

    if (!workersMap[worker]) {
      workersMap[worker] = {
        name: worker,
        seguros: 0,
        unas: 0,
        generated: 0,
        paid: 0,
        profit: 0,
      }
    }

    if (service === 'seguros') workersMap[worker].seguros++
    if (service === 'uñas') workersMap[worker].unas++

    const incomeUSD = service === 'seguros' ? 10 : 5
    const incomePEN = incomeUSD * USD_TO_PEN

    workersMap[worker].generated += incomePEN

    let cost = 0
    if (worker === 'douglas') {
      cost = service === 'seguros' ? 5 : 6
    } else if (worker === 'samantha') {
      cost = 5
    } else if (worker === 'david') {
      cost = incomePEN
    }

    workersMap[worker].paid += cost
    workersMap[worker].profit =
      workersMap[worker].generated - workersMap[worker].paid
  })

  const workers = Object.values(workersMap)

  const totalGenerated = workers.reduce((a: number, w: any) => a + w.generated, 0)
  const totalPaid = workers.reduce((a: number, w: any) => a + w.paid, 0)
  const totalProfit = workers.reduce((a: number, w: any) => a + w.profit, 0)

  const penToUsd = (pen: number) => (pen / USD_TO_PEN).toFixed(2)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-slate-400 text-lg font-medium tracking-wide">
            Cargando dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 🤑 FLOATING EMOJI */}
      <div
        className="fixed top-6 right-8 z-50 select-none pointer-events-none"
        style={{
          fontSize: '3.5rem',
          animation: 'floatEmoji 3s ease-in-out infinite',
          filter: 'drop-shadow(0 0 16px rgba(52,211,153,0.5))',
        }}
      >
        🤑
      </div>

      {/* FLOAT KEYFRAMES */}
      <style>{`
        @keyframes floatEmoji {
          0%   { transform: translateY(0px) rotate(-5deg); }
          50%  { transform: translateY(-14px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(-5deg); }
        }
      `}</style>

      <main className="min-h-screen bg-[#0a0a0f] text-white p-6 md:p-10">

        {/* HEADER */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium tracking-widest uppercase">
              Live Dashboard
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            <span className="bg-gradient-to-br from-white via-emerald-200 to-emerald-500 bg-clip-text text-transparent">
              Easy Money
            </span>
          </h1>

          <p className="text-slate-500 mt-3 text-base">
            Panel financiero en tiempo real — Supabase
          </p>
        </div>

        {/* STATS */}
        <div className="grid gap-5 md:grid-cols-3 mb-12">

          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/20 p-7 rounded-2xl group hover:border-emerald-500/50 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-10 translate-x-10 group-hover:bg-emerald-500/10 transition-all duration-500" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-xl">
                💰
              </div>
              <p className="text-slate-400 font-medium">Total Generado</p>
            </div>
            <h2 className="text-4xl text-emerald-400 font-black tracking-tight">
              S/ {totalGenerated.toFixed(2)}
            </h2>
            <p className="text-slate-500 text-sm mt-1 font-mono">
              ≈ ${penToUsd(totalGenerated)} USD
            </p>
            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full w-full" />
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-red-500/20 p-7 rounded-2xl group hover:border-red-500/50 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -translate-y-10 translate-x-10 group-hover:bg-red-500/10 transition-all duration-500" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-xl">
                💸
              </div>
              <p className="text-slate-400 font-medium">Total Pagado</p>
            </div>
            <h2 className="text-4xl text-red-400 font-black tracking-tight">
              S/ {totalPaid.toFixed(2)}
            </h2>
            <p className="text-slate-500 text-sm mt-1 font-mono">
              ≈ ${penToUsd(totalPaid)} USD
            </p>
            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-700 to-red-400 rounded-full"
                style={{ width: `${(totalPaid / totalGenerated) * 100}%` }}
              />
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/20 p-7 rounded-2xl group hover:border-cyan-500/50 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full -translate-y-10 translate-x-10 group-hover:bg-cyan-500/10 transition-all duration-500" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-xl">
                📈
              </div>
              <p className="text-slate-400 font-medium">Ganancia Neta</p>
            </div>
            <h2 className="text-4xl text-cyan-400 font-black tracking-tight">
              S/ {totalProfit.toFixed(2)}
            </h2>
            <p className="text-slate-500 text-sm mt-1 font-mono">
              ≈ ${penToUsd(totalProfit)} USD
            </p>
            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-700 to-cyan-400 rounded-full"
                style={{
                  width: `${(totalProfit / totalGenerated) * 100}%`,
                }}
              />
            </div>
          </div>

        </div>

        {/* SECTION TITLE */}
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-slate-300 text-lg font-semibold tracking-wide uppercase">
            Workers
          </h2>
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-slate-600 text-sm">{workers.length} activos</span>
        </div>

        {/* WORKERS */}
        <div className="grid gap-5 md:grid-cols-3">
          {workers.map((worker: any) => (
            <div
              key={worker.name}
              className="bg-gradient-to-br from-slate-900 to-[#0d0d14] border border-slate-800 p-7 rounded-2xl hover:border-emerald-500/30 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-center text-lg font-black text-emerald-400 capitalize">
                  {worker.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold capitalize text-white tracking-tight">
                    {worker.name}
                  </h2>
                  <p className="text-slate-600 text-xs">
                    {worker.seguros + worker.unas} servicios totales
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-slate-500 text-xs mb-1">Seguros</p>
                  <p className="text-white font-black text-2xl">{worker.seguros}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-slate-500 text-xs mb-1">Uñas</p>
                  <p className="text-white font-black text-2xl">{worker.unas}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <span className="text-slate-400 text-sm">Generado</span>
                  <div className="text-right">
                    <p className="text-emerald-400 font-bold text-sm">
                      S/ {worker.generated.toFixed(2)}
                    </p>
                    <p className="text-slate-600 text-xs font-mono">
                      ${penToUsd(worker.generated)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <span className="text-slate-400 text-sm">Pagado</span>
                  <div className="text-right">
                    <p className="text-red-400 font-bold text-sm">
                      S/ {worker.paid.toFixed(2)}
                    </p>
                    <p className="text-slate-600 text-xs font-mono">
                      ${penToUsd(worker.paid)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                  <span className="text-cyan-300 text-sm font-semibold">Ganancia</span>
                  <div className="text-right">
                    <p className="text-cyan-400 font-black text-base">
                      S/ {worker.profit.toFixed(2)}
                    </p>
                    <p className="text-slate-500 text-xs font-mono">
                      ${penToUsd(worker.profit)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                  <span>Margen</span>
                  <span>
                    {worker.generated > 0
                      ? ((worker.profit / worker.generated) * 100).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 to-emerald-400 rounded-full transition-all duration-700"
                    style={{
                      width: `${
                        worker.generated > 0
                          ? Math.max(0, (worker.profit / worker.generated) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="mt-12 text-center text-slate-700 text-xs">
          1 USD = S/ {USD_TO_PEN} PEN · Datos en tiempo real
        </div>

      </main>
    </>
  )
}