# OTP Verification Implementation Plan

We have integrated 6-digit OTP verification into the brand signup flow using Supabase Auth and the Resend SMTP settings you configured.

## Changes Made

### 1. Database Schema
Created two migration scripts to handle verification status and data synchronization:
- `scripts/otp-verification-migration.sql`: Adds `is_verified` and `email_verified_at` columns to the `brands` and `approved_users` tables.
- `scripts/auth-sync-trigger.sql`: Implements a PostgreSQL trigger that automatically syncs users from Supabase Auth (`auth.users`) to your custom `brands` and `approved_users` tables, including metadata like business name and phone number.

### 2. Authentication Logic (`lib/user-auth.ts`)
- Replaced the custom `register_user` RPC signup with `supabase.auth.signUp`.
- Added a `verifyOtp` method that uses Supabase Auth's native 6-digit code verification.
- Ensured that successful verification also sets up the local session.

### 3. Signup UI (`components/user-signup-form.tsx`)
- Added a new **Verification Step** to the signup wizard.
- After a brand submits their details, they are now presented with an OTP entry screen instead of being immediately admitted.
- Implemented error handling for expired or incorrect codes.

## How to Apply

To finalize the setup, you must run the following SQL scripts in your Supabase SQL Editor:

1.  **Run** [otp-verification-migration.sql](file:///Users/kabinmanandhar/Work/thc-club-website/scripts/otp-verification-migration.sql) to update the table structures.
2.  **Run** [auth-sync-trigger.sql](file:///Users/kabinmanandhar/Work/thc-club-website/scripts/auth-sync-trigger.sql) to enable automatic data synchronization between Supabase Auth and your database.

> [!IMPORTANT]
> Since you have already set up Resend SMTP in Supabase, the OTP emails will be sent automatically by Supabase using your Resend credentials. Ensure your Supabase Auth settings are configured to use **OTP** instead of Magic Links if you want the 6-digit code experience.

## Verification Flow
1. **Signup**: Brand enters details.
2. **OTP**: Code is sent via Resend. User enters 6 digits in the UI.
3. **Activation**: Trigger syncs the verified status to the `brands` table.
4. **Access**: User is redirected to the club dashboard.
