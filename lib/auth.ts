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

// Simple password verification (in production, use proper bcrypt)
const verifyPassword = (password: string, hash: string): boolean => {
  // For demo purposes, we'll do a simple check
  // In production, use bcrypt.compare(password, hash)
  return password === "I@mgod@666"
}

export const adminAuth = {
  async login(email: string, password: string): Promise<{ user: AdminUser | null; error: string | null }> {
    try {
      // Check if user exists and password is correct
      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("email", email)
        .eq("is_active", true)
        .single()

      if (error || !adminUser) {
        return { user: null, error: "Invalid credentials" }
      }

      // Verify password (simplified for demo)
      if (!verifyPassword(password, adminUser.password_hash)) {
        return { user: null, error: "Invalid credentials" }
      }

      // Create session token
      const sessionToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour session

      await supabase.from("admin_sessions").insert({
        admin_id: adminUser.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      })

      // Update last login
      await supabase.from("admin_users").update({ last_login: new Date().toISOString() }).eq("id", adminUser.id)

      // Store session in localStorage
      localStorage.setItem("admin_session", sessionToken)
      localStorage.setItem("admin_user", JSON.stringify(adminUser))

      return {
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
          is_active: adminUser.is_active,
        },
        error: null,
      }
    } catch (error) {
      console.error("Login error:", error)
      return { user: null, error: "Login failed" }
    }
  },

  async logout(): Promise<void> {
    try {
      const sessionToken = localStorage.getItem("admin_session")
      if (sessionToken) {
        // Remove session from database
        await supabase.from("admin_sessions").delete().eq("session_token", sessionToken)
      }

      // Clear localStorage
      localStorage.removeItem("admin_session")
      localStorage.removeItem("admin_user")
    } catch (error) {
      console.error("Logout error:", error)
    }
  },

  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const sessionToken = localStorage.getItem("admin_session")
      const userStr = localStorage.getItem("admin_user")

      if (!sessionToken || !userStr) {
        return null
      }

      // Verify session is still valid
      const { data: session, error } = await supabase
        .from("admin_sessions")
        .select("*, admin_users(*)")
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
    const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development' || process.env.NODE_ENV === 'development'
    if (typeof window !== "undefined" && isDev && localStorage.getItem("thc_test_mode") === "true") {
      return true
    }
    const user = await this.getCurrentUser()
    return user !== null
  },
}