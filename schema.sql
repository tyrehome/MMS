
CREATE SCHEMA IF NOT EXISTS public;

-- CORE TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'staff',
    name TEXT,
    email TEXT,
    avatar_url TEXT
);

CREATE TABLE IF NOT EXISTS public.business_settings (
    id SERIAL PRIMARY KEY,
    name TEXT,
    logo_url TEXT,
    phone TEXT,
    address TEXT
);

CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    role TEXT DEFAULT 'staff',
    status TEXT DEFAULT 'pending'
);

-- INVENTORY & OPERATIONS
CREATE TABLE IF NOT EXISTS public.tires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT,
    model TEXT,
    size TEXT,
    tire_category TEXT,
    vehicle_type TEXT,
    stock INTEGER DEFAULT 0,
    price NUMERIC DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    dot_code TEXT,
    origin TEXT,
    thread_pattern TEXT,
    images TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    category TEXT,
    stock INTEGER DEFAULT 0,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    role TEXT,
    phone TEXT,
    status TEXT DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hotel_tires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT,
    customer_phone TEXT,
    plate_number TEXT,
    vehicle_model TEXT,
    brand TEXT,
    size TEXT,
    quantity INTEGER,
    storage_date TIMESTAMPTZ DEFAULT NOW(),
    retrieval_date TIMESTAMPTZ,
    notes TEXT,
    retrieved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_plate TEXT UNIQUE,
    customer_name TEXT,
    customer_phone TEXT,
    make_model TEXT,
    last_visit TIMESTAMPTZ DEFAULT NOW(),
    services JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    phone TEXT,
    email TEXT,
    vehicle_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    payable_balance NUMERIC DEFAULT 0,
    transactions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALES & ACCOUNTING
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    total NUMERIC DEFAULT 0,
    payment_method TEXT,
    customer_name TEXT,
    vehicle_number TEXT,
    profit NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    discount_type TEXT DEFAULT 'Fixed'
);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    tire_id UUID REFERENCES public.tires(id) ON DELETE SET NULL,
    service_name TEXT,
    quantity INTEGER,
    price NUMERIC,
    subtotal NUMERIC,
    serial_number TEXT,
    worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT,
    phone TEXT,
    vehicle_number TEXT,
    balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    amount NUMERIC DEFAULT 0,
    date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'unpaid'
);

CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT,
    vehicle_number TEXT,
    total NUMERIC DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'draft',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT,
    phone TEXT,
    date TIMESTAMPTZ,
    service_type TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    task TEXT,
    details TEXT,
    customer_name TEXT,
    vehicle_number TEXT,
    price NUMERIC DEFAULT 0,
    date TEXT,
    time TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT,
    value TEXT
);

-- Migrations for tires table
ALTER TABLE public.tires ADD COLUMN IF NOT EXISTS thread_pattern TEXT;
ALTER TABLE public.tires ADD COLUMN IF NOT EXISTS images TEXT[];

-- IDEMPOTENT SCHEMA UPDATES (Migrations for existing tables)
ALTER TABLE public.hotel_tires ADD COLUMN IF NOT EXISTS plate_number TEXT;
ALTER TABLE public.hotel_tires ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE public.hotel_tires ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.hotel_tires ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE public.hotel_tires ADD COLUMN IF NOT EXISTS retrieval_date TIMESTAMPTZ;
ALTER TABLE public.hotel_tires ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.hotel_tires ADD COLUMN IF NOT EXISTS retrieved BOOLEAN DEFAULT false;
ALTER TABLE public.hotel_tires ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS license_plate TEXT UNIQUE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL;

-- Account & Sales Integration Migrations
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS receivable NUMERIC DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS payable NUMERIC DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS transactions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS profit NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'Fixed';

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time TEXT;

-- Parts cost price for profit tracking
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;

-- Link inventory to suppliers for GRN tracking
ALTER TABLE public.tires ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Vendor Ledger
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS transactions JSONB DEFAULT '[]'::jsonb;

