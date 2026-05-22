'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function WorkerPage() {
  const [user, setUser] = useState<any>(null)
  const [workers, setWorkers] = useState<any[]>([])
  const [unasText, setUnasText] = useState('')
  const [segurosText, setSegurosText] = useState('')
  const [unasReviews, setUnasReviews] = useState<any[]>([])
  const [segurosReviews, setSegurosReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success')
  const [isSystemClosed, setIsSystemClosed] = useState(false)
  const [timeUntilOpen, setTimeUntilOpen] = useState<{hours: number; minutes: number; seconds: number} | null>(null)

  const isDouglas = user?.email?.toLowerCase() === 'douglas@easymoney.com'
  const isJoaquin = user?.email?.toLowerCase() === 'joaquin@easymoney.com'
  const USD_TO_PEN = 3.4

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    const checkSystemStatus = () => {
      const now = new Date()
      const day = now.getDay()
      const hours = now.getHours()
      const minutes = now.getMinutes()

      const isOpen = (day === 3 && hours >= 15) || (day === 4) || (day === 5 && hours < 8)

      setIsSystemClosed(!isOpen)

      if (!isOpen) {
        let targetDate = new Date()

        if (day < 3 || (day === 3 && hours < 15)) {
          targetDate.setDate(targetDate.getDate() + (3 - day))
          targetDate.setHours(15, 0, 0, 0)
        } else if (day === 3 && hours >= 15) {
          targetDate.setDate(targetDate.getDate() + 7)
          targetDate.setHours(15, 0, 0, 0)
        } else if (day === 4 && hours >= 21) {
          targetDate.setDate(targetDate.getDate() + 6)
          targetDate.setHours(15, 0, 0, 0)
        } else {
          targetDate.setDate(targetDate.getDate() + ((3 - day + 7) % 7))
          targetDate.setHours(15, 0, 0, 0)
        }

        const diff = targetDate.getTime() - now.getTime()
        const h = Math.floor(diff / (1000 * 60 * 60))
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const s = Math.floor((diff % (1000 * 60)) / 1000)

        setTimeUntilOpen({ hours: h, minutes: m, seconds: s })
      }
    }

    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, 1000)

    return () => clearInterval(interval)
  }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    setUser(user)

    if (!user.email) return

    const { data: workersData } = await supabase.from('workers').select('*')
    setWorkers(workersData || [])

    await loadReviews(user.email)
  }

  async function loadReviews(email: string) {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('worker_email', email.toLowerCase())
      .order('created_at', { ascending: true })

    if (data) {
      const unas = data
        .filter(r => r.service_type === 'unas')
        .sort((a, b) => {
          const aTime = new Date(a.created_at).getTime()
          const bTime = new Date(b.created_at).getTime()
          return aTime - bTime
        })
      const seguros = data
        .filter(r => r.service_type === 'seguros')
        .sort((a, b) => {
          const aTime = new Date(a.created_at).getTime()
          const bTime = new Date(b.created_at).getTime()
          return aTime - bTime
        })
      setUnasReviews(unas)
      setSegurosReviews(seguros)
    }
  }

  async function handleAdd() {
    if (!user || !user.email) return

    if (isSystemClosed) {
      setMessage('🔒 El sistema está cerrado. No puedes añadir clientes en este horario.')
      setMessageType('warning')
      return
    }

    setLoading(true)
    setMessage('')

    const unas = unasText
      .split('\n')
      .map(n => n.trim())
      .filter(n => n !== '')

    const seguros = segurosText
      .split('\n')
      .map(n => n.trim())
      .filter(n => n !== '')

    const inserts = [
      ...unas.map(name => ({
        client_name: name,
        worker_email: user.email.toLowerCase(),
        service_type: 'unas',
        review_text: '',
        rating: 5
      })),
      ...seguros.map(name => ({
        client_name: name,
        worker_email: user.email.toLowerCase(),
        service_type: 'seguros',
        review_text: '',
        rating: 5
      }))
    ]

    if (inserts.length === 0) {
      setLoading(false)
      setMessage('⚠️ No hay datos para añadir')
      setMessageType('warning')
      return
    }

    const { error } = await supabase
      .from('reviews')
      .insert(inserts)

    if (error) {
      setMessage('❌ Error al guardar')
      setMessageType('error')
      setLoading(false)
      return
    }

    setUnasText('')
    setSegurosText('')
    setMessage('✅ Datos guardados correctamente')
    setMessageType('success')

    await loadReviews(user.email)
    setLoading(false)

    setTimeout(() => setMessage(''), 3000)
  }

  const unasCount = unasText.split('\n').filter(n => n.trim() !== '').length
  const segurosCount = segurosText.split('\n').filter(n => n.trim() !== '').length

  const currentWorker = workers.find(w => w.email?.toLowerCase() === user?.email?.toLowerCase())

  const totalUnasEarned = unasReviews.length * (currentWorker?.pago_unas || 5)
  const totalSegurosEarned = segurosReviews.length * (currentWorker?.pago_seguros || 5)

  const messageStyles = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white px-6 py-16 flex justify-center relative overflow-hidden">

      {/* KEYFRAMES PARA EL EFECTO FLOTANTE */}
      <style>{`
        @keyframes floatEmoji {
          0%   { transform: translateY(0px) rotate(-5deg); }
          50%  { transform: translateY(-18px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(-5deg); }
        }
      `}</style>

      <div className="w-full max-w-7xl">

        {/* HEADER - TÍTULO CENTRADO */}
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-7xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-white via-emerald-300 to-emerald-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              Easy Money
            </span>
          </h1>
          {user && (
            <p className="mt-4 text-slate-500 text-sm tracking-widest uppercase">
              {user.email}
            </p>
          )}
        </div>

        {/* ZONA DE LA IMAGEN (STICKY) - justo después del título, antes de los cuadros */}
        <div className="sticky top-0 z-20 flex justify-center mb-12">
          {isDouglas && (
            <div
              className="relative"
              style={{
                animation: 'floatEmoji 3.5s ease-in-out infinite',
              }}
            >
              <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full w-[550px] h-[550px]" />
              <img
                src="https://i.postimg.cc/cCFwBFKQ/4d8180fd-fd29-4e5b-babe-28459bf9cb68.png"
                alt="Douglas"
                className="relative w-[520px] object-contain drop-shadow-[0_0_80px_rgba(16,185,129,0.4)]"
              />
            </div>
          )}
          {isJoaquin && (
            <div
              className="relative"
              style={{
                animation: 'floatEmoji 3.5s ease-in-out infinite',
              }}
            >
              <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full w-[550px] h-[550px]" />
              <img
                src="https://i.postimg.cc/6ph8D0Kg/4e1775c7-7f98-4d9e-8cd6-11c1110d4eaa.png"
                alt="Joaquin"
                className="relative w-[520px] object-contain drop-shadow-[0_0_80px_rgba(16,185,129,0.4)]"
              />
            </div>
          )}
        </div>

        {/* CLOSED SYSTEM MESSAGE */}
        {isSystemClosed && (
          <div className="mb-12 relative overflow-hidden bg-gradient-to-br from-red-950 to-slate-950 border border-red-500/30 p-8 rounded-2xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-full -translate-y-10 translate-x-10" />
            <div className="relative z-10 text-center">
              <p className="text-2xl font-black mb-4">🔒 El sistema está cerrado</p>
              <p className="text-slate-300 mb-8 text-base">
                Puedes añadir clientes SOLO los <span className="font-bold text-emerald-400">miércoles de 3:00 PM a jueves 9:00 PM</span>
              </p>
              {timeUntilOpen && (
                <div className="flex justify-center gap-4 md:gap-6">
                  <div className="bg-black border border-red-500/20 rounded-2xl px-6 py-5 min-w-24">
                    <p className="text-4xl font-black text-red-400">{String(timeUntilOpen.hours).padStart(2, '0')}</p>
                    <p className="text-xs text-slate-500 mt-2 font-semibold uppercase">Horas</p>
                  </div>
                  <div className="bg-black border border-red-500/20 rounded-2xl px-6 py-5 min-w-24">
                    <p className="text-4xl font-black text-red-400">{String(timeUntilOpen.minutes).padStart(2, '0')}</p>
                    <p className="text-xs text-slate-500 mt-2 font-semibold uppercase">Minutos</p>
                  </div>
                  <div className="bg-black border border-red-500/20 rounded-2xl px-6 py-5 min-w-24">
                    <p className="text-4xl font-black text-red-400">{String(timeUntilOpen.seconds).padStart(2, '0')}</p>
                    <p className="text-xs text-slate-500 mt-2 font-semibold uppercase">Segundos</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* INPUTS GRID */}
        <div className="grid md:grid-cols-2 gap-10 mb-12">

          {/* UÑAS CARD */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0d0d14] p-8 hover:border-emerald-500/30 transition-all duration-300 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/5 rounded-full -translate-y-10 translate-x-10" />

            <div className="relative z-10 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
                  <span className="text-4xl">💅</span>
                  <span>Uñas</span>
                </h2>
                <span className="text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-emerald-400 font-semibold">
                  {unasCount} detectados
                </span>
              </div>

              <textarea
                disabled={isSystemClosed}
                className="w-full h-48 rounded-xl border border-slate-800 bg-black px-5 py-4 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 resize-none transition disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                placeholder="Un nombre por línea"
                value={unasText}
                onChange={(e) => setUnasText(e.target.value)}
              />

              <div className="mt-4 p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                <p className="text-slate-400 text-sm mb-2 font-semibold">Total ganado en Uñas</p>
                <p className="text-3xl font-black text-emerald-400">S/ {totalUnasEarned.toFixed(2)}</p>
              </div>
            </div>

            {/* UÑAS LIST */}
            <div className="relative z-10 mt-6 pt-6 border-t border-slate-800">
              <p className="text-slate-400 text-sm mb-4 font-semibold uppercase tracking-wide">
                Registrados ({unasReviews.length})
              </p>
              {unasReviews.length === 0 ? (
                <p className="text-slate-600 text-sm italic">Aún no hay registros de uñas</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {unasReviews.map((r, idx) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 bg-black border border-slate-800 rounded-lg px-4 py-3 hover:border-emerald-500/40 transition"
                    >
                      <span className="text-slate-500 font-mono text-sm w-6 font-bold">{idx + 1}.</span>
                      <span className="font-medium text-white tracking-wide">{r.client_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SEGUROS CARD */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0d0d14] p-8 hover:border-emerald-500/30 transition-all duration-300 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full -translate-y-10 translate-x-10" />

            <div className="relative z-10 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
                  <span className="text-4xl">🛡️</span>
                  <span>Seguros</span>
                </h2>
                <span className="text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-emerald-400 font-semibold">
                  {segurosCount} detectados
                </span>
              </div>

              <textarea
                disabled={isSystemClosed}
                className="w-full h-48 rounded-xl border border-slate-800 bg-black px-5 py-4 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 resize-none transition disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                placeholder="Un nombre por línea"
                value={segurosText}
                onChange={(e) => setSegurosText(e.target.value)}
              />

              <div className="mt-4 p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                <p className="text-slate-400 text-sm mb-2 font-semibold">Total ganado en Seguros</p>
                <p className="text-3xl font-black text-emerald-400">S/ {totalSegurosEarned.toFixed(2)}</p>
              </div>
            </div>

            {/* SEGUROS LIST */}
            <div className="relative z-10 mt-6 pt-6 border-t border-slate-800">
              <p className="text-slate-400 text-sm mb-4 font-semibold uppercase tracking-wide">
                Registrados ({segurosReviews.length})
              </p>
              {segurosReviews.length === 0 ? (
                <p className="text-slate-600 text-sm italic">Aún no hay registros de seguros</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {segurosReviews.map((r, idx) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 bg-black border border-slate-800 rounded-lg px-4 py-3 hover:border-emerald-500/40 transition"
                    >
                      <span className="text-slate-500 font-mono text-sm w-6 font-bold">{idx + 1}.</span>
                      <span className="font-medium text-white tracking-wide">{r.client_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* BUTTON */}
        <button
          onClick={handleAdd}
          disabled={loading || isSystemClosed}
          className="w-full md:w-1/2 mx-auto block bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-bold py-6 rounded-xl text-lg transition hover:scale-[1.02] hover:from-emerald-400 hover:to-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-8 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
        >
          {loading ? '⏳ Guardando...' : isSystemClosed ? '🔒 Sistema Cerrado' : '💾 Guardar todo'}
        </button>

        {/* MESSAGE */}
        {message && (
          <div className={`mb-8 rounded-xl border px-6 py-4 text-center text-sm max-w-md mx-auto ${messageStyles[messageType]}`}>
            {message}
          </div>
        )}

        {/* FOOTER */}
        <div className="text-center text-slate-700 text-xs mt-12">
          1 USD = S/ {USD_TO_PEN} PEN
        </div>

      </div>
    </main>
  )
}