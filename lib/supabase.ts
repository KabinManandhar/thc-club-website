import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================
// Existing Types
// ============================================================
export interface PlatformContent {
  id: number
  contract_template: string
  terms_conditions: string
  origins: string
  faqs: any[]
  protocols: any[]
  updated_at: string
  updated_by?: string
}


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

export interface ShelfSection {
  id: string
  name: string
  description?: string
  section_tier: "premium" | "regular"
  created_at: string
  updated_at: string
}

export interface Shelf {
  id: string
  name: string
  section_id?: string
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
  section_id?: string
  shelf_name?: string
  shelf_id?: string
  brand_id?: string | null
  status: "available" | "occupied" | "maintenance"
  occupied_by?: string | null
  booking_id?: string | null
  rent_amount?: number | null
  occupied_from?: string | null
  occupied_until?: string | null
  notes?: string
  applied_promo_id?: string | null
  created_at: string
  updated_at: string
  // joined
  shelves?: Shelf
  brands?: Brand
  promotional_offers?: PromotionalOffer
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
  is_active: boolean
  last_interaction_at?: string
  total_stock_value?: number
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
  // Digital e-signature fields
  status?: "pending" | "signed" | "active" | "expired"
  contract_type?: string
  signed_by?: string
  signed_at?: string
  stamp_number?: string
  ip_note?: string
}

export interface ShelfBooking {
  id: string
  brand_id: string
  slot_id?: string
  shelf_type: "bottom" | "eye_level" | "top_level"
  duration: "quarterly" | "half_yearly" | "yearly"
  slot_number?: number
  section?: string
  section_tier?: "premium" | "regular"
  monthly_rent: number
  total_amount: number
  start_date?: string
  end_date?: string
  status: "pending" | "approved" | "rejected" | "active" | "expired"
  bundle_id?: string
  original_total?: number
  discount_percentage?: number
  admin_notes?: string
  brand_agreement_accepted: boolean
  payment_status?: "pending" | "partial" | "paid"
  amount_paid?: number
  payment_method?: "bank_transfer" | "qr_payment" | "cash" | "card" | "other"
  created_at: string
  updated_at: string
  // joined
  brands?: Brand
  shelf_bundles?: ShelfBundle
}

export interface ShelfBookingPayment {
  id: string
  booking_id: string
  brand_id: string
  amount_paid: number
  payment_date: string
  payment_method: string
  notes?: string
  confirmed_by?: string
  created_at: string
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
  ppf_rate?: number
  ppf_amount?: number
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
  ppf_rate?: number
  ppf_amount?: number
  rent_waiver_percent?: number
  created_at: string
  updated_at: string
}

export interface BrandSettlement {
  id: string
  brand_id: string
  period_year: number
  period_month: number
  total_sales: number
  ppf_deduction: number
  net_payout: number
  status: "pending" | "processing" | "paid"
  paid_at?: string
  bank_reference?: string
  admin_notes?: string
  created_at: string
  updated_at: string
}

export interface BrandChangeRequest {
  id: string
  brand_id: string
  request_type: "product_add" | "product_update" | "brand_update" | "profile_update"
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

export interface ShelfPricingTier {
  id: string
  duration: "quarterly" | "half_yearly" | "yearly"
  section_tier: "premium" | "regular"
  bottom_price: number
  eye_level_price: number
  top_level_price: number
}

export interface Expense {
  id: string
  date: string
  amount: number
  category: string
  description: string
  recorded_by?: string
  created_at: string
}

export interface PPFTier {
  id: string
  tier_name: string
  min_sales_amount: number
  ppf_rate: number
  rent_waiver_percent: number
}

export interface PromotionalOffer {
  id: string
  name: string
  description?: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  target_limit?: number
  current_uses: number
  promo_code?: string
  is_active: boolean
}

export const DURATION_MONTHS = {
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
} as const

export type ShelfType = "bottom" | "eye_level" | "top_level"
export type Duration = "quarterly" | "half_yearly" | "yearly"

export interface StoreImage {
  id: string
  url: string
  section: string
  shelf?: string
  alt_text?: string
  metadata?: any
  created_at: string
}

export interface ShelfBundle {
  id: string
  name: string
  description?: string
  price: number
  original_total?: number
  discount_percentage?: number
  marketValue?: number
  is_active: boolean
  created_at: string
}

export interface ShelfBundleItem {
  bundle_id: string
  slot_id: string
}
