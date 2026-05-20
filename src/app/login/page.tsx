"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (
      email === "admin@easymoney.com"
    ) {
      router.push("/dashboard");
    } else {
      router.push("/worker");
    }

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-2xl">
        
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-white via-emerald-300 to-emerald-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(16,185,129,0.7)]">
              Easy Money
            </span>

            <span className="ml-2">🤑</span>
          </h1>

          <p className="mt-4 text-slate-400">
            Inicia sesión
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >
          
          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Correo
            </label>

            <input
              type="email"
              placeholder="admin@easymoney.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="w-full rounded-2xl border border-slate-800 bg-black px-4 py-3 outline-none transition focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Contraseña
            </label>

            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="w-full rounded-2xl border border-slate-800 bg-black px-4 py-3 outline-none transition focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 py-3 font-bold text-black transition hover:scale-[1.02] hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading
              ? "Entrando..."
              : "Entrar"}
          </button>

        </form>

      </div>

    </main>
  );
}