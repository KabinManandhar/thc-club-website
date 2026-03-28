-- =============================================================================
-- THC CLUB • ECOSYSTEM UNIFIED DEPLOYMENT (v1.0 Alpha)
-- Consolidated for Supabase Production | Generated 2026
-- Includes: Base Schema, CRM, Payouts, Shelf System, and Platform Content
-- =============================================================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."decrement_stock_on_invoice_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE brand_products
  SET
    stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0),
    updated_at = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."decrement_stock_on_invoice_item"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invoice_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  seq INTEGER;
  invoice_no TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 2) AS INTEGER)), 0) + 1
  INTO seq
  FROM invoices
  WHERE invoice_number LIKE 'INV-%';

  invoice_no := 'INV-' || LPAD(seq::TEXT, 5, '0');
  RETURN invoice_no;
END;
$$;


ALTER FUNCTION "public"."generate_invoice_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_monthly_payouts"("p_month" integer, "p_year" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO payouts (brand_id, month, year, gross_sales, ppf_amount, net_payout, status)
  SELECT
    brand_id,
    p_month,
    p_year,
    SUM(gross_sales) as gross_sales,
    SUM(ppf_amount) as ppf_amount,
    SUM(gross_sales - COALESCE(ppf_amount, 0)) as net_payout,
    'pending'
  FROM brand_sales
  WHERE month = p_month AND year = p_year
  GROUP BY brand_id
  ON CONFLICT (brand_id, month, year) DO UPDATE SET
    gross_sales = EXCLUDED.gross_sales,
    ppf_amount  = EXCLUDED.ppf_amount,
    net_payout  = EXCLUDED.net_payout,
    updated_at  = NOW()
  WHERE payouts.status = 'pending';  -- Only update if not already paid
END;
$$;


ALTER FUNCTION "public"."generate_monthly_payouts"("p_month" integer, "p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_offer_uses"("offer_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE promotional_offers
  SET current_uses = current_uses + 1
  WHERE id = offer_id;
END;
$$;


ALTER FUNCTION "public"."increment_offer_uses"("offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_user"("p_email" "text", "p_password_hash" "text", "p_business_name" "text", "p_phone" "text", "p_description" "text", "p_social_handle" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM approved_users WHERE LOWER(email) = LOWER(p_email)) THEN
    RETURN jsonb_build_object('error', 'An account with this email already exists');
  END IF;

  INSERT INTO approved_users (email, password, business_name, is_active)
  VALUES (LOWER(p_email), p_password_hash, p_business_name, true)
  RETURNING id INTO v_user_id;

  INSERT INTO brands (user_id, email, business_name, phone, description, instagram_handle, onboarding_status)
  VALUES (v_user_id, LOWER(p_email), p_business_name, p_phone, p_description, p_social_handle, 'pending');

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id::TEXT);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."register_user"("p_email" "text", "p_password_hash" "text", "p_business_name" "text", "p_phone" "text", "p_description" "text", "p_social_handle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_login_time"("p_admin_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE admin_users SET last_login = NOW() WHERE id = p_admin_id;
END;
$$;


ALTER FUNCTION "public"."update_admin_login_time"("p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_brand_sales_on_invoice"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  sale_month INTEGER;
  sale_year INTEGER;
  new_gross NUMERIC(10,2);
  commission NUMERIC(5,2);
  waiver INTEGER;
BEGIN
  sale_month := EXTRACT(MONTH FROM NEW.created_at);
  sale_year  := EXTRACT(YEAR FROM NEW.created_at);

  -- Upsert into brand_sales
  INSERT INTO brand_sales (brand_id, month, year, gross_sales, invoice_count)
  VALUES (NEW.brand_id, sale_month, sale_year, NEW.total_amount, 1)
  ON CONFLICT (brand_id, month, year)
  DO UPDATE SET
    gross_sales   = brand_sales.gross_sales + NEW.total_amount,
    invoice_count = brand_sales.invoice_count + 1,
    updated_at    = NOW();

  -- Recalculate PPF and waiver dynamically
  SELECT gross_sales INTO new_gross
  FROM brand_sales
  WHERE brand_id = NEW.brand_id AND month = sale_month AND year = sale_year;

  -- Default to Starter tier
  commission := 3; waiver := 0;

  -- Find matching PPF tier based on sales volume
  BEGIN
    SELECT ppf_rate, rent_waiver_percent INTO commission, waiver
    FROM ppf_tiers
    WHERE min_sales_amount <= new_gross
    ORDER BY min_sales_amount DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- fallback if ppf_tiers isn't populated yet
  END;

  UPDATE brand_sales
  SET
    ppf_rate            = commission,
    ppf_amount          = ROUND(new_gross * commission / 100, 2),
    rent_waiver_percent = waiver
  WHERE brand_id = NEW.brand_id AND month = sale_month AND year = sale_year;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_brand_sales_on_invoice"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_login_time"("p_user_id" "uuid", "p_is_first_login" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF p_is_first_login THEN
    UPDATE approved_users SET last_login = NOW(), first_login = NOW() WHERE id = p_user_id;
  ELSE
    UPDATE approved_users SET last_login = NOW() WHERE id = p_user_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_user_login_time"("p_user_id" "uuid", "p_is_first_login" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_admin_login"("p_email" "text") RETURNS TABLE("id" "uuid", "email" "text", "password_hash" "text", "name" "text", "role" "text", "is_active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.email, a.password_hash, a.name, a.role, a.is_active
  FROM admin_users a
  WHERE LOWER(a.email) = LOWER(p_email) AND a.is_active = true;
END;
$$;


ALTER FUNCTION "public"."verify_admin_login"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_user_login"("p_email" "text") RETURNS TABLE("id" "uuid", "email" "text", "password" "text", "business_name" "text", "is_active" boolean, "first_login" timestamp with time zone, "last_login" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.password, u.business_name,
         u.is_active, u.first_login, u.last_login
  FROM approved_users u
  WHERE LOWER(u.email) = LOWER(p_email) AND u.is_active = true;
END;
$$;


ALTER FUNCTION "public"."verify_user_login"("p_email" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "admin_id" "uuid",
    "session_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text",
    "is_active" boolean DEFAULT true,
    "last_login" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_users_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approved_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "password" "text",
    "business_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "first_login" timestamp with time zone,
    "last_login" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."approved_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brand_change_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid",
    "request_type" "text" NOT NULL,
    "target_id" "uuid",
    "new_data" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "brand_change_requests_request_type_check" CHECK (("request_type" = ANY (ARRAY['product_add'::"text", 'product_update'::"text", 'brand_update'::"text"]))),
    CONSTRAINT "brand_change_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'on_hold'::"text"])))
);


ALTER TABLE "public"."brand_change_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brand_contracts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid",
    "file_url" "text" NOT NULL,
    "valid_from" "date",
    "valid_to" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."brand_contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brand_products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid",
    "name" "text" NOT NULL,
    "sku" "text",
    "description" "text",
    "category" "text",
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "stock_quantity" integer DEFAULT 0 NOT NULL,
    "low_stock_threshold" integer DEFAULT 5 NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."brand_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brand_sales" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid",
    "month" integer NOT NULL,
    "year" integer NOT NULL,
    "gross_sales" numeric(10,2) DEFAULT 0 NOT NULL,
    "invoice_count" integer DEFAULT 0 NOT NULL,
    "ppf_rate" numeric(5,2),
    "ppf_amount" numeric(10,2) DEFAULT 0,
    "rent_waiver_percent" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "brand_sales_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."brand_sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "business_name" "text" NOT NULL,
    "contact_name" "text",
    "email" "text" NOT NULL,
    "phone" "text",
    "description" "text",
    "logo_url" "text",
    "instagram_handle" "text",
    "onboarding_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_notes" "text",
    "last_interaction_at" timestamp with time zone,
    "bank_account_details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "brands_onboarding_status_check" CHECK (("onboarding_status" = ANY (ARRAY['pending'::"text", 'slot_selected'::"text", 'confirmed'::"text", 'active'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."brands" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enquiries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid",
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "admin_reply" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "enquiries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'resolved'::"text", 'new'::"text", 'in_progress'::"text", 'rejected'::"text", 'on_hold'::"text"])))
);


ALTER TABLE "public"."enquiries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_line_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_id" "uuid",
    "product_id" "uuid",
    "product_name" "text" NOT NULL,
    "product_sku" "text",
    "unit_price" numeric(10,2) NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "line_total" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoice_line_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_number" "text" NOT NULL,
    "brand_id" "uuid",
    "created_by" "text" NOT NULL,
    "customer_name" "text",
    "customer_phone" "text",
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "ppf_rate" numeric(5,2),
    "ppf_amount" numeric(10,2),
    "payment_method" "text" DEFAULT 'cash'::"text",
    "status" "text" DEFAULT 'paid'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invoices_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'card'::"text", 'qr'::"text", 'transfer'::"text"]))),
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'paid'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payouts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid",
    "month" integer,
    "year" integer,
    "gross_sales" numeric(10,2),
    "ppf_amount" numeric(10,2),
    "net_payout" numeric(10,2),
    "status" "text" DEFAULT 'pending'::"text",
    "admin_notes" "text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payouts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ppf_tiers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tier_name" "text" NOT NULL,
    "min_sales_amount" numeric(10,2) NOT NULL,
    "ppf_rate" numeric(5,2) NOT NULL,
    "rent_waiver_percent" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ppf_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promotional_offers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "target_limit" integer,
    "current_uses" integer DEFAULT 0 NOT NULL,
    "promo_code" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "promotional_offers_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"])))
);


