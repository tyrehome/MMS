-- This script helps ensure your profiles table is ready for the simplified auth logic.
-- Run this in your Supabase SQL Editor.

-- 1. Ensure the profiles table has a role column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'staff';
    END IF;
END $$;

-- 2. Optional: Set a specific user as admin (replace with actual email or ID)
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';

-- 3. Ensure RLS allows reading profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to profiles" 
ON profiles FOR SELECT 
USING (true);

-- 4. Audit Log Table Check (used by the app)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action TEXT,
    table_name TEXT,
    record_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    notes JSONB
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own logs" ON audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all logs" ON audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
