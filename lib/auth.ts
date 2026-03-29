import bcrypt from "bcryptjs"
import { supabase } from "./supabase"

export interface AdminUser {
  id: string
  email: string
  name: string
  role: "super_admin" | "admin" | "viewer"
  is_active: boolean
}

export interface AuthState {
  user: AdminUser | null
  loading: boolean
}

export const adminAuth = {
  async login(email: string, password: string): Promise<{ user: AdminUser | null; error: string | null }> {
    try {
      // 1. Fetch admin via SECURITY DEFINER RPC (bypasses RLS on admin_users)
      const { data: admins, error: rpcError } = await supabase
        .rpc("verify_admin_login", { p_email: email.toLowerCase() })

      if (rpcError) {
        console.error("Admin RPC error:", rpcError)
        return { user: null, error: "Login failed. Please try again." }
      }

      if (!admins || admins.length === 0) {
        return { user: null, error: "Invalid credentials" }
      }

      const adminRow = admins[0]

      // 2. Verify bcrypt hash
      const isMatch = await bcrypt.compare(password, adminRow.password_hash)
      if (!isMatch) {
        return { user: null, error: "Invalid credentials" }
      }

      // 3. Create session in admin_sessions (publicly accessible via RLS allow_all)
      const sessionToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour session

      const { error: sessionError } = await supabase.from("admin_sessions").insert({
        admin_id: adminRow.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      })

      if (sessionError) {
        console.error("Admin session insert error:", sessionError)
        // Continue anyway — don't block login over session tracking
      }

      // 4. Update last login via RPC
      await supabase.rpc("update_admin_login_time", { p_admin_id: adminRow.id })

      // 5. Store session locally
      const user: AdminUser = {
        id: adminRow.id,
        email: adminRow.email,
        name: adminRow.name,
        role: adminRow.role,
        is_active: adminRow.is_active,
      }

      localStorage.setItem("admin_session", sessionToken)
      localStorage.setItem("admin_user", JSON.stringify(user))

      return { user, error: null }
    } catch (err) {
      console.error("Admin login error:", err)
      return { user: null, error: "Login failed" }
    }
  },

  async logout(): Promise<void> {
    try {
      const sessionToken = localStorage.getItem("admin_session")
      if (sessionToken) {
        await supabase.from("admin_sessions").delete().eq("session_token", sessionToken)
      }
      localStorage.removeItem("admin_session")
      localStorage.removeItem("admin_user")
    } catch (err) {
      console.error("Admin logout error:", err)
    }
  },

  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const sessionToken = localStorage.getItem("admin_session")
      const userStr = localStorage.getItem("admin_user")

      if (!sessionToken || !userStr) return null

      // Validate session against database (admin_sessions is publicly readable)
      const { data: sessions } = await supabase
        .from("admin_sessions")
        .select("id, expires_at")
        .eq("session_token", sessionToken)
        .gt("expires_at", new Date().toISOString())

      if (!sessions || sessions.length === 0) {
        await this.logout()
        return null
      }

      return JSON.parse(userStr) as AdminUser
    } catch (err) {
      console.error("Get current admin error:", err)
      return null
    }
  },

  async verifySession(): Promise<boolean> {
    const isDev = process.env.NEXT_PUBLIC_APP_ENV === "development" || process.env.NODE_ENV === "development"
    if (typeof window !== "undefined" && isDev && localStorage.getItem("thc_test_mode") === "true") {
      return true
    }
    const user = await this.getCurrentUser()
    return user !== null
  },

  async updatePassword(password: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const user = await this.getCurrentUser()
      const sessionToken = localStorage.getItem("admin_session")
      
      if (!user || !sessionToken) return { success: false, error: "Not properly authenticated" }

      const passwordHash = await bcrypt.hash(password, 10)
      
      const { data, error } = await supabase.rpc("update_admin_password_securely", {
        p_admin_id: user.id,
        p_session_token: sessionToken,
        p_new_password_hash: passwordHash,
      })

      if (error) throw error
      if (data && !data.success) throw new Error(data.error || "Update failed")

      return { success: true, error: null }
    } catch (err: any) {
      console.error("Admin update password error:", err)
      return { success: false, error: err.message || "Update failed" }
    }
  },
}