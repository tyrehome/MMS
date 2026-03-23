-- Fix for tasks table 400 Bad Request error
-- Add missing columns to the tasks table

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS customer_name TEXT;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS vehicle_number TEXT;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- Update RLS policies if necessary (usually not needed for just adding columns, 
-- but ensuring authenticated users can still interact)
-- Assuming existing policies are sufficient.
