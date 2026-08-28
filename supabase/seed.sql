-- Seed Branches
insert into public.branches (id, name, code, address, is_active) values
('b1111111-1111-1111-1111-111111111111', 'Main Branch', 'MAIN', '123 Laundry St, Clean City', true)
on conflict (code) do nothing;

-- Seed Roles
insert into public.roles (id, name, description) values
('admin', 'Admin', 'Full administrative control over all branch operations, billing configuration, audits, and expense management.'),
('billing_staff', 'Billing Staff', 'Responsible for customer registration, job card creation, pricing, payments, and document printing.'),
('processing_staff', 'Processing Staff', 'Responsible for moving jobs through operational statuses (washing, ironing) and shelf placements.'),
('delivery_staff', 'Delivery Staff', 'Responsible for final delivery validations and closing balance payments.')
on conflict (id) do nothing;

-- Seed Services
insert into public.services (id, name, description, is_active) values
('a1111111-1111-1111-1111-111111111111', 'Wash & Fold', 'Standard wash and fold service, billed by weight.', true),
('a2222222-2222-2222-2222-222222222222', 'Wash & Iron', 'Standard wash and premium steam press.', true),
('a3333333-3333-3333-3333-333333333333', 'Steam Iron', 'Premium crease-less steam ironing.', true),
('a4444444-4444-4444-4444-444444444444', 'Dry Cleaning', 'Gentle chemical cleaning for delicate fabrics.', true),
('a5555555-5555-5555-5555-555555555555', 'Shoe Cleaning', 'Deep cleaning and fabric restoration for shoes.', true)
on conflict (id) do nothing;

-- Seed Items
insert into public.items (id, name, is_active) values
('f1111111-1111-1111-1111-111111111111', 'Shirt', true),
('f2222222-2222-2222-2222-222222222222', 'Pant', true),
('f3333333-3333-3333-3333-333333333333', 'Saree', true),
('f4444444-4444-4444-4444-444444444444', 'Blazer', true),
('f5555555-5555-5555-5555-555555555555', 'Shoes', true),
('f6666666-6666-6666-6666-666666666666', 'Mixed Clothes', true)
on conflict (id) do nothing;

-- Seed Units
insert into public.units (id, name) values
('kg', 'Kilograms'),
('pcs', 'Pieces'),
('pair', 'Pairs'),
('set', 'Sets')
on conflict (id) do nothing;

-- Seed Service Item Rates
insert into public.service_item_rates (service_id, item_id, unit_id, rate, effective_from, is_active) values
-- Wash & Fold (Billed by Kg)
('a1111111-1111-1111-1111-111111111111', 'f6666666-6666-6666-6666-666666666666', 'kg', 80.00, '2026-08-01T00:00:00Z', true),
-- Wash & Iron (Billed by Pcs)
('a2222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 'pcs', 20.00, '2026-08-01T00:00:00Z', true),
('a2222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', 'pcs', 25.00, '2026-08-01T00:00:00Z', true),
('a2222222-2222-2222-2222-222222222222', 'f3333333-3333-3333-3333-333333333333', 'pcs', 60.00, '2026-08-01T00:00:00Z', true),
-- Steam Iron (Billed by Pcs)
('a3333333-3333-3333-3333-333333333333', 'f1111111-1111-1111-1111-111111111111', 'pcs', 12.00, '2026-08-01T00:00:00Z', true),
('a3333333-3333-3333-3333-333333333333', 'f2222222-2222-2222-2222-222222222222', 'pcs', 15.00, '2026-08-01T00:00:00Z', true),
('a3333333-3333-3333-3333-333333333333', 'f3333333-3333-3333-3333-333333333333', 'pcs', 30.00, '2026-08-01T00:00:00Z', true),
-- Dry Cleaning (Billed by Pcs)
('a4444444-4444-4444-4444-444444444444', 'f3333333-3333-3333-3333-333333333333', 'pcs', 150.00, '2026-08-01T00:00:00Z', true),
('a4444444-4444-4444-4444-444444444444', 'f4444444-4444-4444-4444-444444444444', 'pcs', 180.00, '2026-08-01T00:00:00Z', true),
-- Shoe Cleaning (Billed by Pair)
('a5555555-5555-5555-5555-555555555555', 'f5555555-5555-5555-5555-555555555555', 'pair', 250.00, '2026-08-01T00:00:00Z', true)
on conflict (service_id, item_id, unit_id, effective_from) do nothing;

-- Seed Expense Categories
insert into public.expense_categories (id, name, is_active) values
('ec111111-1111-1111-1111-111111111111', 'Rent', true),
('ec222222-2222-2222-2222-222222222222', 'Salary', true),
('ec333333-3333-3333-3333-333333333333', 'Electricity', true),
('ec444444-4444-4444-4444-444444444444', 'Water Supply', true),
('ec555555-5555-5555-5555-555555555555', 'Detergent & Chemicals', true),
('ec666666-6666-6666-6666-666666666666', 'Packaging Material', true),
('ec777777-7777-7777-7777-777777777777', 'Transport & Fuel', true)
on conflict (id) do nothing;

-- Seed Shelf Locations
insert into public.shelf_locations (id, code, branch_id, is_active) values
('e0111111-1111-1111-1111-111111111111', 'A-01', 'b1111111-1111-1111-1111-111111111111', true),
('e0222222-2222-2222-2222-222222222222', 'A-02', 'b1111111-1111-1111-1111-111111111111', true),
('e0333333-3333-3333-3333-333333333333', 'B-01', 'b1111111-1111-1111-1111-111111111111', true),
('e0444444-4444-4444-4444-444444444444', 'B-02', 'b1111111-1111-1111-1111-111111111111', true)
on conflict (id) do nothing;