ALTER TABLE "public"."promotional_offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shelf_bookings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid",
    "shelf_type" "text" NOT NULL,
    "duration" "text" NOT NULL,
    "slot_number" integer,
    "monthly_rent" numeric(10,2) NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_method" "text",
    "admin_notes" "text",
    "brand_agreement_accepted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "slot_id" "uuid",
    CONSTRAINT "shelf_bookings_duration_check" CHECK (("duration" = ANY (ARRAY['quarterly'::"text", 'half_yearly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "shelf_bookings_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['bank_transfer'::"text", 'qr_payment'::"text", 'cash'::"text", 'card'::"text", 'fonepay'::"text", 'khalti'::"text"]))),
    CONSTRAINT "shelf_bookings_shelf_type_check" CHECK (("shelf_type" = ANY (ARRAY['bottom'::"text", 'eye_level'::"text", 'top_level'::"text"]))),
    CONSTRAINT "shelf_bookings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'active'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."shelf_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shelf_pricing_tiers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "duration" "text" NOT NULL,
    "bottom_price" numeric(10,2) NOT NULL,
    "eye_level_price" numeric(10,2) NOT NULL,
    "top_level_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "shelf_pricing_tiers_duration_check" CHECK (("duration" = ANY (ARRAY['quarterly'::"text", 'half_yearly'::"text", 'yearly'::"text"])))
);


ALTER TABLE "public"."shelf_pricing_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shelf_sections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shelf_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shelf_slots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "shelf_id" "uuid",
    "brand_id" "uuid",
    "slot_number" integer NOT NULL,
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "shelf_type" "text" NOT NULL,
    "shelf_name" "text",
    "section" "text",
    "section_id" "uuid",
    "occupied_by" "text",
    "booking_id" "uuid",
    "rent_amount" numeric(10,2),
    "occupied_from" "date",
    "occupied_until" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "applied_promo_id" "uuid",
    CONSTRAINT "shelf_slots_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'occupied'::"text", 'maintenance'::"text"])))
);


ALTER TABLE "public"."shelf_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shelves" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "section_id" "uuid",
    "is_movable" boolean DEFAULT false NOT NULL,
    "size" "text",
    "shelf_type" "text",
    "total_slots" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "shelves_shelf_type_check" CHECK (("shelf_type" = ANY (ARRAY['bottom'::"text", 'eye_level'::"text", 'top_level'::"text", 'mixed'::"text"]))),
    CONSTRAINT "shelves_size_check" CHECK (("size" = ANY (ARRAY['small'::"text", 'medium'::"text", 'large'::"text"])))
);


ALTER TABLE "public"."shelves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_update_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid",
    "product_id" "uuid",
    "current_stock" integer NOT NULL,
    "requested_stock" integer NOT NULL,
    "change_amount" integer NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "stock_update_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."stock_update_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "session_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visit_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "company" "text",
    "visit_purpose" "text" NOT NULL,
    "preferred_date" "date" NOT NULL,
    "preferred_time" "text" NOT NULL,
    "number_of_visitors" integer DEFAULT 1 NOT NULL,
    "special_requirements" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "visit_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."visit_requests" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approved_users"
    ADD CONSTRAINT "approved_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."approved_users"
    ADD CONSTRAINT "approved_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_change_requests"
    ADD CONSTRAINT "brand_change_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_contracts"
    ADD CONSTRAINT "brand_contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_products"
    ADD CONSTRAINT "brand_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_sales"
    ADD CONSTRAINT "brand_sales_brand_id_month_year_key" UNIQUE ("brand_id", "month", "year");



ALTER TABLE ONLY "public"."brand_sales"
    ADD CONSTRAINT "brand_sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enquiries"
    ADD CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ppf_tiers"
    ADD CONSTRAINT "ppf_tiers_min_sales_amount_key" UNIQUE ("min_sales_amount");



ALTER TABLE ONLY "public"."ppf_tiers"
    ADD CONSTRAINT "ppf_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotional_offers"
    ADD CONSTRAINT "promotional_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotional_offers"
    ADD CONSTRAINT "promotional_offers_promo_code_key" UNIQUE ("promo_code");



ALTER TABLE ONLY "public"."shelf_bookings"
    ADD CONSTRAINT "shelf_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shelf_pricing_tiers"
    ADD CONSTRAINT "shelf_pricing_tiers_duration_key" UNIQUE ("duration");



ALTER TABLE ONLY "public"."shelf_pricing_tiers"
    ADD CONSTRAINT "shelf_pricing_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shelf_sections"
    ADD CONSTRAINT "shelf_sections_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."shelf_sections"
    ADD CONSTRAINT "shelf_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shelf_slots"
    ADD CONSTRAINT "shelf_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shelves"
    ADD CONSTRAINT "shelves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_update_requests"
    ADD CONSTRAINT "stock_update_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "u_brand_period" UNIQUE ("brand_id", "month", "year");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."visit_requests"
    ADD CONSTRAINT "visit_requests_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_brand_products_brand_id" ON "public"."brand_products" USING "btree" ("brand_id");



CREATE INDEX "idx_shelf_bookings_status" ON "public"."shelf_bookings" USING "btree" ("status");



CREATE INDEX "idx_shelf_slots_brand_id" ON "public"."shelf_slots" USING "btree" ("brand_id");



CREATE INDEX "idx_shelf_slots_shelf_id" ON "public"."shelf_slots" USING "btree" ("shelf_id");



CREATE OR REPLACE TRIGGER "trg_decrement_stock" AFTER INSERT ON "public"."invoice_line_items" FOR EACH ROW EXECUTE FUNCTION "public"."decrement_stock_on_invoice_item"();



CREATE OR REPLACE TRIGGER "trg_update_brand_sales" AFTER INSERT ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_brand_sales_on_invoice"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."admin_users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."approved_users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."brand_change_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."brand_contracts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."brand_products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."brand_sales" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."brands" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."enquiries" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."payouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."ppf_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."promotional_offers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."shelf_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."shelf_pricing_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."shelf_slots" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."shelves" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."stock_update_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."visit_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_change_requests"
    ADD CONSTRAINT "brand_change_requests_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_contracts"
    ADD CONSTRAINT "brand_contracts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");



