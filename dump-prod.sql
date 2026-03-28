


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