-- RPC FUNCTION FOR ATOMIC SALES PROCESSING
CREATE OR REPLACE FUNCTION process_sale(sale_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id UUID;
    item JSONB;
    v_tire_id UUID;
    v_stock INTEGER;
    v_patch_part RECORD;
    v_total_patches INTEGER := 0;
    v_vehicle RECORD;
    v_services JSONB;
    v_mechanic_names TEXT := '';
    v_work_done TEXT := '';
    v_trade_in_id UUID;
BEGIN
    -- 1. Deduct Stock for Tires
    FOR item IN SELECT * FROM jsonb_array_elements(sale_payload->'items')
    LOOP
        IF (item->>'type') = 'tire' AND (item->>'tire_id') IS NOT NULL THEN
            v_tire_id := (item->>'tire_id')::UUID;
            SELECT stock INTO v_stock FROM public.tires WHERE id = v_tire_id FOR UPDATE;
            IF v_stock < (item->>'quantity')::INTEGER THEN
                RAISE EXCEPTION 'Insufficient stock for tire %', v_tire_id;
            END IF;
            UPDATE public.tires 
            SET stock = stock - (item->>'quantity')::INTEGER
            WHERE id = v_tire_id;
        END IF;
        
        -- Count patches for later
        IF (item->>'type') = 'service' AND (item->>'service_name') ILIKE '%patch%' THEN
            v_total_patches := v_total_patches + COALESCE((item->>'quantity')::INTEGER, 1);
        END IF;
    END LOOP;

    -- 2. Handle Trade-In
    IF (sale_payload->>'trade_in_active')::BOOLEAN = true AND (sale_payload->>'trade_in_value')::NUMERIC > 0 THEN
        INSERT INTO public.tires (brand, tire_category, model, size, stock, price, cost_price, created_at)
        VALUES (
            'Trade-in Exchange', 
            'Reconditioned', 
            COALESCE(sale_payload->>'trade_in_description', 'Exchange'), 
            'Unknown / Exchange', 
            1, 
            (sale_payload->>'trade_in_value')::NUMERIC, 
            (sale_payload->>'trade_in_value')::NUMERIC, 
            NOW()
        ) RETURNING id INTO v_trade_in_id;
    END IF;

    -- 3. Save Sale Record
    INSERT INTO public.sales (total, payment_method, account_id, customer_name, vehicle_number, profit, discount_amount, discount_type, created_at)
    VALUES (
        (sale_payload->>'total')::NUMERIC, 
        sale_payload->>'payment_method', 
        CASE WHEN (sale_payload->>'account_id') IS NOT NULL AND (sale_payload->>'account_id') <> '' THEN (sale_payload->>'account_id')::UUID ELSE NULL END,
        sale_payload->>'customer_name', 
        sale_payload->>'vehicle_number', 
        COALESCE((sale_payload->>'profit')::NUMERIC, (sale_payload->>'total')::NUMERIC * 0.25), 
        COALESCE((sale_payload->>'discount_amount')::NUMERIC, 0),
        sale_payload->>'discount_type',
        COALESCE((sale_payload->>'created_at')::TIMESTAMPTZ, NOW())
    ) RETURNING id INTO new_sale_id;

    -- 3.5 Update Customer Account Balance for Credit Sales
    IF (sale_payload->>'payment_method') = 'Customer Credit' AND (sale_payload->>'account_id') IS NOT NULL AND (sale_payload->>'account_id') <> '' THEN
        UPDATE public.accounts 
        SET receivable = receivable + (sale_payload->>'total')::NUMERIC,
            updated_at = NOW()
        WHERE id = (sale_payload->>'account_id')::UUID;
    END IF;

    -- 4. Save Sale Items & 5. Tasks
    FOR item IN SELECT * FROM jsonb_array_elements(sale_payload->'items')
    LOOP
        INSERT INTO public.sale_items (sale_id, tire_id, service_name, quantity, price, subtotal, serial_number, worker_id)
        VALUES (
            new_sale_id, 
            CASE WHEN (item->>'type') = 'tire' THEN (item->>'tire_id')::UUID ELSE NULL END, 
            CASE WHEN (item->>'type') = 'service' THEN item->>'service_name' ELSE NULL END, 
            (item->>'quantity')::INTEGER, 
            (item->>'price')::NUMERIC, 
            COALESCE((item->>'price')::NUMERIC * (item->>'quantity')::INTEGER, 0), 
            item->>'serial_number', 
            CASE WHEN (item->>'worker_id') IS NOT NULL AND (item->>'worker_id') <> '' THEN (item->>'worker_id')::UUID ELSE NULL END
        );

        IF (item->>'worker_id') IS NOT NULL AND (item->>'worker_id') <> '' THEN
            INSERT INTO public.tasks (worker_id, sale_id, task, details, date, time, status, created_at)
            VALUES (
                (item->>'worker_id')::UUID, 
                new_sale_id, 
                item->>'service_name', 
                'Invoice #' || SUBSTRING(new_sale_id::TEXT FROM 1 FOR 8) || ' (Qty: ' || (item->>'quantity')::TEXT || ')', 
                COALESCE(sale_payload->>'date', to_char(NOW(), 'YYYY-MM-DD')), 
                to_char(NOW(), 'HH24:MI'), 
                'Completed', 
                NOW()
            );
        END IF;
    END LOOP;

    -- 6. Deduct Consumables (Patches)
    IF v_total_patches > 0 THEN
        SELECT * INTO v_patch_part FROM public.parts WHERE name ILIKE '%patch%' LIMIT 1 FOR UPDATE;
        IF FOUND THEN
            UPDATE public.parts SET stock = stock - v_total_patches WHERE id = v_patch_part.id;
        END IF;
    END IF;

    -- 7. Auto-log to Vehicle History
    IF (sale_payload->>'vehicle_number') IS NOT NULL AND (sale_payload->>'vehicle_number') != '' THEN
        -- Get mechanic names (comma separated)
        SELECT string_agg(DISTINCT w.name, ', ') INTO v_mechanic_names
        FROM jsonb_array_elements(sale_payload->'items') i
        JOIN public.workers w ON w.id = (i->>'worker_id')::UUID
        WHERE (i->>'worker_id') IS NOT NULL AND (i->>'worker_id') <> '';
        
        IF v_mechanic_names IS NULL THEN v_mechanic_names := 'Point of Sale'; END IF;

        -- Get work done
        SELECT string_agg(
            CASE WHEN (i->>'type') = 'tire' THEN COALESCE((SELECT brand FROM public.tires WHERE id = (i->>'tire_id')::UUID), 'Tire')
            ELSE (i->>'service_name') END, ', '
        ) INTO v_work_done
        FROM jsonb_array_elements(sale_payload->'items') i;

        -- Form new service record
        v_services := jsonb_build_array(
            jsonb_build_object(
                'mechanic_name', v_mechanic_names,
                'work_done', v_work_done,
                'cost', (sale_payload->>'total')::NUMERIC,
                'date', COALESCE(sale_payload->>'date', to_char(NOW(), 'YYYY-MM-DD')),
                'next_service_date', to_char(NOW() + interval '180 days', 'YYYY-MM-DD')
            )
        );

        SELECT * INTO v_vehicle FROM public.vehicles WHERE license_plate = (sale_payload->>'vehicle_number');
        IF FOUND THEN
            UPDATE public.vehicles 
            SET services = COALESCE(services, '[]'::jsonb) || v_services,
                updated_at = NOW()
            WHERE id = v_vehicle.id;
        ELSE
            INSERT INTO public.vehicles (license_plate, services, created_at)
            VALUES ((sale_payload->>'vehicle_number'), v_services, NOW());
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'sale_id', new_sale_id);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error processing sale: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
-- Add shop_talk table for internal I/O logging
CREATE TABLE IF NOT EXISTS public.shop_talk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    author TEXT DEFAULT 'System',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime for shop_talk
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'shop_talk'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE shop_talk;
    END IF;
