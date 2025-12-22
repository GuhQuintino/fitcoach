
-- Replace 'seu_email@exemplo.com' with the email of the user you want to promote to Admin
UPDATE profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'seu_email@exemplo.com');
