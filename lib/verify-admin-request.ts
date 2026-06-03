import type { AdminUser } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

type VerifyResult =
  | { ok: true; admin: Pick<AdminUser, "id" | "email" | "role" | "is_active"> }
  | { ok: false; error: string; status: number }

function mapRpcFailure(reason: string | undefined, email: string): VerifyResult {
  switch (reason) {
    case "no_jwt_email":
      return { ok: false, error: "Invalid session. Please sign in again.", status: 401 }
    case "not_in_admin_users":
      return {
        ok: false,
        error: `No admin profile for ${email}. Add this email to admin_users in Supabase.`,
        status: 403,
      }
    case "inactive":
      return { ok: false, error: "Admin account is inactive.", status: 403 }
    case "viewer":
      return { ok: false, error: "Insufficient permissions (viewer role).", status: 403 }
    default:
      return { ok: false, error: "Admin access required.", status: 403 }
  }
}

export async function verifyAdminRequest(request: Request): Promise<VerifyResult> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, error: "Unauthorized", status: 401 }
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return { ok: false, error: "Unauthorized", status: 401 }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return { ok: false, error: "Server configuration error", status: 500 }
  }

  const supabaseUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token)
  if (userError || !user?.email) {
    return { ok: false, error: "Invalid or expired session. Please sign in again.", status: 401 }
  }

  const email = user.email.toLowerCase()

  // Preferred: security definer RPC (same JWT context as browser admin login)
  const { data: rpcResult, error: rpcError } = await supabaseUser.rpc("verify_admin_manager")
  if (!rpcError && rpcResult && typeof rpcResult === "object") {
    const result = rpcResult as {
      ok?: boolean
      reason?: string
      admin?: Pick<AdminUser, "id" | "email" | "role" | "is_active">
    }
    if (result.ok && result.admin) {
      return { ok: true, admin: result.admin }
    }
    if (result.ok === false) {
      return mapRpcFailure(result.reason, email)
    }
  }

  if (rpcError) {
    console.warn("[verifyAdminRequest] RPC verify_admin_manager failed:", rpcError.message)
  }

  // Fallback: service role lookup (bypasses RLS)
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, role, is_active")
      .ilike("email", email)
      .limit(1)
      .maybeSingle()

    if (adminError) {
      console.error("[verifyAdminRequest] admin_users lookup:", adminError.message)
      return {
        ok: false,
        error: `Admin verification failed: ${adminError.message}`,
        status: 403,
      }
    }

    if (!admin) {
      return {
        ok: false,
        error: `No admin profile for ${email}. Add this email to admin_users in Supabase.`,
        status: 403,
      }
    }

    if (!admin.is_active) {
      return { ok: false, error: "Admin account is inactive.", status: 403 }
    }

    if (admin.role === "viewer") {
      return { ok: false, error: "Insufficient permissions (viewer role).", status: 403 }
    }

    return { ok: true, admin }
  } catch (err: any) {
    console.error("[verifyAdminRequest] service role unavailable:", err?.message)
    return {
      ok: false,
      error:
        "Server missing SUPABASE_SERVICE_ROLE_KEY, or verify_admin_manager RPC not installed. Run supabase/admin-staff-management.sql.",
      status: 500,
    }
  }
}
