-- Add some sample enquiries and visit requests for testing

-- Sample enquiries
INSERT INTO enquiries (name, email, phone, subject, message, status, priority) VALUES
('Priya Sharma', 'priya@example.com', '+977-9841234567', 'Interested in shelf space', 'Hi, I run a handmade jewelry business and would love to know more about your shelf rental options.', 'new', 'medium'),
('Rajesh Thapa', 'rajesh@localcrafts.com', '+977-9851234567', 'Partnership inquiry', 'We are a local crafts collective and interested in potential partnership opportunities.', 'in_progress', 'high'),
('Maya Gurung', 'maya@example.com', '+977-9861234567', 'Product placement question', 'Can I display food products? I make organic honey and jams.', 'new', 'low'),
('Bikash Rai', 'bikash@example.com', '+977-9871234567', 'Pricing information', 'Could you send me detailed pricing for eye-level shelf slots?', 'resolved', 'medium');

-- Sample visit requests
INSERT INTO visit_requests (name, email, phone, company, visit_purpose, preferred_date, preferred_time, number_of_visitors, special_requirements, status) VALUES
('Anita Shrestha', 'anita@creativestudio.com', '+977-9841234567', 'Creative Studio Nepal', 'Want to see the space and discuss potential collaboration', '2024-01-15', '14:00', 2, 'Need parking space for 2 vehicles', 'pending'),
('Suresh Maharjan', 'suresh@example.com', '+977-9851234567', 'Local Artisans Group', 'Site visit to understand the setup and requirements', '2024-01-18', '10:30', 4, 'Group includes elderly members, need accessible entrance', 'confirmed'),
('Kamala Tamang', 'kamala@example.com', '+977-9861234567', NULL, 'Personal visit to check out the space before applying', '2024-01-20', '16:00', 1, NULL, 'pending'),
('Dipesh Karki', 'dipesh@techcraft.com', '+977-9871234567', 'TechCraft Solutions', 'Business meeting to discuss digital integration possibilities', '2024-01-12', '11:00', 3, 'Need conference room or quiet space for meeting', 'completed');
