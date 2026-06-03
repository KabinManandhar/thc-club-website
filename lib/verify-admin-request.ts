import { createClient } from "@supabase/supabase-js"
import type { AdminUser } from "@/lib/auth"

type VerifyResult =
  | { ok: true; admin: Pick<AdminUser, "id" | "email" | "role" | "is_active"> }
  | { ok: false; error: string; status: number }

export async function verifyAdminRequest(request: Request): Promise<VerifyResult> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, error: "Unauthorized", status: 401 }
  }

  const token = authHeader.slice(7)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return { ok: false, error: "Server configuration error", status: 500 }
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user?.email) {
    return { ok: false, error: "Invalid session", status: 401 }
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("id, email, role, is_active")
    .eq("email", user.email.toLowerCase())
    .single()

  if (adminError || !admin?.is_active) {
    return { ok: false, error: "Admin access required", status: 403 }
  }

  if (admin.role === "viewer") {
    return { ok: false, error: "Insufficient permissions", status: 403 }
  }

  return { ok: true, admin }
}
