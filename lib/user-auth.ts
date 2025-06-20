import { supabase } from "./supabase"

export interface ApprovedUser {
  id: string
  email: string
  business_name: string
  login_code: string
  is_active: boolean
  first_login?: string
  last_login?: string
}

export interface UserAuthState {
  user: ApprovedUser | null
  loading: boolean
}

export const userAuth = {
  async login(email: string, loginCode: string): Promise<{ user: ApprovedUser | null; error: string | null }> {
    try {
      // Check if user exists and login code is correct
      const { data: user, error } = await supabase
        .from("approved_users")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("login_code", loginCode)
        .eq("is_active", true)
        .single()

      if (error || !user) {
        return { user: null, error: "Invalid email or login code" }
      }

      // Create session token
      const sessionToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 day session for users

      await supabase.from("user_sessions").insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      })

      // Update login timestamps
      const now = new Date().toISOString()
      const updateData: any = { last_login: now }
      if (!user.first_login) {
        updateData.first_login = now
      }

      await supabase.from("approved_users").update(updateData).eq("id", user.id)

      // Store session in localStorage
      localStorage.setItem("user_session", sessionToken)
      localStorage.setItem("user_data", JSON.stringify(user))

      return { user, error: null }
    } catch (error) {
      console.error("User login error:", error)
      return { user: null, error: "Login failed" }
    }
  },

  async logout(): Promise<void> {
    try {
      const sessionToken = localStorage.getItem("user_session")
      if (sessionToken) {
        // Remove session from database
        await supabase.from("user_sessions").delete().eq("session_token", sessionToken)
      }

      // Clear localStorage
      localStorage.removeItem("user_session")
      localStorage.removeItem("user_data")
    } catch (error) {
      console.error("User logout error:", error)
    }
  },

  async getCurrentUser(): Promise<ApprovedUser | null> {
    try {
      const sessionToken = localStorage.getItem("user_session")
      const userStr = localStorage.getItem("user_data")

      if (!sessionToken || !userStr) {
        return null
      }

      // Verify session is still valid
      const { data: session, error } = await supabase
        .from("user_sessions")
        .select("*, approved_users(*)")
        .eq("session_token", sessionToken)
        .gt("expires_at", new Date().toISOString())
        .single()

      if (error || !session) {
        // Session expired or invalid
        this.logout()
        return null
      }

      return JSON.parse(userStr)
    } catch (error) {
      console.error("Get current user error:", error)
      return null
    }
  },

  async verifySession(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user !== null
  },

  async requestLoginCode(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user exists in approved_users
      const { data: user, error } = await supabase
        .from("approved_users")
        .select("email, business_name, login_code")
        .eq("email", email.toLowerCase())
        .eq("is_active", true)
        .single()

      if (error || !user) {
        return { success: false, error: "Email not found in approved users list" }
      }

      // In a real app, you'd send an email here
      // For now, we'll just return success (admin can share the code manually)
      return { success: true }
    } catch (error) {
      console.error("Request login code error:", error)
      return { success: false, error: "Failed to process request" }
    }
  },
}
