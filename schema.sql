
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

-- SALES & ACCOUNTING
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    total NUMERIC DEFAULT 0,
    payment_method TEXT,
    customer_name TEXT,
    vehicle_number TEXT,
    profit NUMERIC DEFAULT 0
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

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time TEXT;

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
    INSERT INTO public.sales (total, payment_method, account_id, customer_name, vehicle_number, profit, created_at)
    VALUES (
        (sale_payload->>'total')::NUMERIC, 
        sale_payload->>'payment_method', 
        CASE WHEN (sale_payload->>'account_id') IS NOT NULL AND (sale_payload->>'account_id') <> '' THEN (sale_payload->>'account_id')::UUID ELSE NULL END,
        sale_payload->>'customer_name', 
        sale_payload->>'vehicle_number', 
        COALESCE((sale_payload->>'profit')::NUMERIC, (sale_payload->>'total')::NUMERIC * 0.25), 
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
ALTER PUBLICATION supabase_realtime ADD TABLE shop_talk;
