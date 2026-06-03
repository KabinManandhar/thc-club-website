import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { verifyAdminRequest } from "@/lib/verify-admin-request"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from("staff_users")
      .select("id, email, name, is_active, last_login_at, created_at")
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json({ staff: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load staff" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const name = String(body.name || "").trim()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: existing } = await supabaseAdmin
      .from("staff_users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "A staff account with this email already exists." }, { status: 409 })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, account_type: "staff" },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create login credentials." },
        { status: 400 }
      )
    }

    const { data: staffRow, error: staffError } = await supabaseAdmin
      .from("staff_users")
      .insert({ email, name, is_active: true })
      .select("id, email, name, is_active, created_at")
      .single()

    if (staffError || !staffRow) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: staffError?.message || "Failed to register staff profile." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      staff: staffRow,
      message: "Staff account created. They can sign in at /pos with this email and password.",
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create staff account" }, { status: 500 })
  }
}