ALTER TABLE ONLY "public"."brand_products"
    ADD CONSTRAINT "brand_products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_sales"
    ADD CONSTRAINT "brand_sales_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."approved_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enquiries"
    ADD CONSTRAINT "enquiries_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shelf_bookings"
    ADD CONSTRAINT "fk_shelf_bookings_slot" FOREIGN KEY ("slot_id") REFERENCES "public"."shelf_slots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."brand_products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");



ALTER TABLE ONLY "public"."shelf_bookings"
    ADD CONSTRAINT "shelf_bookings_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shelf_slots"
    ADD CONSTRAINT "shelf_slots_applied_promo_id_fkey" FOREIGN KEY ("applied_promo_id") REFERENCES "public"."promotional_offers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shelf_slots"
    ADD CONSTRAINT "shelf_slots_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shelf_slots"
    ADD CONSTRAINT "shelf_slots_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."shelf_sections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shelf_slots"
    ADD CONSTRAINT "shelf_slots_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "public"."shelves"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shelves"
    ADD CONSTRAINT "shelves_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."shelf_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_update_requests"
    ADD CONSTRAINT "stock_update_requests_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_update_requests"
    ADD CONSTRAINT "stock_update_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."brand_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."approved_users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."admin_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow_all" ON "public"."admin_sessions" USING (true);



CREATE POLICY "allow_all" ON "public"."brand_change_requests" USING (true);



CREATE POLICY "allow_all" ON "public"."brand_contracts" USING (true);



CREATE POLICY "allow_all" ON "public"."brand_products" USING (true);



CREATE POLICY "allow_all" ON "public"."brand_sales" USING (true);



CREATE POLICY "allow_all" ON "public"."brands" USING (true);



CREATE POLICY "allow_all" ON "public"."enquiries" USING (true);



CREATE POLICY "allow_all" ON "public"."invoice_line_items" USING (true);



CREATE POLICY "allow_all" ON "public"."invoices" USING (true);



CREATE POLICY "allow_all" ON "public"."payouts" USING (true);



CREATE POLICY "allow_all" ON "public"."ppf_tiers" USING (true);



CREATE POLICY "allow_all" ON "public"."promotional_offers" USING (true);



CREATE POLICY "allow_all" ON "public"."shelf_bookings" USING (true);



CREATE POLICY "allow_all" ON "public"."shelf_pricing_tiers" USING (true);



CREATE POLICY "allow_all" ON "public"."shelf_sections" USING (true);



CREATE POLICY "allow_all" ON "public"."shelf_slots" USING (true);



CREATE POLICY "allow_all" ON "public"."shelves" USING (true);