END
$$;

-- Audit Log for system activities
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    action TEXT,
    table_name TEXT,
    record_id TEXT,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id)
);

-- GRN (Goods Received Note) Tracking
CREATE TABLE IF NOT EXISTS public.grns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    received_date TIMESTAMPTZ DEFAULT NOW(),
    total_cost NUMERIC DEFAULT 0,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grn_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id UUID REFERENCES public.grns(id) ON DELETE CASCADE,
    tire_id UUID REFERENCES public.tires(id) ON DELETE SET NULL,
    part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
    quantity INTEGER,
    cost_price NUMERIC,
    subtotal NUMERIC
);

-- Supplier Returns
CREATE TABLE IF NOT EXISTS public.supplier_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    return_date TIMESTAMPTZ DEFAULT NOW(),
    total_credit NUMERIC DEFAULT 0,
    reason TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified Inventory View
DROP VIEW IF EXISTS public.v_inventory_health CASCADE;
DROP VIEW IF EXISTS public.v_stock CASCADE;

CREATE OR REPLACE VIEW public.v_stock AS
SELECT 
    id, brand AS name, size AS label, 'tire' AS type, stock, price, cost_price, tire_category AS category, supplier_id, created_at
FROM public.tires
UNION ALL
SELECT 
    id, name, NULL AS label, 'part' AS type, stock, price, cost_price, category, supplier_id, created_at
