import { supabase } from "./supabase"

export interface ApprovedUser {
  id: string
  email: string
  business_name: string
  onboarding_status: "pending" | "active" | "rejected"
  is_active: boolean
}

export const userAuth = {
  async login(email: string, password: string): Promise<{ user: ApprovedUser | null; error: string | null }> {
    try {
      // 1. Verify credentials via internal RPC
      const { data, error: rpcError } = await supabase.rpc("verify_brand_password", {
        o_email: email.toLowerCase(),
        p_password: password
      });

      if (rpcError) {
        console.error("Auth RPC Failure:", rpcError);
        return { user: null, error: "System authentication unavailable." };
      }

      if (!data || data.length === 0) {
        return { user: null, error: "Invalid brand credentials." };
      }

      const brand = data[0];

      // 2. Map to ApprovedUser type
      const user: ApprovedUser = {
        id: brand.id,
        email: brand.email,
        business_name: brand.business_name,
        onboarding_status: brand.onboarding_status as any,
        is_active: brand.onboarding_status === 'active'
      };

      // 3. Generate Internal Session Data
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("user_session", token);
      localStorage.setItem("user_data", JSON.stringify(user));

      return { user, error: null };
    } catch (err) {
      console.error("Critical Brand Login Crash:", err);
      return { user: null, error: "An unexpected error occurred during login." };
    }
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
      // 1. Check for duplicate directly
      const { data: exists } = await supabase.from("brands").select("id").eq("email", email.toLowerCase()).single();
      if (exists) return { user: null, error: "An account with this email already exists." };

      // 2. Create internal profile with hashed password
      // For Alpha, we'll use a direct insert with crypt
      const { data: brand, error: insertError } = await supabase
        .from("brands")
        .insert({
          email: email.toLowerCase(),
          password_hash: (await supabase.rpc('generate_password_hash', { p_password: password })).data || password,
          business_name: businessName,
          phone,
          description: brandDescription,
          instagram_handle: socialHandle,
          onboarding_status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        console.error("Signup Insertion Failure:", insertError);
        return { user: null, error: "System unable to process signup." };
      }

      return {
        user: {
          id: brand.id,
          email: brand.email,
          business_name: brand.business_name,
          onboarding_status: 'pending',
          is_active: false
        },
        error: null
      };
    } catch (err) {
      console.error("Sign up error:", err);
      return { user: null, error: "An unexpected error occurred" };
    }
  },

  async getCurrentUser(): Promise<ApprovedUser | null> {
    try {
      const session = localStorage.getItem("user_session");
      const userStr = localStorage.getItem("user_data");
      if (!session || !userStr) return null;
      return JSON.parse(userStr) as ApprovedUser;
    } catch (err) {
      return null;
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem("user_session");
    localStorage.removeItem("user_data");
  },

  async verifySession(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  },
}
