import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface WaitlistEntry {
  id: string
  business_name: string
  email: string
  phone: string
  status: "pending" | "approved" | "rejected"
  notes?: string
  created_at: string
  updated_at: string
  reviewed_by?: string
  reviewed_at?: string
}

export interface Enquiry {
  id: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: "new" | "in_progress" | "resolved"
  priority: "low" | "medium" | "high"
  assigned_to?: string
  created_at: string
  updated_at: string
}

export interface VisitRequest {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  visit_purpose: string
  preferred_date: string
  preferred_time: string
  number_of_visitors: number
  special_requirements?: string
  status: "pending" | "confirmed" | "cancelled" | "completed"
  notes?: string
  created_at: string
  updated_at: string
}

export interface BookingRequest {
  id: string
  user_email: string
  business_name: string
  shelf_type: "bottom" | "eye_level" | "top_level"
  duration: "quarterly" | "half_yearly" | "yearly"
  bundle_type?: "starter" | "full_shelf"
  monthly_rent: number
  total_amount: number
  status: "pending" | "approved" | "rejected" | "payment_pending" | "active"
  notes?: string
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}

export interface ShelfSlot {
  id: string
  slot_number: number
  shelf_type: "bottom" | "eye_level" | "top_level"
  status: "available" | "occupied" | "maintenance"
  occupied_by?: string
  booking_id?: string
  rent_amount?: number
  occupied_from?: string
  occupied_until?: string
  created_at: string
  updated_at: string
}