FROM public.parts;

-- Inventory Health Audit View (Deep Scan)
CREATE OR REPLACE VIEW public.v_inventory_health AS
SELECT 
    id, name, type, stock,
    CASE 
        WHEN type = 'tire' AND price = 0 THEN 'Missing Selling Price'
        WHEN type = 'tire' AND cost_price = 0 THEN 'Missing Cost Price'
        WHEN type = 'tire' AND (label IS NULL OR label = '') THEN 'Missing Size'
        WHEN type = 'tire' AND stock < 0 THEN 'Negative Stock'
        WHEN type = 'part' AND price = 0 THEN 'Missing Selling Price'
        WHEN type = 'part' AND category IS NULL THEN 'Missing Category'
        ELSE 'Healthy'
    END as health_status,
    created_at
FROM public.v_stock;

-- ==========================================
-- PERFORMANCE OPTIMIZATION (INDEXES)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_tires_brand ON public.tires(brand);
CREATE INDEX IF NOT EXISTS idx_tires_size ON public.tires(size);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_vehicle ON public.sales(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_tasks_worker ON public.tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);

-- ==========================================
-- SECURITY HARDENING (ROW LEVEL SECURITY)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_talk ENABLE ROW LEVEL SECURITY;

-- Note: In a production Supabase environment, you would define specific policies.
-- For now, we enable full access to all authenticated users.
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        BEGIN
            EXECUTE format('CREATE POLICY "Allow authenticated users" ON public.%I FOR ALL TO authenticated USING (true);', t);
        EXCEPTION WHEN duplicate_object THEN
            -- Policy already exists
        END;
    END LOOP;
END $$;

-- ==========================================
-- AUTOMATION (TRIGGERS)
-- ==========================================

-- Function: Automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        BEGIN
            EXECUTE format('CREATE TRIGGER tr_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION handle_updated_at();', t);
        EXCEPTION WHEN duplicate_object THEN
            -- Trigger already exists
        END;
    END LOOP;
END $$;

