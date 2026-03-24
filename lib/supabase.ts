import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================
// Existing Types
// ============================================================



export interface Enquiry {
  id: string
  brand_id?: string
  subject: string
  message: string
  status: "new" | "in_progress" | "resolved" | "pending" | "rejected" | "on_hold"
  admin_reply?: string
  created_at: string
  updated_at: string
  // joined
  brands?: { business_name: string }
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

export interface Shelf {
  id: string
  name: string
  section?: string
  is_movable: boolean
  size?: "small" | "medium" | "large"
  shelf_type?: "bottom" | "eye_level" | "top_level" | "mixed"
  total_slots: number
  created_at: string
  updated_at: string
}

export interface ShelfSlot {
  id: string
  slot_number: number
  shelf_type: "bottom" | "eye_level" | "top_level" | "mixed"
  section?: string
  shelf_name?: string
  shelf_id?: string
  status: "available" | "occupied" | "maintenance"
  occupied_by?: string
  booking_id?: string
  rent_amount?: number
  occupied_from?: string
  occupied_until?: string
  created_at: string
  updated_at: string
  // joined
  shelves?: Shelf
}

// ============================================================
// New Production Types
// ============================================================

export interface Brand {
  id: string
  user_id?: string
  business_name: string
  contact_name?: string
  email: string
  phone?: string
  description?: string
  logo_url?: string
  instagram_handle?: string
  onboarding_status: "pending" | "slot_selected" | "confirmed" | "active" | "rejected"
  admin_notes?: string
  bank_account_details?: any
  last_interaction_at?: string
  created_at: string
  updated_at: string
}

export interface BrandContract {
  id: string
  brand_id: string
  file_url: string
  valid_from?: string
  valid_to?: string
  created_at: string
}

export interface ShelfBooking {
  id: string
  brand_id: string
  shelf_type: "bottom" | "eye_level" | "top_level"
  duration: "quarterly" | "half_yearly" | "yearly"
  slot_number?: number
  monthly_rent: number
  total_amount: number
  start_date?: string
  end_date?: string
  status: "pending" | "approved" | "rejected" | "active" | "expired"
  admin_notes?: string
  brand_agreement_accepted: boolean
  payment_method?: "bank_transfer" | "qr_payment" | "cash" | "card" | "other"
  created_at: string
  updated_at: string
  // joined
  brands?: Brand
}

export interface BrandProduct {
  id: string
  brand_id: string
  name: string
  sku?: string
  description?: string
  category?: string
  price: number
  stock_quantity: number
  low_stock_threshold: number
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  brand_id: string
  created_by: string
  customer_name?: string
  customer_phone?: string
  subtotal: number
  discount_amount: number
  total_amount: number
  commission_rate?: number
  commission_amount?: number
  payment_method: "cash" | "card" | "qr" | "transfer"
  status: "draft" | "paid" | "refunded"
  notes?: string
  created_at: string
  updated_at: string
  // joined
  brands?: Brand
  invoice_line_items?: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  product_id: string
  product_name: string
  product_sku?: string
  unit_price: number
  quantity: number
  line_total: number
  created_at: string
}

export interface BrandSales {
  id: string
  brand_id: string
  month: number
  year: number
  gross_sales: number
  invoice_count: number
  commission_rate?: number
  commission_amount?: number
  rent_waiver_percent?: number
  created_at: string
  updated_at: string
}

export interface BrandChangeRequest {
  id: string
  brand_id: string
  request_type: "product_add" | "product_update" | "brand_update"
  target_id?: string
  new_data: any
  status: "pending" | "approved" | "rejected" | "on_hold"
  admin_notes?: string
  created_at: string
  updated_at: string
  // joined
  brands?: Brand
}

export interface StockUpdateRequest {
  id: string
  brand_id: string
  product_id: string
  current_stock: number
  requested_stock: number
  change_amount: number
  reason?: string
  status: "pending" | "approved" | "rejected"
  admin_notes?: string
  created_at: string
  updated_at: string
  // joined
  brands?: Brand
  brand_products?: BrandProduct
}

// ============================================================
// Pricing Config
// ============================================================
export const SHELF_PRICING = {
  quarterly: { bottom: 1100, eye_level: 1500, top_level: 1350 },
  half_yearly: { bottom: 1000, eye_level: 1350, top_level: 1100 },
  yearly: { bottom: 900, eye_level: 1200, top_level: 1000 },
} as const

export const DURATION_MONTHS = {
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
} as const

export type ShelfType = "bottom" | "eye_level" | "top_level"
export type Duration = "quarterly" | "half_yearly" | "yearly"

export function calculateCommission(grossSales: number): {
  rate: number
  amount: number
  waiverPercent: number
  tierName: string
} {
  if (grossSales >= 100000) {
    return { rate: 10, amount: grossSales * 0.10, waiverPercent: 100, tierName: "Platinum" }
  } else if (grossSales >= 50000) {
    return { rate: 7, amount: grossSales * 0.07, waiverPercent: 50, tierName: "Gold" }
  } else if (grossSales >= 10000) {
    return { rate: 5, amount: grossSales * 0.05, waiverPercent: 0, tierName: "Silver" }
  }
  return { rate: 3, amount: grossSales * 0.03, waiverPercent: 0, tierName: "Starter" }
}
