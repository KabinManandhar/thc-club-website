import { createClient } from "@supabase/supabase-js"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export interface PosActor {
  id: string
  name: string
  kind: "admin" | "staff"
}

type VerifyResult = { ok: true; actor: PosActor } | { ok: false; error: string; status: number }

/** Allows active admins (non-viewer) and active staff to ring up sales. */
export async function verifyPosRequest(request: Request): Promise<VerifyResult> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
  if (!token) return { ok: false, error: "Not signed in.", status: 401 }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return { ok: false, error: "Server configuration error.", status: 500 }

  const { data: { user }, error } = await createClient(url, anonKey).auth.getUser(token)
  if (error || !user?.email) return { ok: false, error: "Session expired. Please sign in again.", status: 401 }

  const email = user.email.toLowerCase()
  const db = getSupabaseAdmin()
  const [adminRes, staffRes] = await Promise.all([
    db.from("admin_users").select("id, name, role, is_active").eq("email", email).maybeSingle(),
    db.from("staff_users").select("id, name, is_active").eq("email", email).maybeSingle(),
  ])

  const admin = adminRes.data
  if (admin?.is_active && admin.role !== "viewer") {
    return { ok: true, actor: { id: admin.id, name: admin.name, kind: "admin" } }
  }
  const staff = staffRes.data
  if (staff?.is_active) {
    return { ok: true, actor: { id: staff.id, name: staff.name, kind: "staff" } }
  }
  return { ok: false, error: "This account cannot create invoices.", status: 403 }
}
