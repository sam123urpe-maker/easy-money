'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [data, setData] = useState<any[]>([])
  const [workers, setWorkers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success')
  const [showNewWorkerModal, setShowNewWorkerModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [copiedButton, setCopiedButton] = useState<string | null>(null)
  const [newWorkerForm, setNewWorkerForm] = useState({
    name: '',
    email: '',
    pago_unas: '',
    pago_seguros: ''
  })

  const USD_TO_PEN = 3.4

  useEffect(() => {
    fetchData()
  }, [])

  // 👇 FUNCIÓN ACTUALIZADA CON CONSOLE.LOG
  async function fetchData() {
    const { data: reviewsData, error: rErr } = await supabase.from('reviews').select('*')
    const { data: workersData, error: wErr } = await supabase.from('workers').select('*')
    
    // 🔍 LOGS PARA DEBUGUEAR
    console.log('===== DEBUG FETCH =====')
    console.log('WORKERS DATA:', workersData)
    console.log('WORKERS ERROR:', wErr)
    console.log('REVIEWS DATA sample:', reviewsData?.[0])
    console.log('REVIEWS email example:', reviewsData?.[0]?.worker_email)
    console.log('=====================')
    
    setData(reviewsData || [])
    setWorkers(workersData || [])
    setLoading(false)
  }

  const workersMap: any = {}

  data.forEach((item) => {
    const workerEmail = item.worker_email?.toLowerCase()
    if (!workerEmail) return

    const workerSlug = workerEmail.split('@')[0]
    const workerData = workers.find(w => w.email?.toLowerCase() === workerEmail)

    const workerName = workerData?.name || workerSlug

    if (!workersMap[workerSlug]) {
      workersMap[workerSlug] = {
        name: workerName,
        email: workerEmail,
        seguros: 0,
        unas: 0,
        generated: 0,
        paid: 0,
        profit: 0,
      }
    }

    const service = item.service_type

    if (service === 'seguros') workersMap[workerSlug].seguros++
    if (service === 'unas') workersMap[workerSlug].unas++

    const incomePEN = service === 'seguros' ? 10 * USD_TO_PEN : 5 * USD_TO_PEN
    workersMap[workerSlug].generated += incomePEN

    let costPEN = 5
    if (workerData) {
      const pagoUnas = Number(workerData.pago_unas)
      const pagoSeguros = Number(workerData.pago_seguros)
      const costUnas = isNaN(pagoUnas) ? 5 : pagoUnas
      const costSeguros = isNaN(pagoSeguros) ? 5 : pagoSeguros
      costPEN = service === 'seguros' ? costSeguros : costUnas
    } else {
      costPEN = 5
    }

    workersMap[workerSlug].paid += costPEN
    workersMap[workerSlug].profit = workersMap[workerSlug].generated - workersMap[workerSlug].paid
  })

  const workersArray = Object.values(workersMap)

  const totalGenerated = workersArray.reduce((a: number, w: any) => a + w.generated, 0)
  const totalPaid = workersArray.reduce((a: number, w: any) => a + w.paid, 0)
  const totalProfit = workersArray.reduce((a: number, w: any) => a + w.profit, 0)

  const unasReviews = data
    .filter(r => r.service_type === 'unas')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const segurosReviews = data
    .filter(r => r.service_type === 'seguros')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const penToUsd = (pen: number) => (pen / USD_TO_PEN).toFixed(2)

  async function handleConfirmReset() {
    setLoading(true)
    const { error } = await supabase.from('reviews').delete().neq('id', '')

    if (!error) {
      setMessage('✅ Reviews eliminadas correctamente')
      setMessageType('success')
      setShowResetModal(false)
      await fetchData()
    } else {
      setMessage('❌ Error al eliminar reviews')
      setMessageType('error')
    }

    setTimeout(() => setMessage(''), 3000)
    setLoading(false)
  }

  async function handleNewWorker() {
    if (!newWorkerForm.name || !newWorkerForm.email || !newWorkerForm.pago_unas || !newWorkerForm.pago_seguros) {
      setMessage('⚠️ Completa todos los campos')
      setMessageType('warning')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('workers').insert([{
      name: newWorkerForm.name,
      email: newWorkerForm.email.toLowerCase(),
      pago_unas: parseInt(newWorkerForm.pago_unas),
      pago_seguros: parseInt(newWorkerForm.pago_seguros)
    }])

    if (!error) {
      setMessage('✅ Worker agregado correctamente')
      setMessageType('success')
      setNewWorkerForm({ name: '', email: '', pago_unas: '', pago_seguros: '' })
      setShowNewWorkerModal(false)
      await fetchData()
    } else {
      setMessage('❌ Error al agregar worker')
      setMessageType('error')
    }

    setTimeout(() => setMessage(''), 3000)
    setLoading(false)
  }

  async function copyToClipboard(text: string, buttonId: string) {
    await navigator.clipboard.writeText(text)
    setCopiedButton(buttonId)
    setMessage('📋 Copiado al portapapeles')
    setMessageType('success')
    setTimeout(() => setMessage(''), 2000)
    setTimeout(() => setCopiedButton(null), 1500)
  }

  const formatListForCopy = (reviewList: any[]) => {
    return reviewList
      .map((r, idx) => `${idx + 1}. ${r.client_name}`)
      .join('\n')
  }

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

  const messageStyles = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
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
                style={{ width: `${totalGenerated > 0 ? (totalPaid / totalGenerated) * 100 : 0}%` }}
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
                  width: `${totalGenerated > 0 ? (totalProfit / totalGenerated) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

        </div>

        {/* SECTION TITLE - SERVICES */}
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-slate-300 text-lg font-semibold tracking-wide uppercase">
            Servicios
          </h2>
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-slate-600 text-sm">{unasReviews.length + segurosReviews.length} registros</span>
        </div>

        {/* SERVICES GRID */}
        <div className="grid gap-8 md:grid-cols-2 mb-12">

          {/* UÑAS CARD */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-[#0d0d14] border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/5 rounded-full -translate-y-10 translate-x-10" />

            <div className="relative z-10 flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black tracking-tight flex items-center gap-3">
                <span className="text-4xl">💅</span>
                <span>Uñas</span>
              </h3>
              <button
                onClick={() => copyToClipboard(formatListForCopy(unasReviews), 'unas')}
                className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-all duration-300 ${
                  copiedButton === 'unas'
                    ? 'bg-emerald-500/30 border-emerald-500/50 text-emerald-300 scale-105'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50'
                }`}
              >
                {copiedButton === 'unas' ? '✅ ¡Copiado!' : '📋 Copiar'}
              </button>
            </div>

            <div className="relative z-10">
              {unasReviews.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay registros aún</p>
              ) : (
                <div className="space-y-2">
                  {unasReviews.map((review, idx) => {
                    const workerEmail = review.worker_email?.toLowerCase()
                    const workerData = workers.find(w => w.email?.toLowerCase() === workerEmail)
                    const workerName = workerData?.name || workerEmail?.split('@')[0] || 'unknown'
                    return (
                      <div
                        key={review.id}
                        className="flex items-center justify-between bg-black border border-slate-800 rounded-xl px-5 py-3 hover:border-emerald-500/40 transition"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-slate-500 font-mono text-sm w-8">{idx + 1}.</span>
                          <span className="font-medium tracking-wide text-white">{review.client_name}</span>
                        </div>
                        <span className="text-slate-600 text-xs tracking-widest">
                          ({workerName})
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SEGUROS CARD */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-[#0d0d14] border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full -translate-y-10 translate-x-10" />

            <div className="relative z-10 flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black tracking-tight flex items-center gap-3">
                <span className="text-4xl">🛡️</span>
                <span>Seguros</span>
              </h3>
              <button
                onClick={() => copyToClipboard(formatListForCopy(segurosReviews), 'seguros')}
                className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-all duration-300 ${
                  copiedButton === 'seguros'
                    ? 'bg-emerald-500/30 border-emerald-500/50 text-emerald-300 scale-105'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50'
                }`}
              >
                {copiedButton === 'seguros' ? '✅ ¡Copiado!' : '📋 Copiar'}
              </button>
            </div>

            <div className="relative z-10">
              {segurosReviews.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay registros aún</p>
              ) : (
                <div className="space-y-2">
                  {segurosReviews.map((review, idx) => {
                    const workerEmail = review.worker_email?.toLowerCase()
                    const workerData = workers.find(w => w.email?.toLowerCase() === workerEmail)
                    const workerName = workerData?.name || workerEmail?.split('@')[0] || 'unknown'
                    return (
                      <div
                        key={review.id}
                        className="flex items-center justify-between bg-black border border-slate-800 rounded-xl px-5 py-3 hover:border-emerald-500/40 transition"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-slate-500 font-mono text-sm w-8">{idx + 1}.</span>
                          <span className="font-medium tracking-wide text-white">{review.client_name}</span>
                        </div>
                        <span className="text-slate-600 text-xs tracking-widest">
                          ({workerName})
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* SECTION TITLE - WORKERS */}
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-slate-300 text-lg font-semibold tracking-wide uppercase">
            Workers
          </h2>
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-slate-600 text-sm">{workersArray.length} activos</span>
        </div>

        {/* WORKERS GRID */}
        <div className="grid gap-5 md:grid-cols-3 mb-12">
          {workersArray.map((worker: any) => (
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

        {/* BUTTONS SECTION */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <button
            onClick={() => setShowResetModal(true)}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-bold text-base hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            🗑️ Reset Semanal
          </button>

          <button
            onClick={() => setShowNewWorkerModal(true)}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-base hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            ➕ Añadir Worker
          </button>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className={`mb-8 rounded-xl border px-6 py-4 text-center text-sm ${messageStyles[messageType]}`}>
            {message}
          </div>
        )}

        {/* NEW WORKER MODAL */}
        {showNewWorkerModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 to-[#0d0d14] border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-2xl font-black mb-6 text-white flex items-center gap-2">
                <span>➕</span>
                <span>Nuevo Worker</span>
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Nombre</label>
                  <input
                    type="text"
                    placeholder="Ej: Carlos"
                    value={newWorkerForm.name}
                    onChange={(e) => setNewWorkerForm({...newWorkerForm, name: e.target.value})}
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-emerald-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="ej: carlos@easymoney.com"
                    value={newWorkerForm.email}
                    onChange={(e) => setNewWorkerForm({...newWorkerForm, email: e.target.value})}
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-emerald-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Pago Uñas (soles)</label>
                  <input
                    type="number"
                    placeholder="Ej: 5"
                    value={newWorkerForm.pago_unas}
                    onChange={(e) => setNewWorkerForm({...newWorkerForm, pago_unas: e.target.value})}
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-emerald-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Pago Seguros (soles)</label>
                  <input
                    type="number"
                    placeholder="Ej: 5"
                    value={newWorkerForm.pago_seguros}
                    onChange={(e) => setNewWorkerForm({...newWorkerForm, pago_seguros: e.target.value})}
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-emerald-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewWorkerModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-700 rounded-xl text-slate-400 font-semibold hover:border-slate-600 hover:bg-slate-800/50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleNewWorker}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-emerald-500 rounded-xl text-black font-bold hover:bg-emerald-400 transition disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-12 text-center text-slate-700 text-xs">
          1 USD = S/ {USD_TO_PEN} PEN · Datos en tiempo real
        </div>

        {/* RESET MODAL */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 to-[#0d0d14] border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-2xl font-black mb-4 text-white">⚠️ Reset Semanal</h3>
              <p className="text-slate-300 mb-6">
                ¿Estás seguro de que quieres eliminar todas las reseñas? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-700 rounded-xl text-slate-400 font-semibold hover:border-slate-600 hover:bg-slate-800/50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmReset}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-red-500 rounded-xl text-white font-bold hover:bg-red-400 transition disabled:opacity-50"
                >
                  Eliminar todo
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  )
}