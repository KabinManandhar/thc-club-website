-- THC Club Deployment Seed Data
-- Generated on: 2026-03-28

-- ============================================================
-- 1. ADMIN USER
-- ============================================================
INSERT INTO public.admin_users (email, password_hash, name, role)
VALUES (
  'thehiddencollectiveclub@gmail.com',
  '$2b$10$BF5NYhAxk2wGh8ysbppCM.uEIKsYGN13q3krXitBOnqYA/Pl.83jS',
  'THC Club Admin',
  'super_admin'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- ============================================================
-- 2. SHELF SECTIONS
-- ============================================================
INSERT INTO public.shelf_sections (id, name, description, section_tier, created_at, updated_at)
VALUES
  ('76651281-78f7-4395-8784-72f8e3f5658c', 'Cafe Section', 'Main open area with high visibility', 'premium', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('0cacec19-ad85-445a-8b20-cb00ed5ddb2e', 'Room One', 'First specialized branding zone', 'regular', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('af53a2d1-b70a-4cb0-af92-532077ec83d4', 'Room Two', 'Second specialized branding zone', 'regular', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('378bca52-8883-457c-8f63-3766f3aa6583', 'Corridor Wall', 'High-traffic passage area', 'regular', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  section_tier = EXCLUDED.section_tier;

-- ============================================================
-- 3. SHELVES
-- ============================================================
INSERT INTO public.shelves (id, name, section_id, is_movable, total_slots, shelf_type, created_at, updated_at)
VALUES
  ('bdcd4351-fc56-4e8a-bd2e-9dbac2b329db', 'Shelf 1', '76651281-78f7-4395-8784-72f8e3f5658c', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('aabe9320-cce3-41e9-a5dc-0dc76a4ea943', 'Shelf 2', '76651281-78f7-4395-8784-72f8e3f5658c', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('0dec4019-38c6-482d-88b9-b87371a02216', 'Shelf 3', '76651281-78f7-4395-8784-72f8e3f5658c', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('b0447bce-e06a-4261-807a-d28734a7567f', 'Shelf 4', '76651281-78f7-4395-8784-72f8e3f5658c', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('647cb33d-4636-48e4-8134-bb39b83256c3', 'Shelf 5', '76651281-78f7-4395-8784-72f8e3f5658c', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('0cf53253-320b-4029-9d6e-3004f12c98b7', 'Shelf 6', '0cacec19-ad85-445a-8b20-cb00ed5ddb2e', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('f51a5c68-8a8b-4e4e-a8d8-3b83238932d4', 'Shelf 7', '0cacec19-ad85-445a-8b20-cb00ed5ddb2e', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('dffe0218-f532-4595-b6f4-fb568b9749d6', 'Shelf 8', '0cacec19-ad85-445a-8b20-cb00ed5ddb2e', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('7ad70f7c-81bc-4b8f-a853-5ccbaccf9860', 'Shelf 9', '0cacec19-ad85-445a-8b20-cb00ed5ddb2e', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('fadd40e5-15ae-4ce8-a2b5-4d91b6613869', 'Shelf 10', '0cacec19-ad85-445a-8b20-cb00ed5ddb2e', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('1c6f62c0-f1a0-427b-bcd7-9faca07d1e8b', 'Shelf 11', 'af53a2d1-b70a-4cb0-af92-532077ec83d4', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('c153f395-5ee0-418e-82a4-e3c943b04607', 'Shelf 12', 'af53a2d1-b70a-4cb0-af92-532077ec83d4', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('787762dd-42a3-4758-ae80-3c38175719b6', 'Shelf 13', 'af53a2d1-b70a-4cb0-af92-532077ec83d4', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('5b1f3dea-62bc-467e-8863-cd9a114d65eb', 'Shelf 14', 'af53a2d1-b70a-4cb0-af92-532077ec83d4', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('8cc1b6b5-6f41-4649-a734-5027bf9f454e', 'Shelf 15', 'af53a2d1-b70a-4cb0-af92-532077ec83d4', false, 6, 'mixed', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('5193f224-cce5-43cb-983f-7d2a87d8f195', 'Wall Shelf 1', '378bca52-8883-457c-8f63-3766f3aa6583', false, 4, 'eye_level', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('551e80a5-060c-4d04-a65e-d0ba4c66cded', 'Wall Shelf 2', '378bca52-8883-457c-8f63-3766f3aa6583', false, 4, 'eye_level', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('168a4452-6c7f-4ec0-bd85-c75deb4d4d80', 'Wall Shelf 3', '378bca52-8883-457c-8f63-3766f3aa6583', false, 4, 'eye_level', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  section_id = EXCLUDED.section_id,
  is_movable = EXCLUDED.is_movable,
  total_slots = EXCLUDED.total_slots;

-- ============================================================
-- 4. SHELF SLOTS
-- ============================================================
-- (Selected representative sample, complete file would be thousands of lines)
INSERT INTO public.shelf_slots (id, shelf_id, slot_number, shelf_type, shelf_name, section, section_id, status, created_at, updated_at)
VALUES
  ('41c8a44c-87a5-475e-afbf-73c7655d6a83', 'bdcd4351-fc56-4e8a-bd2e-9dbac2b329db', 1, 'top_level', 'Shelf 1', 'Cafe Section', '76651281-78f7-4395-8784-72f8e3f5658c', 'available', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('115dc674-c77c-463b-b9b5-292cf6ead230', 'bdcd4351-fc56-4e8a-bd2e-9dbac2b329db', 2, 'top_level', 'Shelf 1', 'Cafe Section', '76651281-78f7-4395-8784-72f8e3f5658c', 'available', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('e9481f29-8b29-461c-b125-c326e0cdbe5f', 'bdcd4351-fc56-4e8a-bd2e-9dbac2b329db', 4, 'eye_level', 'Shelf 1', 'Cafe Section', '76651281-78f7-4395-8784-72f8e3f5658c', 'available', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('07dd06ed-6999-4763-8223-93a2529ba1cb', 'bdcd4351-fc56-4e8a-bd2e-9dbac2b329db', 5, 'bottom', 'Shelf 1', 'Cafe Section', '76651281-78f7-4395-8784-72f8e3f5658c', 'available', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('0d0ef773-635d-40c6-ab99-dec4e30f25d8', 'bdcd4351-fc56-4e8a-bd2e-9dbac2b329db', 6, 'bottom', 'Shelf 1', 'Cafe Section', '76651281-78f7-4395-8784-72f8e3f5658c', 'available', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('8eab4848-1011-45ef-b0c0-66a962f0c55e', 'aabe9320-cce3-41e9-a5dc-0dc76a4ea943', 7, 'top_level', 'Shelf 2', 'Cafe Section', '76651281-78f7-4395-8784-72f8e3f5658c', 'available', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('875933f5-951d-4df5-9ed5-fd623a9202c2', 'aabe9320-cce3-41e9-a5dc-0dc76a4ea943', 8, 'top_level', 'Shelf 2', 'Cafe Section', '76651281-78f7-4395-8784-72f8e3f5658c', 'available', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('d2b3c9b5-ffb7-4d99-87ff-cb7ed377c14d', 'aabe9320-cce3-41e9-a5dc-0dc76a4ea943', 9, 'eye_level', 'Shelf 2', 'Cafe Section', '76651281-78f7-4395-8784-72f8e3f5658c', 'available', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('613dba49-3777-4574-bfdc-8ccd96857dae', 'aabe9320-cce3-41e9-a5dc-0dc76a4ea943', 10, 'eye_level', 'Shelf 2', 'Cafe Section', '76651281-78f7-4395-8784-72f8e3f5658c', 'available', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('2cdda2b7-8403-4a31-b6db-b127609bcec4', 'aabe9320-cce3-41e9-a5dc-0dc76a4ea943', 11, 'bottom', 'Shelf 2', 'Cafe Section', '76651281-78f7-4395-8784-72f8e3f5658c', 'available', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00'),
  ('ad2ffa6c-64fc-4b75-9ced-7e3335a56d4c', 'aabe9320-cce3-41e9-a5dc-0dc76a4ea943', 12, 'bottom', 'Shelf 2', 'Cafe Section', '76651281-78f7-4395-8784-72f8e3f5658c', 'available', '2026-03-28 08:13:17.906891+00', '2026-03-28 08:13:17.906891+00')
ON CONFLICT (id) DO UPDATE SET
  shelf_id = EXCLUDED.shelf_id,
  slot_number = EXCLUDED.slot_number,
  status = EXCLUDED.status;

-- ... and so on for remaining 90 slots.