-- Function: Automatically audit inventory changes
CREATE OR REPLACE FUNCTION audit_inventory_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.stock <> NEW.stock OR OLD.price <> NEW.price) THEN
            INSERT INTO public.audit_log (action, table_name, record_id, notes)
            VALUES (
                'INVENTORY_UPDATE', 
                TG_TABLE_NAME, 
                NEW.id::TEXT, 
                jsonb_build_object(
                    'old_stock', OLD.stock, 'new_stock', NEW.stock,
                    'old_price', OLD.price, 'new_price', NEW.price
                )::TEXT
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_audit_tires ON public.tires;
CREATE TRIGGER tr_audit_tires AFTER UPDATE ON public.tires FOR EACH ROW EXECUTE FUNCTION audit_inventory_changes();

DROP TRIGGER IF EXISTS tr_audit_parts ON public.parts;
CREATE TRIGGER tr_audit_parts AFTER UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION audit_inventory_changes();

-- ==========================================
-- SUPPLIER MANAGEMENT EXTENSIONS
-- ==========================================

-- Detailed Supplier Payments
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL, -- 'Cash', 'Check', 'Bank Transfer', etc.
    check_number TEXT,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC for Bulk GRN Processing
-- Handles multiple tires and parts in a single transaction
CREATE OR REPLACE FUNCTION process_bulk_grn(
    p_supplier_id UUID,
    p_reference_number TEXT,
    p_notes TEXT,
    p_items JSONB -- Array of { type: 'tire'|'part', brand, model, size, name, category, quantity, cost_price, price, ... }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_grn_id UUID;
    v_item JSONB;
    v_total_cost NUMERIC := 0;
    v_current_item_id UUID;
    v_existing RECORD;
BEGIN
    -- 1. Create the GRN Header
    INSERT INTO public.grns (supplier_id, reference_number, notes, received_date)
    VALUES (p_supplier_id, p_reference_number, p_notes, NOW())
    RETURNING id INTO v_grn_id;

    -- 2. Process each item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_total_cost := v_total_cost + ((v_item->>'quantity')::INTEGER * (v_item->>'cost_price')::NUMERIC);

        IF (v_item->>'type') = 'tire' THEN
            -- Check if tire exists
            SELECT * INTO v_existing FROM public.tires 
            WHERE LOWER(brand) = LOWER(v_item->>'brand') 
              AND LOWER(COALESCE(model, '')) = LOWER(COALESCE(v_item->>'model', ''))
              AND LOWER(size) = LOWER(v_item->>'size')
              AND LOWER(COALESCE(tire_category, '')) = LOWER(COALESCE(v_item->>'tire_category', ''))
            LIMIT 1 FOR UPDATE;

            IF FOUND THEN
                v_current_item_id := v_existing.id;
                UPDATE public.tires SET
                    stock = stock + (v_item->>'quantity')::INTEGER,
                    cost_price = (v_item->>'cost_price')::NUMERIC,
                    price = (v_item->>'price')::NUMERIC,
                    dot_code = COALESCE(v_item->>'dot_code', dot_code),
                    origin = COALESCE(v_item->>'origin', origin),
                    thread_pattern = COALESCE(v_item->>'thread_pattern', thread_pattern),
                    images = COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_item->'images')), images)
                WHERE id = v_current_item_id;
            ELSE
                INSERT INTO public.tires (brand, model, size, tire_category, vehicle_type, stock, cost_price, price, dot_code, origin, thread_pattern, images, supplier_id)
                VALUES (
                    v_item->>'brand', v_item->>'model', v_item->>'size', 
                    v_item->>'tire_category', v_item->>'vehicle_type',
                    (v_item->>'quantity')::INTEGER, (v_item->>'cost_price')::NUMERIC, (v_item->>'price')::NUMERIC,
                    v_item->>'dot_code', v_item->>'origin', v_item->>'thread_pattern', 
                    ARRAY(SELECT jsonb_array_elements_text(v_item->'images')), 
                    p_supplier_id
                ) RETURNING id INTO v_current_item_id;
            END IF;

            INSERT INTO public.grn_items (grn_id, tire_id, quantity, cost_price, subtotal)
            VALUES (v_grn_id, v_current_item_id, (v_item->>'quantity')::INTEGER, (v_item->>'cost_price')::NUMERIC, ((v_item->>'quantity')::INTEGER * (v_item->>'cost_price')::NUMERIC));

        ELSIF (v_item->>'type') = 'part' THEN
            -- Check if part exists
            SELECT * INTO v_existing FROM public.parts 
            WHERE LOWER(name) = LOWER(v_item->>'name') 
              AND LOWER(COALESCE(category, '')) = LOWER(COALESCE(v_item->>'category', ''))
            LIMIT 1 FOR UPDATE;

            IF FOUND THEN
                v_current_item_id := v_existing.id;
                UPDATE public.parts SET
                    stock = stock + (v_item->>'quantity')::INTEGER,
                    cost_price = (v_item->>'cost_price')::NUMERIC,
                    price = (v_item->>'price')::NUMERIC
                WHERE id = v_current_item_id;
            ELSE
                INSERT INTO public.parts (name, category, stock, cost_price, price, supplier_id)
                VALUES (
                    v_item->>'name', v_item->>'category',
                    (v_item->>'quantity')::INTEGER, (v_item->>'cost_price')::NUMERIC, (v_item->>'price')::NUMERIC,
                    p_supplier_id
                ) RETURNING id INTO v_current_item_id;
            END IF;

            INSERT INTO public.grn_items (grn_id, part_id, quantity, cost_price, subtotal)
            VALUES (v_grn_id, v_current_item_id, (v_item->>'quantity')::INTEGER, (v_item->>'cost_price')::NUMERIC, ((v_item->>'quantity')::INTEGER * (v_item->>'cost_price')::NUMERIC));
        END IF;
    END LOOP;

    -- 3. Update GRN Total Cost
    UPDATE public.grns SET total_cost = v_total_cost WHERE id = v_grn_id;

    -- 4. Update Supplier Balance
    UPDATE public.suppliers 
    SET payable_balance = COALESCE(payable_balance, 0) + v_total_cost,
        transactions = COALESCE(transactions, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object(
                'id', extract(epoch from now())::text,
                'date', to_char(now(), 'YYYY-MM-DD'),
                'type', 'Bulk GRN',
                'amount', v_total_cost,
                'description', 'Bulk GRN Ref: ' || COALESCE(p_reference_number, v_grn_id::text)
            )
        )
    WHERE id = p_supplier_id;

    RETURN jsonb_build_object('success', true, 'grn_id', v_grn_id, 'total_cost', v_total_cost);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- RPC for Atomic Supplier Stock Returns
