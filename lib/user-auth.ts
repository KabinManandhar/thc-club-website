import { supabase } from "./supabase"
import bcrypt from "bcryptjs"

export interface ApprovedUser {
  id: string
  email: string
  business_name: string
  password?: string
  is_active: boolean
  first_login?: string | null
  last_login?: string | null
}

export interface UserAuthState {
  user: ApprovedUser | null
  loading: boolean
}

export const userAuth = {
  async login(email: string, password: string): Promise<{ user: ApprovedUser | null; error: string | null }> {
    try {
      // 1. Fetch user via SECURITY DEFINER RPC (bypasses RLS on approved_users)
      const { data: users, error: rpcError } = await supabase
        .rpc("verify_user_login", { p_email: email.toLowerCase() })

      if (rpcError) {
        console.error("RPC error:", rpcError)
        return { user: null, error: "Login failed. Please try again." }
      }

      if (!users || users.length === 0) {
        return { user: null, error: "Invalid email or password" }
      }

      const userRow = users[0]

      // 2. Verify bcrypt hash
      if (!userRow.password) {
        return { user: null, error: "Account credentials not set up. Contact support." }
      }

      const isMatch = await bcrypt.compare(password, userRow.password)
      if (!isMatch) {
        return { user: null, error: "Invalid email or password" }
      }

      // 3. Create session in user_sessions table (publicly accessible via RLS)
      const sessionToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 day session

      const { error: sessionError } = await supabase.from("user_sessions").insert({
        user_id: userRow.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      })

      if (sessionError) {
        console.error("Session insert error:", sessionError)
        // Don't fail login if session fails — just warn
      }

      // 4. Update login timestamps via RPC
      await supabase.rpc("update_user_login_time", {
        p_user_id: userRow.id,
        p_is_first_login: !userRow.first_login,
      })

      // 5. Store session locally
      const user: ApprovedUser = {
        id: userRow.id,
        email: userRow.email,
        business_name: userRow.business_name,
        is_active: userRow.is_active,
        first_login: userRow.first_login,
        last_login: userRow.last_login,
      }

      localStorage.setItem("user_session", sessionToken)
      localStorage.setItem("user_data", JSON.stringify(user))

      return { user, error: null }
    } catch (err) {
      console.error("User login error:", err)
      return { user: null, error: "Login failed" }
    }
  },

  async logout(): Promise<void> {
    try {
      const sessionToken = localStorage.getItem("user_session")
      if (sessionToken) {
        await supabase.from("user_sessions").delete().eq("session_token", sessionToken)
      }
      localStorage.removeItem("user_session")
      localStorage.removeItem("user_data")
    } catch (err) {
      console.error("User logout error:", err)
    }
  },

  async getCurrentUser(): Promise<ApprovedUser | null> {
    try {
      const sessionToken = localStorage.getItem("user_session")
      const userStr = localStorage.getItem("user_data")

      if (!sessionToken || !userStr) return null

      // Validate session against database (user_sessions is publicly readable)
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("id, expires_at")
        .eq("session_token", sessionToken)
        .gt("expires_at", new Date().toISOString())

      if (!sessions || sessions.length === 0) {
        // Session expired or not found
        await this.logout()
        return null
      }

      return JSON.parse(userStr) as ApprovedUser
    } catch (err) {
      console.error("Get current user error:", err)
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

  async signUp(
    email: string,
    password: string,
    businessName: string,
    phone: string,
    brandDescription: string,
    socialHandle: string
  ): Promise<{ user: ApprovedUser | null; error: string | null }> {
    try {
      // 1. Hash password in frontend
      const hashedPassword = await bcrypt.hash(password, 10)

      // 2. Call register_user RPC (SECURITY DEFINER — bypasses RLS)
      const { data, error: rpcError } = await supabase.rpc("register_user", {
        p_email: email.toLowerCase(),
        p_password_hash: hashedPassword,
        p_business_name: businessName,
        p_phone: phone,
        p_description: brandDescription,
        p_social_handle: socialHandle,
      })

      if (rpcError) {
        return { user: null, error: rpcError.message }
      }

      const result = data as { success?: boolean; user_id?: string; error?: string }

      if (result?.error) {
        return { user: null, error: result.error }
      }

      // 3. Return minimal user object (can't fetch from approved_users due to RLS)
      const user: ApprovedUser = {
        id: result.user_id || "",
        email: email.toLowerCase(),
        business_name: businessName,
        is_active: true,
      }

      return { user, error: null }
    } catch (err) {
      console.error("Sign up error:", err)
      return { user: null, error: "Registration failed" }
    }
  },

  async resetPassword(_email: string): Promise<{ success: boolean; error?: string }> {
    // Placeholder — would trigger an email reset in a full auth system
    return { success: true }
  },
}
