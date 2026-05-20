'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login')
    }, 2200)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">

        <h1 className="text-7xl font-black tracking-tight">
          <span className="bg-gradient-to-r from-white via-emerald-300 to-emerald-500 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(16,185,129,0.8)]">
            Easy Money
          </span>

          <span className="ml-3 inline-block animate-bounce">
            🤑
          </span>
        </h1>

        <p className="mt-6 text-slate-500 tracking-[0.35em] text-sm">
          LOADING...
        </p>

      </div>
    </main>
  )
}