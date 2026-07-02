-- supabase/seed_admin.sql
-- Run ONCE manually in the Supabase SQL Editor AFTER the account
-- douglas_barcellos01@hotmail.com has been created via the app's signup flow.

INSERT INTO profiles (id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'douglas_barcellos01@hotmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
