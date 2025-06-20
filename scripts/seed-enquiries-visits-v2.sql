-- Add some sample enquiries and visit requests for testing (with conflict handling)

-- Sample enquiries (insert only if table is empty)
INSERT INTO enquiries (name, email, phone, subject, message, status, priority) 
SELECT * FROM (VALUES
  ('Priya Sharma', 'priya@example.com', '+977-9841234567', 'Interested in shelf space', 'Hi, I run a handmade jewelry business and would love to know more about your shelf rental options.', 'new', 'medium'),
  ('Rajesh Thapa', 'rajesh@localcrafts.com', '+977-9851234567', 'Partnership inquiry', 'We are a local crafts collective and interested in potential partnership opportunities.', 'in_progress', 'high'),
  ('Maya Gurung', 'maya@example.com', '+977-9861234567', 'Product placement question', 'Can I display food products? I make organic honey and jams.', 'new', 'low'),
  ('Bikash Rai', 'bikash@example.com', '+977-9871234567', 'Pricing information', 'Could you send me detailed pricing for eye-level shelf slots?', 'resolved', 'medium')
) AS new_enquiries(name, email, phone, subject, message, status, priority)
WHERE NOT EXISTS (SELECT 1 FROM enquiries LIMIT 1);

-- Sample visit requests (insert only if table is empty)
INSERT INTO visit_requests (name, email, phone, company, visit_purpose, preferred_date, preferred_time, number_of_visitors, special_requirements, status)
SELECT * FROM (VALUES
  ('Anita Shrestha', 'anita@creativestudio.com', '+977-9841234567', 'Creative Studio Nepal', 'Want to see the space and discuss potential collaboration', '2024-01-15', '14:00', 2, 'Need parking space for 2 vehicles', 'pending'),
  ('Suresh Maharjan', 'suresh@example.com', '+977-9851234567', 'Local Artisans Group', 'Site visit to understand the setup and requirements', '2024-01-18', '10:30', 4, 'Group includes elderly members, need accessible entrance', 'confirmed'),
  ('Kamala Tamang', 'kamala@example.com', '+977-9861234567', NULL, 'Personal visit to check out the space before applying', '2024-01-20', '16:00', 1, NULL, 'pending'),
  ('Dipesh Karki', 'dipesh@techcraft.com', '+977-9871234567', 'TechCraft Solutions', 'Business meeting to discuss digital integration possibilities', '2024-01-12', '11:00', 3, 'Need conference room or quiet space for meeting', 'completed')
) AS new_visits(name, email, phone, company, visit_purpose, preferred_date, preferred_time, number_of_visitors, special_requirements, status)
WHERE NOT EXISTS (SELECT 1 FROM visit_requests LIMIT 1);

-- Add some sample occupied slots for testing
UPDATE shelf_slots 
SET 
  status = 'occupied',
  occupied_by = 'Himalayan Tea Co',
  rent_amount = 1500,
  occupied_from = '2024-01-01',
  occupied_until = '2024-04-01'
WHERE slot_number = 45 AND status = 'available';

UPDATE shelf_slots 
SET 
  status = 'occupied',
  occupied_by = 'Artisan Crafts Nepal',
  rent_amount = 1000,
  occupied_from = '2024-01-15',
  occupied_until = '2024-07-15'
WHERE slot_number = 12 AND status = 'available';

UPDATE shelf_slots 
SET 
  status = 'occupied',
  occupied_by = 'Local Threads',
  rent_amount = 1200,
  occupied_from = '2024-01-10',
  occupied_until = '2024-02-10'
WHERE slot_number = 89 AND status = 'available';

UPDATE shelf_slots 
SET 
  status = 'maintenance'
WHERE slot_number = 67 AND status = 'available';
