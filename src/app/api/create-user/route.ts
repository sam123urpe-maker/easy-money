import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Faltan campos: email, password, name' },
        { status: 400 }
      )
    }

    // Cliente con service role — SOLO existe en el servidor, nunca en el browser
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Crear usuario en Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // confirmado automáticamente, no necesita verificar email
      user_metadata: { name }
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: true, user: data.user },
      { status: 200 }
    )

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error interno' },
      { status: 500 }
    )
  }
}