import { supabase } from "./supabase"

export interface StaffUser {
  id: string
  email: string
  name: string
  is_active: boolean
}

export const staffAuth = {
  async login(email: string, password: string): Promise<{ user: StaffUser | null; error: string | null }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      })

      if (authError || !authData.user) {
        return { user: null, error: "Invalid credentials or account not set up for staff access." }
      }

      const { data: staff, error: dbError } = await supabase
        .from("staff_users")
        .select("*")
        .eq("email", email.toLowerCase())
        .single()

      if (dbError || !staff || !staff.is_active) {
        await supabase.auth.signOut()
        return { user: null, error: "Unauthorized. This account does not have staff POS access." }
      }

      try {
        await supabase.rpc("update_staff_login_time", { p_staff_id: staff.id })
      } catch {
        // optional RPC
      }

      const user: StaffUser = {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        is_active: staff.is_active,
      }

      localStorage.removeItem("admin_session")
      localStorage.removeItem("admin_user")
      localStorage.setItem("staff_session", authData.session.access_token)
      localStorage.setItem("staff_user", JSON.stringify(user))

      return { user, error: null }
    } catch (err) {
      console.error("Staff login error:", err)
      return { user: null, error: "Login failed" }
    }
  },

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem("staff_session")
      localStorage.removeItem("staff_user")
    } catch (err) {
      console.error("Staff logout error:", err)
    }
  },

  async getCurrentUser(): Promise<StaffUser | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userStr = localStorage.getItem("staff_user")

      if (!session || !userStr) return null

      return JSON.parse(userStr) as StaffUser
    } catch (err) {
      console.error("Get current staff error:", err)
      return null
    }
  },

  async verifySession(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user !== null
  },
}
