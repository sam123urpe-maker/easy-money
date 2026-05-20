'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function WorkerPage() {
  const [user, setUser] = useState<any>(null)

  const [unasText, setUnasText] = useState('')
  const [segurosText, setSegurosText] = useState('')

  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success')

  const isDouglas =
    user?.email?.toLowerCase() === 'douglas@easymoney.com'

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)
    await loadReviews(user.email)
  }

  async function loadReviews(email: string) {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('worker_email', email.toLowerCase())
      .order('id', { ascending: false })

    setReviews(data || [])
  }

  async function handleAdd() {
    if (!user) return

    setLoading(true)
    setMessage('')

    const unas = unasText.split('\n').map(n => n.trim()).filter(n => n !== '')
    const seguros = segurosText.split('\n').map(n => n.trim()).filter(n => n !== '')

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
      setMessage('No hay datos para añadir')
      setMessageType('warning')
      return
    }

    const { error } = await supabase.from('reviews').insert(inserts)

    if (error) {
      setMessage('Error al guardar')
      setMessageType('error')
      setLoading(false)
      return
    }

    setUnasText('')
    setSegurosText('')
    setMessage('Datos guardados correctamente')
    setMessageType('success')

    await loadReviews(user.email)
    setLoading(false)

    setTimeout(() => setMessage(''), 3000)
  }

  const messageStyles = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-16 flex justify-center">
      <div className="w-full max-w-6xl">

        {/* HEADER */}
        <div className="text-center mb-20">

          <h1 className="text-6xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-white via-emerald-300 to-emerald-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              Easy Money
            </span>
            <span className="ml-3 text-4xl text-emerald-400">🤑</span>
          </h1>

          {user && (
            <p className="mt-4 text-slate-500 text-sm tracking-widest">
              PANEL PRIVADO — {user.email}
            </p>
          )}
        </div>

        {/* HERO IMAGE */}
        {isDouglas && (
          <div className="flex justify-center mb-24">
            <img
              src="https://i.postimg.cc/cCFwBFKQ/4d8180fd-fd29-4e5b-babe-28459bf9cb68.png"
              alt="Douglas"
              className="w-[480px] object-contain drop-shadow-[0_0_80px_rgba(16,185,129,0.35)]"
            />
          </div>
        )}

        {/* INPUTS */}
        <div className="grid md:grid-cols-2 gap-10">

          {/* UÑAS */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-[0_0_40px_rgba(0,0,0,0.6)]">

            <h2 className="text-2xl font-bold mb-6 tracking-wide flex items-center gap-3">
              💅 <span>Uñas</span>
            </h2>

            <textarea
              className="w-full h-56 rounded-2xl border border-slate-800 bg-black px-5 py-4 text-white outline-none focus:border-emerald-500 resize-none transition"
              placeholder={"Juan\nMaria\nCarlos"}
              value={unasText}
              onChange={(e) => setUnasText(e.target.value)}
            />
          </div>

          {/* SEGUROS */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-[0_0_40px_rgba(0,0,0,0.6)]">

            <h2 className="text-2xl font-bold mb-6 tracking-wide flex items-center gap-3">
              🛡️ <span>Seguros</span>
            </h2>

            <textarea
              className="w-full h-56 rounded-2xl border border-slate-800 bg-black px-5 py-4 text-white outline-none focus:border-emerald-500 resize-none transition"
              placeholder={"Pedro\nLuis\nAna"}
              value={segurosText}
              onChange={(e) => setSegurosText(e.target.value)}
            />
          </div>

        </div>

        {/* BOTÓN */}
        <div className="mt-12 text-center">
          <button
            onClick={handleAdd}
            disabled={loading}
            className="w-full md:w-1/2 bg-emerald-500 text-black font-bold py-5 rounded-2xl text-lg transition hover:scale-[1.02] hover:bg-emerald-400 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar todo'}
          </button>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className={`mt-8 rounded-2xl border px-6 py-4 text-center text-sm ${messageStyles[messageType]}`}>
            {message}
          </div>
        )}

        {/* LISTA */}
        <div className="mt-20 rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-[0_0_40px_rgba(0,0,0,0.6)]">

          <h2 className="text-2xl font-bold mb-8 tracking-wide">
            Clientes registrados
          </h2>

          {reviews.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No hay registros aún
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.map(r => (
                <div
                  key={r.id}
                  className="flex justify-between items-center bg-black border border-slate-800 rounded-2xl px-6 py-4 hover:border-emerald-500/40 transition"
                >
                  <span className="font-medium tracking-wide">
                    {r.client_name}
                  </span>

                  <span className={`text-sm uppercase tracking-widest ${
                    r.service_type === 'unas'
                      ? 'text-pink-400'
                      : 'text-cyan-400'
                  }`}>
                    {r.service_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}