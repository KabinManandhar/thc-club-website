-- Fix missing payment_method column in shelf_bookings
ALTER TABLE shelf_bookings 
ADD COLUMN IF NOT EXISTS payment_method TEXT 
CHECK (payment_method IN ('bank_transfer', 'qr_payment', 'cash', 'card', 'fonepay', 'khalti'));

-- Optional: Update existing records to 'cash' if needed
-- UPDATE shelf_bookings SET payment_method = 'cash' WHERE payment_method IS NULL;
