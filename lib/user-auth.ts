import { supabase } from "./supabase"

export interface ApprovedUser {
  id: string
  email: string
  business_name: string
  password: string
  is_active: boolean
  first_login?: string
  last_login?: string
}

export interface UserAuthState {
  user: ApprovedUser | null
  loading: boolean
}

export const userAuth = {
  async login(email: string, password: string): Promise<{ user: ApprovedUser | null; error: string | null }> {
    try {
      // Check if user exists and password is correct
      const { data: user, error } = await supabase
        .from("approved_users")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("password", password)
        .eq("is_active", true)
        .single()

      if (error || !user) {
        return { user: null, error: "Invalid email or password" }
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
    const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development' || process.env.NODE_ENV === 'development'
    if (typeof window !== "undefined" && isDev && localStorage.getItem("thc_test_mode") === "true") {
      return true
    }
    const user = await this.getCurrentUser()
    return user !== null
  },

  async signUp(
    email: string,
    password: string,
    businessName: string,
    phone: string,
    brandDescription: string,
    socialHandle: string
  ): Promise<{ user: ApprovedUser | null; error: string | null }> {
    try {
      // Check if user already exists
      const { data: existing } = await supabase
        .from("approved_users")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle()

      if (existing) {
        return { user: null, error: "An account with this email already exists" }
      }

      // Create user
      const { data: newUser, error: createError } = await supabase
        .from("approved_users")
        .insert({
          email: email.toLowerCase(),
          password: password,
          business_name: businessName,
          is_active: true, // Everyone can login to see pricing
        })
        .select("*")
        .single()

      if (createError || !newUser) {
        return { user: null, error: createError?.message || "Registration failed" }
      }

      // Create a brand profile
      await supabase.from("brands").insert({
        email: email.toLowerCase(),
        business_name: businessName,
        phone: phone,
        description: brandDescription,
        instagram_handle: socialHandle,
        onboarding_status: "pending",
      })

      return { user: newUser, error: null }
    } catch (error) {
      console.error("Sign up error:", error)
      return { user: null, error: "Registration failed" }
    }
  },

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user exists in approved_users
      const { data: user, error } = await supabase
        .from("approved_users")
        .select("email")
        .eq("email", email.toLowerCase())
        .eq("is_active", true)
        .single()

      if (error || !user) {
        return { success: false, error: "Email not found in approved users list" }
      }

      // In a real app, you'd send a reset link here
      return { success: true }
    } catch (error) {
      console.error("Reset password error:", error)
      return { success: false, error: "Failed to process request" }
    }
  },
}
