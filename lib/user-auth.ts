import bcrypt from "bcryptjs"
import { supabase } from "./supabase"

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
  async login(email: string, password: string): Promise<{ user: any | null; error: string | null; emailNotConfirmed?: boolean }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      })

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          return { user: null, error: "Please verify your email to continue.", emailNotConfirmed: true }
        }
        return { user: null, error: error.message }
      }

      if (data.user && data.session) {
        const user: ApprovedUser = {
          id: data.user.id,
          email: data.user.email || email,
          business_name: data.user.user_metadata?.business_name || "Club Member",
          is_active: true,
        }

        localStorage.setItem("user_session", data.session.access_token)
        localStorage.setItem("user_data", JSON.stringify(user))
        
        // Sync login time in background
        supabase.rpc("update_user_login_time", {
          p_user_id: data.user.id,
          p_is_first_login: !data.user.last_sign_in_at,
        })

        return { user, error: null }
      }

      return { user: null, error: "Login failed" }
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
  ): Promise<{ user: any | null; error: string | null }> {
    try {
      // Use Supabase Auth signUp which sends the verification email automatically
      // when SMTP is configured correctly.
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/club`,
          data: {
            business_name: businessName,
            phone,
            description: brandDescription,
            social_handle: socialHandle,
          },
        },
      })

      if (error) {
        return { user: null, error: error.message }
      }

      return { user: data.user, error: null }
    } catch (err) {
      console.error("Sign up error:", err)
      return { user: null, error: "Registration failed" }
    }
  },

  async verifyOtp(email: string, token: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase(),
        token,
        type: "signup",
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user && data.session) {
        // Complete the local session setup as if they logged in
        const user: ApprovedUser = {
          id: data.user.id,
          email: data.user.email || email,
          business_name: data.user.user_metadata?.business_name || "Club Member",
          is_active: true,
        }

        localStorage.setItem("user_session", data.session.access_token)
        localStorage.setItem("user_data", JSON.stringify(user))
        return { success: true, error: null }
      }

      return { success: false, error: "Verification failed" }
    } catch (err) {
      console.error("Verification error:", err)
      return { success: false, error: "Unexpected error during verification" }
    }
  },

  async resendOtp(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase(),
      })
      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: "Failed to resend code" }
    }
  },

  async forgotPassword(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err) {
      console.error("Forgot password error:", err)
      return { success: false, error: "Failed to send reset email" }
    }
  },

  async updatePassword(password: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (err) {
      console.error("Update password error:", err)
      return { success: false, error: "Failed to update password" }
    }
  },
}