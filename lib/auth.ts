import { supabase } from "./supabase"

export interface AdminUser {
  id: string
  email: string
  name: string
  role: "super_admin" | "admin"
  is_active: boolean
}

export const adminAuth = {
  async login(email: string, password: string): Promise<{ user: AdminUser | null; error: string | null }> {
    try {
      // 1. Verify credentials via internal RPC
      const { data, error: rpcError } = await supabase.rpc("verify_admin_password", {
        o_email: email.toLowerCase(),
        p_password: password
      });

      if (rpcError) {
        console.error("Auth RPC Failure:", rpcError);
        return { user: null, error: "System authentication unavailable." };
      }

      if (!data || data.length === 0) {
        return { user: null, error: "Invalid administrative credentials." };
      }

      const admin = data[0] as AdminUser;

      // 2. Generate Internal Session Data
      const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("admin_session", sessionToken);
      localStorage.setItem("admin_user", JSON.stringify(admin));

      return { user: admin, error: null };
    } catch (err) {
      console.error("Critical Admin Login Crash:", err);
      return { user: null, error: "An unexpected error occurred." };
    }
  },

  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const session = localStorage.getItem("admin_session");
      const userStr = localStorage.getItem("admin_user");
      if (!session || !userStr) return null;

      return JSON.parse(userStr) as AdminUser;
    } catch (err) {
      return null;
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem("admin_session");
    localStorage.removeItem("admin_user");
  },

  async verifySession(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  },
}