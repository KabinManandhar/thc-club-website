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
      // 1. Authenticate Natively with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      })

      if (authError || !authData.user) {
        console.error("Supabase Auth Error:", authError)
        return { user: null, error: "Invalid credentials or account has not been migrated to Supabase Auth." }
      }

      const sessionToken = authData.session.access_token

      // 2. Fetch admin privileges from admin_users to verify they are an admin
      const { data: admins, error: dbError } = await supabase
        .from("admin_users")
        .select("*")
        .eq("email", email.toLowerCase())
        .single()

      if (dbError || !admins || !admins.is_active) {
        // Cleanup local session if they aren't actually an admin
        await supabase.auth.signOut()
        return { user: null, error: "Unauthorized access. Your account does not have Admin privileges." }
      }

      // 3. Update last login via RPC 
      try { await supabase.rpc("update_admin_login_time", { p_admin_id: admins.id }) } catch (e) {}

      // 4. Store session locally
      const user: AdminUser = {
        id: admins.id,
        email: admins.email,
        name: admins.name,
        role: admins.role,
        is_active: admins.is_active,
      }

      localStorage.removeItem("staff_session")
      localStorage.removeItem("staff_user")
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
      await supabase.auth.signOut()
      localStorage.removeItem("admin_session")
      localStorage.removeItem("admin_user")
    } catch (err) {
      console.error("Admin logout error:", err)
    }
  },

  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userStr = localStorage.getItem("admin_user")

      if (!session || !userStr) return null

      // If session exists, user is authenticated
      return JSON.parse(userStr) as AdminUser
    } catch (err) {
      console.error("Get current admin error:", err)
      return null
    }
  },

  async verifySession(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user !== null
  },

  async updatePassword(password: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err: any) {
      console.error("Admin update password error:", err)
      return { success: false, error: err.message || "Update failed" }
    }
  },
}