CREATE POLICY "allow_all" ON "public"."stock_update_requests" USING (true);



CREATE POLICY "allow_all" ON "public"."user_sessions" USING (true);



CREATE POLICY "allow_all" ON "public"."visit_requests" USING (true);



ALTER TABLE "public"."approved_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brand_change_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brand_contracts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brand_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brand_sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enquiries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_line_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "no_direct_access" ON "public"."admin_users" USING (false);



CREATE POLICY "no_direct_access" ON "public"."approved_users" USING (false);



ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ppf_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promotional_offers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shelf_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shelf_pricing_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shelf_sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shelf_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shelves" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_update_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."visit_requests" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."decrement_stock_on_invoice_item"() TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_stock_on_invoice_item"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_stock_on_invoice_item"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invoice_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_monthly_payouts"("p_month" integer, "p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_monthly_payouts"("p_month" integer, "p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_monthly_payouts"("p_month" integer, "p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_offer_uses"("offer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_offer_uses"("offer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_offer_uses"("offer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."register_user"("p_email" "text", "p_password_hash" "text", "p_business_name" "text", "p_phone" "text", "p_description" "text", "p_social_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_user"("p_email" "text", "p_password_hash" "text", "p_business_name" "text", "p_phone" "text", "p_description" "text", "p_social_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_user"("p_email" "text", "p_password_hash" "text", "p_business_name" "text", "p_phone" "text", "p_description" "text", "p_social_handle" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_admin_login_time"("p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_admin_login_time"("p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_login_time"("p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_brand_sales_on_invoice"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_brand_sales_on_invoice"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_brand_sales_on_invoice"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_login_time"("p_user_id" "uuid", "p_is_first_login" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_login_time"("p_user_id" "uuid", "p_is_first_login" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_login_time"("p_user_id" "uuid", "p_is_first_login" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_admin_login"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_admin_login"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_admin_login"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_user_login"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_user_login"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_user_login"("p_email" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."admin_sessions" TO "anon";
GRANT ALL ON TABLE "public"."admin_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."approved_users" TO "anon";
GRANT ALL ON TABLE "public"."approved_users" TO "authenticated";
GRANT ALL ON TABLE "public"."approved_users" TO "service_role";



GRANT ALL ON TABLE "public"."brand_change_requests" TO "anon";
GRANT ALL ON TABLE "public"."brand_change_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_change_requests" TO "service_role";



GRANT ALL ON TABLE "public"."brand_contracts" TO "anon";
GRANT ALL ON TABLE "public"."brand_contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_contracts" TO "service_role";



GRANT ALL ON TABLE "public"."brand_products" TO "anon";
GRANT ALL ON TABLE "public"."brand_products" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_products" TO "service_role";



GRANT ALL ON TABLE "public"."brand_sales" TO "anon";
GRANT ALL ON TABLE "public"."brand_sales" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_sales" TO "service_role";



GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";



GRANT ALL ON TABLE "public"."enquiries" TO "anon";
GRANT ALL ON TABLE "public"."enquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."enquiries" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_line_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_line_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_line_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."payouts" TO "anon";
GRANT ALL ON TABLE "public"."payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."payouts" TO "service_role";



GRANT ALL ON TABLE "public"."ppf_tiers" TO "anon";
GRANT ALL ON TABLE "public"."ppf_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."ppf_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."promotional_offers" TO "anon";
GRANT ALL ON TABLE "public"."promotional_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."promotional_offers" TO "service_role";



GRANT ALL ON TABLE "public"."shelf_bookings" TO "anon";
GRANT ALL ON TABLE "public"."shelf_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."shelf_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."shelf_pricing_tiers" TO "anon";
GRANT ALL ON TABLE "public"."shelf_pricing_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."shelf_pricing_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."shelf_sections" TO "anon";
GRANT ALL ON TABLE "public"."shelf_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."shelf_sections" TO "service_role";



GRANT ALL ON TABLE "public"."shelf_slots" TO "anon";
GRANT ALL ON TABLE "public"."shelf_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."shelf_slots" TO "service_role";



GRANT ALL ON TABLE "public"."shelves" TO "anon";
GRANT ALL ON TABLE "public"."shelves" TO "authenticated";
GRANT ALL ON TABLE "public"."shelves" TO "service_role";



GRANT ALL ON TABLE "public"."stock_update_requests" TO "anon";
GRANT ALL ON TABLE "public"."stock_update_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_update_requests" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."visit_requests" TO "anon";
GRANT ALL ON TABLE "public"."visit_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."visit_requests" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































-- ============================================================
-- THC CLUB • SUPPLEMENTARY MIGRATIONS (V2 TIERED & SECURITY)
-- ============================================================

-- 1. ADMIN USER INJECTION (BCRYPT)
INSERT INTO public.admin_users (email, password_hash, name, role, is_active)
VALUES ('admin@theclub.com', '$2a$10$v9BqS.iJX98V18oVMkm/xu0BGenDZJGaY7g6hLgMhGIp9C.zOUXwC', 'Club Admin', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 2. SHELF BOOKINGS - TIERED COLUMNS
ALTER TABLE public.shelf_bookings ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.shelf_bookings ADD COLUMN IF NOT EXISTS section_tier TEXT DEFAULT 'regular';

-- 3. UPGRADE SECTIONS (Add Tiering)
ALTER TABLE public.shelf_sections 
ADD COLUMN IF NOT EXISTS section_tier TEXT DEFAULT 'regular' 
CHECK (section_tier IN ('premium', 'regular'));

UPDATE public.shelf_sections SET section_tier = 'premium' WHERE name = 'Cafe Section';
UPDATE public.shelf_sections SET section_tier = 'regular' WHERE name IN ('Room One', 'Room Two', 'Corridor Wall');

-- 4. UPGRADE PRICING (Make Tier-Aware)
ALTER TABLE public.shelf_pricing_tiers DROP CONSTRAINT IF EXISTS shelf_pricing_tiers_duration_key;
ALTER TABLE public.shelf_pricing_tiers ADD COLUMN IF NOT EXISTS section_tier TEXT DEFAULT 'regular';
ALTER TABLE public.shelf_pricing_tiers ADD CONSTRAINT uniq_duration_tier UNIQUE (duration, section_tier);

-- 5. THE "SMART PRICE" CALCULATOR
CREATE OR REPLACE FUNCTION get_dynamic_price(p_shelf_id UUID, p_duration TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_tier TEXT;
    v_type TEXT;
    v_price NUMERIC;
BEGIN
    SELECT s.section_tier, sh.shelf_type INTO v_tier, v_type
    FROM shelves sh 
    JOIN shelf_sections s ON sh.section_id = s.id 
    WHERE sh.id = p_shelf_id;

    SELECT 
        CASE 
            WHEN v_type = 'bottom' THEN bottom_price
            WHEN v_type = 'eye_level' THEN eye_level_price
            WHEN v_type = 'top_level' THEN top_level_price
            ELSE eye_level_price
        END INTO v_price
    FROM shelf_pricing_tiers
    WHERE duration = p_duration AND section_tier = v_tier;

    RETURN v_price;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. THE OFFER REPAIR (Automatic Counter)
CREATE OR REPLACE FUNCTION public.apply_slot_offer(p_slot_id UUID, p_offer_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.shelf_slots SET applied_promo_id = p_offer_id WHERE id = p_slot_id;
    UPDATE public.promotional_offers SET current_uses = current_uses + 1 WHERE id = p_offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. SECTION & PRICING SEED
INSERT INTO public.shelf_pricing_tiers (duration, section_tier, bottom_price, eye_level_price, top_level_price)
VALUES
  ('quarterly',   'regular', 1100, 1500, 1350),
  ('half_yearly', 'regular', 1000, 1350, 1100),
  ('yearly',       'regular', 900, 1200, 1000),
  ('quarterly',   'premium', 1600, 2200, 1900),
  ('half_yearly', 'premium', 1500, 2000, 1750),
  ('yearly',       'premium', 1350, 1800, 1600)
ON CONFLICT (duration, section_tier) DO UPDATE SET
  bottom_price = EXCLUDED.bottom_price,
  eye_level_price = EXCLUDED.eye_level_price,
  top_level_price = EXCLUDED.top_level_price;

-- 8. PPF & PROMO DATA
INSERT INTO public.ppf_tiers (tier_name, min_sales_amount, ppf_rate, rent_waiver_percent)
VALUES
  ('Starter',    0,      3,   0),
  ('Silver',     10000,  5,   0),
  ('Gold',       50000,  7,   50),
  ('Platinum',   100000, 10,  100)
ON CONFLICT (min_sales_amount) DO NOTHING;

INSERT INTO public.promotional_offers (name, promo_code, discount_type, discount_value, target_limit, current_uses, is_active)
VALUES
  ('Welcome Collective', 'THC2026', 'percentage', 10, 50, 0, true),
  ('Founder Special',    'MARCH15', 'fixed', 1500, 20, 0, true)
ON CONFLICT (promo_code) DO NOTHING;

-- 9. SHELF & SLOT AUTO-SEED
DO $$
DECLARE
    section_cafe_id UUID;
    section_room1_id UUID;
    section_room2_id UUID;
    section_corridor_id UUID;
    v_shelf_record RECORD;
    i INTEGER;
BEGIN
    SELECT id INTO section_cafe_id FROM shelf_sections WHERE name = 'Cafe Section';
    SELECT id INTO section_room1_id FROM shelf_sections WHERE name = 'Room One';
    SELECT id INTO section_room2_id FROM shelf_sections WHERE name = 'Room Two';
    SELECT id INTO section_corridor_id FROM shelf_sections WHERE name = 'Corridor Wall';

    INSERT INTO shelves (name, section_id, total_slots, shelf_type) VALUES
    ('Shelf 1', section_cafe_id, 6, 'mixed'),
    ('Shelf 2', section_cafe_id, 6, 'mixed'),
    ('Shelf 3', section_room1_id, 6, 'mixed'),
    ('Shelf 4', section_room2_id, 6, 'mixed'),
    ('Wall Shelf 1', section_corridor_id, 4, 'eye_level')
    ON CONFLICT DO NOTHING;

    FOR v_shelf_record IN (SELECT id, total_slots, shelf_type FROM shelves)
    LOOP
        FOR i IN 1..v_shelf_record.total_slots
        LOOP
            INSERT INTO shelf_slots (shelf_id, slot_number, shelf_type, status)
            VALUES (
                v_shelf_record.id, 
                ((SELECT COALESCE(MAX(slot_number), 0) FROM shelf_slots) + 1), 
                CASE 
                    WHEN v_shelf_record.shelf_type = 'mixed' THEN 
                        CASE WHEN i <= 2 THEN 'eye_level' WHEN i <= 4 THEN 'top_level' ELSE 'bottom' END
                    ELSE v_shelf_record.shelf_type
                END,
                'available'
            ) ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;

-- REFRESH MATERIALIZED VIEW IF EXISTS public.brand_sales;
NOTIFY pgrst, 'reload schema';
-- =============================================================================
-- THC Club: Editable Content Management
-- Table to store terms & conditions, FAQs, and contract templates
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_content (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  contract_template TEXT,
  terms_conditions TEXT,
  faqs JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Insert default row
INSERT INTO platform_content (id, contract_template, terms_conditions, faqs)
VALUES (
  1,
  'BRAND PARTNERSHIP AGREEMENT
The Hidden Collective Club (THC Club)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THIS PARTNERSHIP AGREEMENT ("Agreement") is entered into as of the date of digital acceptance between:
THE HIDDEN COLLECTIVE CLUB
Kathmandu, Nepal
(hereinafter "THC Club")
AND
{{BRAND_NAME}}
Email: {{BRAND_EMAIL}}
Phone: {{BRAND_PHONE}}
(hereinafter "Brand Partner")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SHELF ALLOTMENT & PLACEMENT
   The Brand Partner acknowledges that specific shelf slot assignment is determined exclusively by THC Club.

2. FINANCIAL TERMS
   2.1 One-Time Registration Fee: NPR 800.
   2.2 Monthly Shelf Rent: As per the selected zone tier.
   2.3 Platform Partnership Fee (PPF): Performance-based fee of 3%-10%.
   2.4 Payments are settled in-person.

3. PERFORMANCE & CONDUCT
   Brand Partners must maintain minimum stock levels and submit products for approval.

4. EXCLUSIVITY & BRAND STANDARDS
   Products must be original. Counterfeit goods are strictly prohibited.

5. TERMINATION
   30 days written notice for termination.

6. GOVERNING LAW
   This Agreement shall be governed by the laws of Nepal.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BY DIGITALLY SIGNING THIS AGREEMENT, BOTH PARTIES CONFIRM THEY HAVE READ, UNDERSTOOD, AND AGREE TO THE TERMS AND CONDITIONS ABOVE.',
  '# The Hidden Collective terms and conditions
Welcome to THC Club. By registering as a Brand Partner you agree to our policies.',
  '[]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Policies
ALTER TABLE platform_content ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read it
DROP POLICY IF EXISTS "Anyone can read content" ON platform_content;
CREATE POLICY "Anyone can read content" ON platform_content
  FOR SELECT USING (true);

-- Only admins can update
DROP POLICY IF EXISTS "Admins can update content" ON platform_content;
CREATE POLICY "Admins can update content" ON platform_content
  FOR UPDATE USING (
    (SELECT role FROM admin_users WHERE email = auth.email()) IN ('super_admin', 'manager')
  );

NOTIFY pgrst, 'reload schema';
-- =============================================================================
-- THC Club: Payment Tracking & Admin CRM Fixes
-- Run this migration in your Supabase SQL Editor
-- =============================================================================

-- 1. Create table for tracking individual installment/payment transactions
CREATE TABLE IF NOT EXISTS shelf_booking_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES shelf_bookings(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    amount_paid NUMERIC NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT now(),
    payment_method TEXT DEFAULT 'in_person' CHECK (payment_method IN ('in_person', 'bank_transfer', 'qr_scan', 'other')),
    notes TEXT,
    confirmed_by TEXT, -- Admin name who confirmed it
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add summary columns to shelf_bookings
ALTER TABLE shelf_bookings 
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- 3. Create or replace RPC to allow Admins (who use custom auth) to update brand CRM notes.
-- Bypasses RLS utilizing SECURITY DEFINER.
CREATE OR REPLACE FUNCTION admin_update_brand_crm(
    p_brand_id UUID,
    p_admin_notes TEXT DEFAULT NULL,
    p_onboarding_status TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE brands 
  SET 
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    onboarding_status = COALESCE(p_onboarding_status, onboarding_status),
    updated_at = now()
  WHERE id = p_brand_id;
END;
$$;

-- 4. Set clear RLS for the payments table
ALTER TABLE shelf_booking_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands view their own payments" ON shelf_booking_payments;
CREATE POLICY "brands view their own payments"
  ON shelf_booking_payments FOR SELECT
  USING (
    brand_id IN (SELECT id FROM brands WHERE email = auth.email())
  );

DROP POLICY IF EXISTS "public insert payments" ON shelf_booking_payments;
CREATE POLICY "public insert payments" ON shelf_booking_payments FOR ALL USING (true); -- Since admins need to insert/read without formal Supabase Auth.

NOTIFY pgrst, 'reload schema';
-- =============================================================================
-- THC Club: Monthly Settlements & Payouts Architecture
-- =============================================================================

CREATE TABLE IF NOT EXISTS brand_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    period_year INT NOT NULL,
    period_month INT NOT NULL, -- 1-12
    total_sales NUMERIC DEFAULT 0,
    ppf_deduction NUMERIC DEFAULT 0,
    net_payout NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid')),
    paid_at TIMESTAMPTZ,
    bank_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(brand_id, period_year, period_month)
);

ALTER TABLE brand_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands view own settlements" ON brand_settlements;
CREATE POLICY "brands view own settlements"
  ON brand_settlements FOR SELECT
  USING (brand_id IN (SELECT id FROM brands WHERE email = auth.email()));

-- Admin read/write policies (accessible via custom unauthed route for admins or via anon if open, 
-- but we usually enforce true for internal tools relying on Next.js/RPC checks).
DROP POLICY IF EXISTS "public read/write settlements" ON brand_settlements;
CREATE POLICY "public read/write settlements" ON brand_settlements FOR ALL USING (true);


-- Helper RPC function to automatically sync or upsert a settlement record from invoices
CREATE OR REPLACE FUNCTION generate_monthly_settlement(p_brand_id UUID, p_year INT, p_month INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gross NUMERIC;
  v_ppf NUMERIC;
BEGIN
  -- Sum up paid invoices for that month
  SELECT COALESCE(SUM(total_amount), 0), COALESCE(SUM(ppf_amount), 0)
  INTO v_gross, v_ppf
  FROM invoices
  WHERE brand_id = p_brand_id
    AND status = 'paid'
    AND EXTRACT(YEAR FROM created_at) = p_year
    AND EXTRACT(MONTH FROM created_at) = p_month;

  -- Upsert
  INSERT INTO brand_settlements (brand_id, period_year, period_month, total_sales, ppf_deduction, net_payout, status)
  VALUES (p_brand_id, p_year, p_month, v_gross, v_ppf, (v_gross - v_ppf), 'pending')
  ON CONFLICT (brand_id, period_year, period_month)
  DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    ppf_deduction = EXCLUDED.ppf_deduction,
    net_payout = EXCLUDED.net_payout,
    updated_at = now()
  WHERE brand_settlements.status = 'pending'; -- do not recalculate if already paid/processing
END;
$$;

NOTIFY pgrst, 'reload schema';
-- =============================================================================
-- THC Club: Contract System & Brand Contract Table Migration
-- Run this on your Supabase SQL editor to add e-signature fields
-- =============================================================================

-- 1. Add new e-signature fields to brand_contracts table
ALTER TABLE brand_contracts
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'signed', 'active', 'expired')),
  ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'partnership_v1',
  ADD COLUMN IF NOT EXISTS signed_by TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stamp_number TEXT,
  ADD COLUMN IF NOT EXISTS ip_note TEXT;

-- 2. Add index for faster brand contract lookups
CREATE INDEX IF NOT EXISTS idx_brand_contracts_brand_id ON brand_contracts(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_contracts_status ON brand_contracts(status);

-- 3. Make file_url nullable (digital contracts don't need a file)
ALTER TABLE brand_contracts ALTER COLUMN file_url DROP NOT NULL;

-- 4. Add signed_by and stamp fields to brand_contracts per brand readable note
COMMENT ON COLUMN brand_contracts.signed_by IS 'Full legal name of the authorized signatory';
COMMENT ON COLUMN brand_contracts.stamp_number IS 'Optional company stamp or registration number';
COMMENT ON COLUMN brand_contracts.ip_note IS 'Audit trail note (e.g. signed via portal)';
COMMENT ON COLUMN brand_contracts.contract_type IS 'Version/type of the contract template used';

-- 5. RLS: Brands can view their own contracts, admins see all
ALTER TABLE brand_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_view_own_contracts" ON brand_contracts;
CREATE POLICY "brands_view_own_contracts"
  ON brand_contracts FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE email = auth.email()
    )
  );

DROP POLICY IF EXISTS "brands_insert_own_contracts" ON brand_contracts;
CREATE POLICY "brands_insert_own_contracts"
  ON brand_contracts FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brands WHERE email = auth.email()
    )
  );

DROP POLICY IF EXISTS "brands_update_own_unsigned_contracts" ON brand_contracts;
CREATE POLICY "brands_update_own_unsigned_contracts"
  ON brand_contracts FOR UPDATE
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE email = auth.email()
    )
    AND status IN ('pending', 'signed')
  );

-- 6. Admin service-role bypass (service_role bypasses RLS automatically)
-- No extra policy needed if using service_role key in admin actions.

SELECT 'Contract system migration complete.' AS result;
-- =============================================================================
-- THC Club: Add Zone Tracking columns to shelf_bookings
-- Run this on your Supabase SQL editor to add the missing columns
-- =============================================================================

ALTER TABLE shelf_bookings
  ADD COLUMN IF NOT EXISTS section TEXT,
  ADD COLUMN IF NOT EXISTS section_tier TEXT;

-- Reload PostgREST schema cache so the API recognizes the new columns immediately
NOTIFY pgrst, 'reload schema';
-- Ensure schema is fully extended for narrative, protocols, and tracking
ALTER TABLE platform_content ADD COLUMN IF NOT EXISTS protocols JSONB DEFAULT '[]'::jsonb;
ALTER TABLE platform_content ADD COLUMN IF NOT EXISTS origins TEXT;

-- (Intermediate narrative update removed in favor of consolidated final refresh below)

-- ============================================================
-- THC CLUB • ECONOMICS & PRICING SEED (V2 TIERED)
-- ============================================================

-- 1. INITIALIZE SECTION TIERS
------------------------------------------------------------
-- Premium: High visibility, high footfall (Cafe)
-- Regular: Specialized zones, rooms, and corridors
UPDATE public.shelf_sections SET section_tier = 'premium' WHERE name = 'Cafe Section';
UPDATE public.shelf_sections SET section_tier = 'regular' WHERE name IN ('Room One', 'Room Two', 'Corridor Wall');

-- 2. LAYERED SHELF PRICING (NPR/mo)
------------------------------------------------------------
-- REGULAR ZONES (Standard pricing)
INSERT INTO public.shelf_pricing_tiers (duration, section_tier, bottom_price, eye_level_price, top_level_price)
VALUES
  ('quarterly',   'regular', 1100, 1500, 1350),
  ('half_yearly', 'regular', 1000, 1350, 1100),
  ('yearly',       'regular', 900, 1200, 1000)
ON CONFLICT (duration, section_tier) DO UPDATE SET
  bottom_price = EXCLUDED.bottom_price,
  eye_level_price = EXCLUDED.eye_level_price,
  top_level_price = EXCLUDED.top_level_price;

-- PREMIUM ZONES (Higher visibility, ~30-40% premium)
INSERT INTO public.shelf_pricing_tiers (duration, section_tier, bottom_price, eye_level_price, top_level_price)
VALUES
  ('quarterly',   'premium', 1600, 2200, 1900),
  ('half_yearly', 'premium', 1500, 2000, 1750),
  ('yearly',       'premium', 1350, 1800, 1600)
ON CONFLICT (duration, section_tier) DO UPDATE SET
  bottom_price = EXCLUDED.bottom_price,
  eye_level_price = EXCLUDED.eye_level_price,
  top_level_price = EXCLUDED.top_level_price;

-- 3. PLATFORM PARTNERSHIP FEES (PPF)
------------------------------------------------------------
INSERT INTO public.ppf_tiers (tier_name, min_sales_amount, ppf_rate, rent_waiver_percent)
VALUES
  ('Starter',    0,      3,   0),   -- 0-10k: 3% Fee, No Waiver
  ('Silver',     10000,  5,   0),   -- 10-50k: 5% Fee, No Waiver
  ('Gold',       50000,  7,   50),  -- 50-100k: 7% Fee, 50% Rent Waiver
  ('Platinum',   100000, 10,  100)  -- 100k+: 10% Fee, 100% Rent Waiver
ON CONFLICT (min_sales_amount) DO NOTHING;

-- 4. INITIAL PROMOTIONS
------------------------------------------------------------
INSERT INTO public.promotional_offers (name, promo_code, discount_type, discount_value, target_limit, current_uses, is_active)
VALUES
  ('Welcome Collective', 'THC2026', 'percentage', 10, 50, 0, true),
  ('Founder Special',    'MARCH15', 'fixed', 1500, 20, 0, true)
ON CONFLICT (promo_code) DO NOTHING;

-- REFRESH
NOTIFY pgrst, 'reload schema';
-- =============================================================================
-- THC CLUB • FINAL PLATFORM CONTENT CONSOLIDATION
-- =============================================================================
UPDATE platform_content 
SET 
  origins = '# our origins

this didn’t start as an idea. it started as frustration.

before thc club, we were on the other side of the counter—trying to sell our own products.
what we found was simple: visibility wasn’t earned, it was taxed.

most stores asked for 20% to 35% commission.
at that point, they weren’t just a platform—they were silent partners without the risk, without the paperwork.

we tried a different approach.
we asked for something smaller. a fixed space. lower commission. room to experiment.

no one agreed.

so we stopped asking.

kathmandu is full of creators building genuinely great products—out of bedrooms, small kitchens, late nights.
but getting discovered? that’s a different game entirely. expensive shelves, algorithm dependency, or both.

that gap—between creating and being seen—is where most brands die.

the hidden collective club was built to close that gap.

not by taking a bigger cut, but by changing the model entirely.

we offer space, visibility, shared footfall, and real-world presence—without turning creators into margin for someone else.

you bring the product.
we make sure it gets seen.

simple.',

  protocols = '[
    {
      "title": "01. economics",
      "items": [
        "a one-time registration fee of rs. 800 covers identity onboarding and physical slot setup.",
        "shelf rent is fixed based on your selected tier (low, eye, or top) and commitment period (quarterly, half-yearly, or yearly).",
        "performance-based processing fees range from 3% to 10% based on monthly sales volume.",
        "high-performance brands (rs. 50k+ sales) qualify for 50% to 100% rent waivers for that month."
      ]
    },
    {
      "title": "02. payouts & data",
      "items": [
        "payouts are currently processed monthly, with goals to implement bill-based cycles as the collective scales.",
        "sales data and footfall insights will be provided via the brand dashboard as we refine our tracking systems.",
        "brands taking multiple shelves are eligible for custom fruitfull collaboration discounts."
      ]
    },
    {
      "title": "03. physical space",
      "items": [
        "location: bijeshwori, swyambhu. the club spans 3 rooms with 108 curated shelf spaces.",
        "shelf maintenance: brands must refresh stock at least once every 21 days to ensure the collective vibe remains fresh.",
        "cross-selling: brands acknowledge and benefit from footfall generated by sayummys cafe visitors.",
        "merchandising: we work together on placement and shelf design to optimize for customer behavior."
      ]
    },
    {
      "title": "04. liability & legal",
      "items": [
        "shopwear: given the high-traffic cafe environment, the club is not liable for minor damages from customer handling.",
        "curation: we gatekeep energy, not money. the club reserves the right to curate and select brands that fit the \"cool stuff\" mission.",
        "jurisdiction: this partnership and all digital/physical interactions are governed by the laws of kathmandu, nepal."
      ]
    }
  ]'::jsonb,

  terms_conditions = 'THE HIDDEN COLLECTIVE CLUB (THC CLUB)
PARTNERSHIP TERMS & CONDITIONS
v1.0 • Effective 2026

1. REGISTRATION & ONBOARDING
1.1 A one-time registration fee of NPR 800 is required upon acceptance into the collective.
1.2 This fee covers digital identity verification, administrative onboarding, and the physical preparation of the allotted shelf space. 
1.3 Acceptance is at the sole discretion of the THC Club curation team, focusing on brand alignment and product quality.

2. SHELF RENTAL & PLACEMENT
2.1 Monthly rent is determined by the selected tier (Top, Eye, or Low level) and the commitment cycle (Quarterly, Half-Yearly, or Yearly).
2.2 Specific shelf slot assignments within a selected tier are determined by THC Club to ensure optimal collective merchandising.
2.3 Rent is payable in advance according to the agreed payment schedule (Bank Transfer, QR, or Cash).

3. PERFORMANCE-BASED PROCESSING FEES (PPF)
3.1 In addition to rent, a performance-based processing fee (PPF) ranging from 3% to 10% of gross sales is applied.
3.2 High-performance incentive: Brands achieving gross monthly sales of NPR 50,000 or more are eligible for the Rent Waiver program, where a portion or all of the following month s rent may be waived.

4. PAYOUTS & FINANCIAL RECONCILIATION
4.1 Sales are tracked through the THC Club POS system.
4.2 Payouts of net sales (Gross Sales minus PPF and any outstanding fees) are currently processed on a monthly cycle.
4.3 Brands can monitor real-time sales estimates via the THC Club Brand Portal.

5. PHYSICAL SPACE & MAINTENANCE
5.1 Brands are responsible for maintaining their stock levels. A minimum stock refresh is required at least once every 21 days.
5.2 THC Club provides the shared footfall and physical visibility, including exposure from neighboring Sayummys Cafe.
5.3 Brands must adhere to the merchandising standards of the collective.

6. LIABILITY & LIMITATIONS
6.1 In the event of minor damage or wear caused by customer handling (shopwear), THC Club shall not be held liable, given the high-traffic nature of the environment.
6.2 THC Club reserves the right to re-curate or terminate partnerships if brand standards are not maintained, with a 30-day notice period.

7. LEGAL JURISDICTION
7.1 This partnership is governed by the laws of Kathmandu, Nepal.
7.2 Digital acceptance of these terms constitutes a binding agreement between the Brand Partner and The Hidden Collective Club.',

  faqs = '[
    {
      "question": "why do you charge both rent and a processing fee?",
      "answer": "to keep entry costs low while sharing the upside. traditional models take 35% commission regardless. we provide a fixed space for visibility, and our performance fee only scales if your sales do. it ensures we are both invested in your brand s success."
    },
    {
      "question": "how often should i refresh my stock?",
      "answer": "we recommend a refresh at least once every 21 days. this keeps the collective vibe fresh for our regulars and ensures your display always looks its best. you can coordinate stock drops directly through your dashboard."
    },
    {
      "question": "what is the rent waiver program?",
      "answer": "we reward high-performing brands. if your monthly sales cross rs. 50,000, we waive 50% to 100% of your next month s rent. it s our way of saying keep up the great work."
    },
    {
      "question": "what does the registration fee cover?",
      "answer": "the one-time rs. 800 fee covers your digital onboarding, physical shelf setup, and initial identity verification. it ensures every brand in the collective meets our curation standards."
    },
    {
      "question": "how are payouts handled?",
      "answer": "currently, payouts are processed monthly. you can track your estimated net payout in real-time via the payouts tab in your dashboard."
    }
  ]'::jsonb,
  updated_at = now()
WHERE id = 1;

NOTIFY pgrst, 'reload schema';

