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
  const [showAddReviewModal, setShowAddReviewModal] = useState(false)
  const [copiedButton, setCopiedButton] = useState<string | null>(null)
  const [newWorkerForm, setNewWorkerForm] = useState({
    name: '',
    email: '',
    password: '',
    pago_unas: '',
    pago_seguros: '',
    image_url: ''
  })
  const [newReviewForm, setNewReviewForm] = useState({
    worker_email: '',
    service_type: 'unas',
    client_name: ''
  })

  const USD_TO_PEN = 3.4

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: reviewsData } = await supabase.from('reviews').select('*')
    const { data: workersData } = await supabase.from('workers').select('*')
    setData(reviewsData || [])
    setWorkers(workersData || [])
    setLoading(false)
  }

  // ---- CÁLCULO DE ESTADÍSTICAS ----
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

  // ---- AÑADIR RESEÑA MANUAL ----
  async function handleAddReview() {
    if (!newReviewForm.client_name || !newReviewForm.worker_email) {
      setMessage('⚠️ Completa todos los campos')
      setMessageType('warning')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('reviews').insert([{
      client_name: newReviewForm.client_name,
      worker_email: newReviewForm.worker_email.toLowerCase(),
      service_type: newReviewForm.service_type,
      review_text: '',
      rating: 5
    }])
    if (!error) {
      setMessage(`✅ ${newReviewForm.service_type === 'unas' ? 'Uñas' : 'Seguro'} añadido correctamente`)
      setMessageType('success')
      setNewReviewForm({ worker_email: '', service_type: 'unas', client_name: '' })
      setShowAddReviewModal(false)
      await fetchData()
    } else {
      setMessage('❌ Error al añadir reseña')
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
    setLoading(false)
  }

  // ---- ELIMINAR RESEÑA INDIVIDUAL ----
  async function handleDeleteReview(reviewId: string) {
    if (!confirm('¿Eliminar esta reseña permanentemente?')) return
    setLoading(true)
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
    if (!error) {
      setMessage('✅ Reseña eliminada')
      setMessageType('success')
      await fetchData()
    } else {
      setMessage('❌ Error al eliminar')
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
    setLoading(false)
  }

  // ---- CREAR WORKER (con usuario en Auth) ----
  async function handleNewWorker() {
    if (!newWorkerForm.name || !newWorkerForm.email || !newWorkerForm.password || !newWorkerForm.pago_unas || !newWorkerForm.pago_seguros) {
      setMessage('⚠️ Completa todos los campos (nombre, email, contraseña y pagos)')
      setMessageType('warning')
      return
    }

    setLoading(true)

    // 1. Crear usuario en Supabase Auth mediante API route
    try {
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newWorkerForm.email.toLowerCase(),
          password: newWorkerForm.password,
          name: newWorkerForm.name
        })
      })
      const authResult = await res.json()
      if (!res.ok) {
        throw new Error(authResult.error || 'Error al crear usuario')
      }
    } catch (err: any) {
      setMessage(`❌ Error al crear usuario: ${err.message}`)
      setMessageType('error')
      setLoading(false)
      return
    }

    // 2. Insertar en tabla workers
    const { error } = await supabase.from('workers').insert([{
      name: newWorkerForm.name,
      email: newWorkerForm.email.toLowerCase(),
      pago_unas: parseFloat(newWorkerForm.pago_unas),
      pago_seguros: parseFloat(newWorkerForm.pago_seguros),
      image_url: newWorkerForm.image_url || null
    }])

    if (!error) {
      setMessage('✅ Worker y usuario creados correctamente')
      setMessageType('success')
      setNewWorkerForm({ name: '', email: '', password: '', pago_unas: '', pago_seguros: '', image_url: '' })
      setShowNewWorkerModal(false)
      await fetchData()
    } else {
      setMessage(`❌ Error al agregar worker: ${error.message}`)
      setMessageType('error')
    }

    setTimeout(() => setMessage(''), 3000)
    setLoading(false)
  }

  // ---- RESET SEMANAL ----
  async function handleConfirmReset() {
    setLoading(true)
    // Verificar sesión activa
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setMessage('🔒 No hay sesión activa. Vuelve a iniciar sesión.')
      setMessageType('warning')
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    // Eliminar todas las reviews (sin condiciones)
    const { error } = await supabase.from('reviews').delete()

    if (error) {
      console.error('Error al eliminar:', error)
      setMessage(`❌ Error: ${error.message}`)
      setMessageType('error')
    } else {
      setMessage('✅ Todas las reseñas eliminadas correctamente')
      setMessageType('success')
      setShowResetModal(false)
      await fetchData()
    }
    setTimeout(() => setMessage(''), 3000)
    setLoading(false)
  }

  // ---- COPIAR ----
  async function copyToClipboard(text: string, buttonId: string) {
    await navigator.clipboard.writeText(text)
    setCopiedButton(buttonId)
    setMessage('📋 Copiado al portapapeles')
    setMessageType('success')
    setTimeout(() => setMessage(''), 2000)
    setTimeout(() => setCopiedButton(null), 1500)
  }

  const formatListForCopy = (reviewList: any[]) => {
    return reviewList.map((r, idx) => `${idx + 1}. ${r.client_name}`).join('\n')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-slate-400 text-lg font-medium tracking-wide">Cargando dashboard...</p>
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
      {/* FLOATING EMOJI */}
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
            <span className="text-emerald-400 text-sm font-medium tracking-widest uppercase">Live Dashboard</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            <span className="bg-gradient-to-br from-white via-emerald-200 to-emerald-500 bg-clip-text text-transparent">
              Easy Money
            </span>
          </h1>
          <p className="text-slate-500 mt-3 text-base">Panel financiero en tiempo real — Supabase</p>
        </div>

        {/* ========== STATS CARDS ========== */}
        <div className="grid gap-5 md:grid-cols-3 mb-12">

          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/20 p-7 rounded-2xl group hover:border-emerald-500/50 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-10 translate-x-10 group-hover:bg-emerald-500/10 transition-all duration-500" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-xl">💰</div>
              <p className="text-slate-400 font-medium">Total Generado</p>
            </div>
            <h2 className="text-4xl text-emerald-400 font-black tracking-tight">S/ {totalGenerated.toFixed(2)}</h2>
            <p className="text-slate-500 text-sm mt-1 font-mono">≈ ${penToUsd(totalGenerated)} USD</p>
            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full w-full" />
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-red-500/20 p-7 rounded-2xl group hover:border-red-500/50 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -translate-y-10 translate-x-10 group-hover:bg-red-500/10 transition-all duration-500" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-xl">💸</div>
              <p className="text-slate-400 font-medium">Total Pagado</p>
            </div>
            <h2 className="text-4xl text-red-400 font-black tracking-tight">S/ {totalPaid.toFixed(2)}</h2>
            <p className="text-slate-500 text-sm mt-1 font-mono">≈ ${penToUsd(totalPaid)} USD</p>
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
              <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-xl">📈</div>
              <p className="text-slate-400 font-medium">Ganancia Neta</p>
            </div>
            <h2 className="text-4xl text-cyan-400 font-black tracking-tight">S/ {totalProfit.toFixed(2)}</h2>
            <p className="text-slate-500 text-sm mt-1 font-mono">≈ ${penToUsd(totalProfit)} USD</p>
            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-700 to-cyan-400 rounded-full"
                style={{ width: `${totalGenerated > 0 ? (totalProfit / totalGenerated) * 100 : 0}%` }}
              />
            </div>
          </div>

        </div>

        {/* ========== SECTION SERVICIOS ========== */}
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-slate-300 text-lg font-semibold tracking-wide uppercase">Servicios</h2>
          <div className="flex-1 h-px bg-slate-800" />
          <button
            onClick={() => setShowAddReviewModal(true)}
            className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-all duration-300"
          >
            ✚ Añadir manual
          </button>
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
                <span className="text-base font-semibold text-slate-500">({unasReviews.length})</span>
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
            <div className="relative z-10 space-y-2">
              {unasReviews.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay registros aún</p>
              ) : (
                unasReviews.map((review, idx) => {
                  const workerData = workers.find(w => w.email?.toLowerCase() === review.worker_email?.toLowerCase())
                  const workerName = workerData?.name || review.worker_email?.split('@')[0] || 'unknown'
                  return (
                    <div
                      key={review.id}
                      className="flex items-center justify-between bg-black border border-slate-800 rounded-xl px-5 py-3 hover:border-emerald-500/40 transition group"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500 font-mono text-sm w-8">{idx + 1}.</span>
                        <span className="font-medium tracking-wide text-white">{review.client_name}</span>
                        <span className="text-slate-600 text-xs">({workerName})</span>
                      </div>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-slate-700 hover:text-red-400 transition opacity-0 group-hover:opacity-100 text-lg"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                })
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
                <span className="text-base font-semibold text-slate-500">({segurosReviews.length})</span>
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
            <div className="relative z-10 space-y-2">
              {segurosReviews.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay registros aún</p>
              ) : (
                segurosReviews.map((review, idx) => {
                  const workerData = workers.find(w => w.email?.toLowerCase() === review.worker_email?.toLowerCase())
                  const workerName = workerData?.name || review.worker_email?.split('@')[0] || 'unknown'
                  return (
                    <div
                      key={review.id}
                      className="flex items-center justify-between bg-black border border-slate-800 rounded-xl px-5 py-3 hover:border-emerald-500/40 transition group"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500 font-mono text-sm w-8">{idx + 1}.</span>
                        <span className="font-medium tracking-wide text-white">{review.client_name}</span>
                        <span className="text-slate-600 text-xs">({workerName})</span>
                      </div>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-slate-700 hover:text-red-400 transition opacity-0 group-hover:opacity-100 text-lg"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>

        {/* ========== SECTION WORKERS ========== */}
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-slate-300 text-lg font-semibold tracking-wide uppercase">Workers</h2>
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-slate-600 text-sm">{workersArray.length} activos</span>
        </div>

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
                  <h2 className="text-xl font-bold capitalize text-white tracking-tight">{worker.name}</h2>
                  <p className="text-slate-600 text-xs">{worker.seguros + worker.unas} servicios totales</p>
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
                    <p className="text-emerald-400 font-bold text-sm">S/ {worker.generated.toFixed(2)}</p>
                    <p className="text-slate-600 text-xs font-mono">${penToUsd(worker.generated)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <span className="text-slate-400 text-sm">Pagado</span>
                  <div className="text-right">
                    <p className="text-red-400 font-bold text-sm">S/ {worker.paid.toFixed(2)}</p>
                    <p className="text-slate-600 text-xs font-mono">${penToUsd(worker.paid)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                  <span className="text-cyan-300 text-sm font-semibold">Ganancia</span>
                  <div className="text-right">
                    <p className="text-cyan-400 font-black text-base">S/ {worker.profit.toFixed(2)}</p>
                    <p className="text-slate-500 text-xs font-mono">${penToUsd(worker.profit)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                  <span>Margen</span>
                  <span>{worker.generated > 0 ? ((worker.profit / worker.generated) * 100).toFixed(0) : 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 to-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${worker.generated > 0 ? Math.max(0, (worker.profit / worker.generated) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ========== BOTONES ========== */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <button
            onClick={() => setShowResetModal(true)}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-bold text-base hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            🗑️ Reset Semanal
          </button>
          <button
            onClick={() => setShowNewWorkerModal(true)}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-base hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wide"
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

        {/* ========== MODAL: AÑADIR RESEÑA MANUAL ========== */}
        {showAddReviewModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 to-[#0d0d14] border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-2xl font-black mb-6 text-white flex items-center gap-2">
                <span>✚</span><span>Añadir cliente manual</span>
              </h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Nombre del cliente</label>
                  <input
                    type="text"
                    placeholder="Ej: María García"
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-emerald-500 outline-none transition"
                    value={newReviewForm.client_name}
                    onChange={e => setNewReviewForm({ ...newReviewForm, client_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Trabajador</label>
                  <select
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition"
                    value={newReviewForm.worker_email}
                    onChange={e => setNewReviewForm({ ...newReviewForm, worker_email: e.target.value })}
                  >
                    <option value="">Seleccionar trabajador</option>
                    {workers.map(w => (
                      <option key={w.email} value={w.email}>{w.name} ({w.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Tipo de servicio</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewReviewForm({ ...newReviewForm, service_type: 'unas' })}
                      className={`py-3 rounded-xl font-bold border transition-all ${newReviewForm.service_type === 'unas' ? 'bg-pink-500/20 border-pink-500/50 text-pink-300' : 'bg-black border-slate-800 text-slate-500 hover:border-slate-600'}`}
                    >
                      💅 Uñas
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewReviewForm({ ...newReviewForm, service_type: 'seguros' })}
                      className={`py-3 rounded-xl font-bold border transition-all ${newReviewForm.service_type === 'seguros' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-black border-slate-800 text-slate-500 hover:border-slate-600'}`}
                    >
                      🛡️ Seguros
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddReviewModal(false)} className="flex-1 px-4 py-3 border border-slate-700 rounded-xl text-slate-400 font-semibold hover:border-slate-600 hover:bg-slate-800/50 transition">Cancelar</button>
                <button onClick={handleAddReview} disabled={loading} className="flex-1 px-4 py-3 bg-emerald-500 rounded-xl text-black font-bold hover:bg-emerald-400 transition disabled:opacity-50">{loading ? '⏳ Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ========== MODAL: NUEVO WORKER ========== */}
        {showNewWorkerModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 to-[#0d0d14] border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-black mb-6 text-white flex items-center gap-2">
                <span>➕</span><span>Nuevo Worker</span>
              </h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Nombre</label>
                  <input
                    type="text"
                    placeholder="Ej: Juan"
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-emerald-500 outline-none transition"
                    value={newWorkerForm.name}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="juan@easymoney.com"
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-emerald-500 outline-none transition"
                    value={newWorkerForm.email}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Contraseña</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-emerald-500 outline-none transition"
                    value={newWorkerForm.password}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Pago por Uñas (soles)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 5"
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-emerald-500 outline-none transition"
                    value={newWorkerForm.pago_unas}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, pago_unas: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">Pago por Seguros (soles)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 5"
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-emerald-500 outline-none transition"
                    value={newWorkerForm.pago_seguros}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, pago_seguros: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">
                    URL de imagen <span className="text-slate-600 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://i.postimg.cc/..."
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-emerald-500 outline-none transition"
                    value={newWorkerForm.image_url}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, image_url: e.target.value })}
                  />
                  {newWorkerForm.image_url && (
                    <div className="mt-3 flex justify-center">
                      <img
                        src={newWorkerForm.image_url}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-xl border border-emerald-500/30"
                        onError={(e: any) => { e.target.style.display = 'none' }}
                      />
                    </div>
                  )}
                  <p className="text-slate-600 text-xs mt-2">Sube tu imagen a postimg.cc y pega el enlace directo aquí</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNewWorkerModal(false)} className="flex-1 px-4 py-3 border border-slate-700 rounded-xl text-slate-400 font-semibold hover:border-slate-600 hover:bg-slate-800/50 transition">Cancelar</button>
                <button onClick={handleNewWorker} disabled={loading} className="flex-1 px-4 py-3 bg-emerald-500 rounded-xl text-black font-bold hover:bg-emerald-400 transition disabled:opacity-50">{loading ? '⏳ Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ========== MODAL: RESET SEMANAL ========== */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-red-950 to-slate-950 border border-red-500/30 rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 mx-auto mb-5">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-black mb-2 text-white text-center">¿Eliminar TODO?</h3>
              <p className="text-slate-300 text-center mb-6 leading-relaxed">
                Esta acción <span className="font-bold text-red-400">NO SE PUEDE DESHACER</span>. Se eliminarán TODAS las reviews de la semana.
              </p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <p className="text-red-400 text-sm font-semibold text-center">
                  🗑️ Se eliminarán {data.length} registros
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowResetModal(false)} disabled={loading} className="flex-1 px-4 py-3 border border-slate-700 rounded-xl text-slate-400 font-semibold hover:border-slate-600 hover:bg-slate-800/50 transition">Cancelar</button>
                <button onClick={handleConfirmReset} disabled={loading} className="flex-1 px-4 py-3 bg-red-500 rounded-xl text-white font-bold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? '⏳ Eliminando...' : '🗑️ Eliminar todo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-12 text-center text-slate-700 text-xs">
          1 USD = S/ {USD_TO_PEN} PEN · Datos en tiempo real
        </div>

      </main>
    </>
  )
}