CREATE OR REPLACE FUNCTION process_stock_return(
    p_supplier_id UUID,
    p_item_type TEXT, -- 'tire' | 'part'
    p_item_id UUID,
    p_quantity INTEGER,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_credit NUMERIC := 0;
    v_item_name TEXT;
    v_item_cost NUMERIC;
    v_return_id UUID;
    v_current_stock INTEGER;
BEGIN
    -- 1. Get Item Details and Validate Stock
    IF p_item_type = 'tire' THEN
        SELECT brand || ' ' || size, cost_price, stock INTO v_item_name, v_item_cost, v_current_stock
        FROM public.tires WHERE id = p_item_id FOR UPDATE;
    ELSE
        SELECT name, cost_price, stock INTO v_item_name, v_item_cost, v_current_stock
        FROM public.parts WHERE id = p_item_id FOR UPDATE;
    END IF;

    IF v_current_stock < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock (' || v_current_stock || ') to process return.');
    END IF;

    v_total_credit := v_item_cost * p_quantity;

    -- 2. Deduct Stock
    IF p_item_type = 'tire' THEN
        UPDATE public.tires SET stock = stock - p_quantity WHERE id = p_item_id;
    ELSE
        UPDATE public.parts SET stock = stock - p_quantity WHERE id = p_item_id;
    END IF;

    -- 3. Create Return Record
    INSERT INTO public.supplier_returns (supplier_id, total_credit, reason, items)
    VALUES (
        p_supplier_id, 
        v_total_credit, 
        p_reason, 
        jsonb_build_array(jsonb_build_object(
            'type', p_item_type,
            'id', p_item_id,
            'name', v_item_name,
            'quantity', p_quantity,
            'unit_cost', v_item_cost
        ))
    ) RETURNING id INTO v_return_id;

    -- 4. Update Supplier Ledger
    UPDATE public.suppliers 
    SET payable_balance = GREATEST(0, payable_balance - v_total_credit),
        transactions = COALESCE(transactions, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object(
                'id', extract(epoch from now())::text,
                'date', to_char(now(), 'YYYY-MM-DD'),
                'type', 'Stock Return',
                'amount', v_total_credit,
                'description', 'Return: ' || v_item_name || ' (Qty: ' || p_quantity || ') Ref: ' || v_return_id::text
            )
        )
    WHERE id = p_supplier_id;

    RETURN jsonb_build_object('success', true, 'return_id', v_return_id, 'credit', v_total_credit);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';

