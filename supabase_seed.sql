-- Clean Database Seed Migration
-- For syncing physical infrastructure Section -> Shelf -> Slot without brand attachments

-- 1) Clear existing data to prevent conflicts
TRUNCATE TABLE "public"."shelf_slots" CASCADE;
TRUNCATE TABLE "public"."shelves" CASCADE;
TRUNCATE TABLE "public"."shelf_sections" CASCADE;

-- 2) Seed shelf_sections
INSERT INTO "public"."shelf_sections" (name, description) VALUES
('Cafe Section', 'Main open area with high visibility'),
('Room One', 'First specialized branding zone'),
('Room Two', 'Second specialized branding zone'),
('Corridor Wall', 'High-traffic passage area');

-- 3) Seed shelves and link to sections
DO $$
DECLARE
    section_cafe_id UUID;
    section_room1_id UUID;
    section_room2_id UUID;
    section_corridor_id UUID;
BEGIN
    SELECT id INTO section_cafe_id FROM shelf_sections WHERE name = 'Cafe Section';
    SELECT id INTO section_room1_id FROM shelf_sections WHERE name = 'Room One';
    SELECT id INTO section_room2_id FROM shelf_sections WHERE name = 'Room Two';
    SELECT id INTO section_corridor_id FROM shelf_sections WHERE name = 'Corridor Wall';

    -- Seed shelves for Cafe Section
    INSERT INTO shelves (name, section_id, total_slots, shelf_type) VALUES
    ('Shelf 1', section_cafe_id, 6, 'mixed'),
    ('Shelf 2', section_cafe_id, 6, 'mixed'),
    ('Shelf 3', section_cafe_id, 6, 'mixed'),
    ('Shelf 4', section_cafe_id, 6, 'mixed'),
    ('Shelf 5', section_cafe_id, 6, 'mixed');

    -- Seed shelves for Room One
    INSERT INTO shelves (name, section_id, total_slots, shelf_type) VALUES
    ('Shelf 6', section_room1_id, 6, 'mixed'),
    ('Shelf 7', section_room1_id, 6, 'mixed'),
    ('Shelf 8', section_room1_id, 6, 'mixed'),
    ('Shelf 9', section_room1_id, 6, 'mixed'),
    ('Shelf 10', section_room1_id, 6, 'mixed');

    -- Seed shelves for Room Two
    INSERT INTO shelves (name, section_id, total_slots, shelf_type) VALUES
    ('Shelf 11', section_room2_id, 6, 'mixed'),
    ('Shelf 12', section_room2_id, 6, 'mixed'),
    ('Shelf 13', section_room2_id, 6, 'mixed'),
    ('Shelf 14', section_room2_id, 6, 'mixed'),
    ('Shelf 15', section_room2_id, 6, 'mixed');

    -- Seed shelves for Corridor Wall
    INSERT INTO shelves (name, section_id, total_slots, shelf_type) VALUES
    ('Wall Shelf 1', section_corridor_id, 4, 'eye_level'),
    ('Wall Shelf 2', section_corridor_id, 4, 'eye_level'),
    ('Wall Shelf 3', section_corridor_id, 4, 'eye_level');
END $$;

-- 4) Seed shelf_slots and link to shelves
-- This uses a logic-based approach to ensure concrete relationships
DO $$
DECLARE
    shelf_record RECORD;
    i INTEGER;
BEGIN
    -- Loop through each shelf and create slots based on its total_slots
    FOR shelf_record IN (SELECT s.id, s.name, s.total_slots, sec.name as section_name, sec.id as section_id FROM shelves s JOIN shelf_sections sec ON s.section_id = sec.id)
    LOOP
        FOR i IN 1..shelf_record.total_slots
        LOOP
            INSERT INTO shelf_slots (
                shelf_id, 
                slot_number, 
                shelf_type, 
                status, 
                shelf_name, 
                section, 
                section_id
            ) VALUES (
                shelf_record.id,
                -- Generate a pseudo-sequential slot number based on shelf name/number
                (SELECT COALESCE(MAX(slot_number), 0) + 1 FROM shelf_slots),
                CASE 
                    WHEN i <= shelf_record.total_slots / 3 THEN 'top_level'
                    WHEN i <= (shelf_record.total_slots * 2) / 3 THEN 'eye_level'
                    ELSE 'bottom'
                END,
                'available',
                shelf_record.name,
                shelf_record.section_name,
                shelf_record.section_id
            );
        END LOOP;
    END LOOP;
END $$;
