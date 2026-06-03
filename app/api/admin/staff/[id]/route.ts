import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { verifyAdminRequest } from "@/lib/verify-admin-request"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const is_active = body.is_active

    if (typeof is_active !== "boolean") {
      return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from("staff_users")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, email, name, is_active, last_login_at, created_at")
      .single()

    if (error) throw error
    return NextResponse.json({ staff: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update staff" }, { status: 500 })
  }
}
