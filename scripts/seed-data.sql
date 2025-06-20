-- Seed initial data for THC Club

-- Insert initial shelf slots (108 total)
INSERT INTO shelf_slots (slot_number, shelf_type, status) VALUES
-- Bottom shelf slots (1-36)
(1, 'bottom', 'available'), (2, 'bottom', 'available'), (3, 'bottom', 'available'),
(4, 'bottom', 'available'), (5, 'bottom', 'available'), (6, 'bottom', 'available'),
(7, 'bottom', 'available'), (8, 'bottom', 'available'), (9, 'bottom', 'available'),
(10, 'bottom', 'available'), (11, 'bottom', 'available'), (12, 'bottom', 'available'),
(13, 'bottom', 'available'), (14, 'bottom', 'available'), (15, 'bottom', 'available'),
(16, 'bottom', 'available'), (17, 'bottom', 'available'), (18, 'bottom', 'available'),
(19, 'bottom', 'available'), (20, 'bottom', 'available'), (21, 'bottom', 'available'),
(22, 'bottom', 'available'), (23, 'bottom', 'available'), (24, 'bottom', 'available'),
(25, 'bottom', 'available'), (26, 'bottom', 'available'), (27, 'bottom', 'available'),
(28, 'bottom', 'available'), (29, 'bottom', 'available'), (30, 'bottom', 'available'),
(31, 'bottom', 'available'), (32, 'bottom', 'available'), (33, 'bottom', 'available'),
(34, 'bottom', 'available'), (35, 'bottom', 'available'), (36, 'bottom', 'available'),

-- Eye level shelf slots (37-72)
(37, 'eye_level', 'available'), (38, 'eye_level', 'available'), (39, 'eye_level', 'available'),
(40, 'eye_level', 'available'), (41, 'eye_level', 'available'), (42, 'eye_level', 'available'),
(43, 'eye_level', 'available'), (44, 'eye_level', 'available'), (45, 'eye_level', 'available'),
(46, 'eye_level', 'available'), (47, 'eye_level', 'available'), (48, 'eye_level', 'available'),
(49, 'eye_level', 'available'), (50, 'eye_level', 'available'), (51, 'eye_level', 'available'),
(52, 'eye_level', 'available'), (53, 'eye_level', 'available'), (54, 'eye_level', 'available'),
(55, 'eye_level', 'available'), (56, 'eye_level', 'available'), (57, 'eye_level', 'available'),
(58, 'eye_level', 'available'), (59, 'eye_level', 'available'), (60, 'eye_level', 'available'),
(61, 'eye_level', 'available'), (62, 'eye_level', 'available'), (63, 'eye_level', 'available'),
(64, 'eye_level', 'available'), (65, 'eye_level', 'available'), (66, 'eye_level', 'available'),
(67, 'eye_level', 'available'), (68, 'eye_level', 'available'), (69, 'eye_level', 'available'),
(70, 'eye_level', 'available'), (71, 'eye_level', 'available'), (72, 'eye_level', 'available'),

-- Top level shelf slots (73-108)
(73, 'top_level', 'available'), (74, 'top_level', 'available'), (75, 'top_level', 'available'),
(76, 'top_level', 'available'), (77, 'top_level', 'available'), (78, 'top_level', 'available'),
(79, 'top_level', 'available'), (80, 'top_level', 'available'), (81, 'top_level', 'available'),
(82, 'top_level', 'available'), (83, 'top_level', 'available'), (84, 'top_level', 'available'),
(85, 'top_level', 'available'), (86, 'top_level', 'available'), (87, 'top_level', 'available'),
(88, 'top_level', 'available'), (89, 'top_level', 'available'), (90, 'top_level', 'available'),
(91, 'top_level', 'available'), (92, 'top_level', 'available'), (93, 'top_level', 'available'),
(94, 'top_level', 'available'), (95, 'top_level', 'available'), (96, 'top_level', 'available'),
(97, 'top_level', 'available'), (98, 'top_level', 'available'), (99, 'top_level', 'available'),
(100, 'top_level', 'available'), (101, 'top_level', 'available'), (102, 'top_level', 'available'),
(103, 'top_level', 'available'), (104, 'top_level', 'available'), (105, 'top_level', 'available'),
(106, 'top_level', 'available'), (107, 'top_level', 'available'), (108, 'top_level', 'available');

-- Insert sample admin user
INSERT INTO admin_users (email, name, role) VALUES
('admin@thcclub.com', 'THC Club Admin', 'super_admin');

-- Insert some sample waitlist entries
INSERT INTO waitlist (business_name, email, phone, status, notes) VALUES
('Artisan Crafts Nepal', 'contact@artisannepal.com', '+977-9841234567', 'pending', 'Handmade jewelry and crafts'),
('Himalayan Tea Co', 'hello@himalayantea.com', '+977-9851234567', 'approved', 'Premium organic teas from Nepal'),
('Local Threads', 'info@localthreads.com', '+977-9861234567', 'pending', 'Sustainable fashion brand');
