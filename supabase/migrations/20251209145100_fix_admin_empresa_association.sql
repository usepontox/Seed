-- Migration: Fix admin empresa association
-- Date: 2025-12-09
-- Problem: Admin is seeing client's stock instead of own stock

-- Step 1: Investigate current associations
-- Check which empresa_id the admin is linked to
SELECT 
    p.email,
    p.nome,
    ue.empresa_id,
    e.nome as empresa_nome,
    e.cnpj
FROM auth.users au
JOIN profiles p ON p.id = au.id
LEFT JOIN usuarios_empresas ue ON ue.user_id = au.id
LEFT JOIN empresas e ON e.id = ue.empresa_id
WHERE p.email IN ('admin@admin.com', 'vanildaoliveira866@gmail.com')
ORDER BY p.email;

-- Step 2: Find or create admin's own empresa
DO $$ 
DECLARE
    admin_user_id uuid;
    admin_empresa_id uuid;
    client_user_id uuid;
    client_empresa_id uuid;
BEGIN
    -- Get admin user id
    SELECT id INTO admin_user_id 
    FROM profiles 
    WHERE email = 'admin@admin.com';
    
    -- Get client user id
    SELECT id INTO client_user_id 
    FROM profiles 
    WHERE email = 'vanildaoliveira866@gmail.com';
    
    -- Get client's empresa_id
    SELECT empresa_id INTO client_empresa_id
    FROM usuarios_empresas
    WHERE user_id = client_user_id
    LIMIT 1;
    
    -- Check if admin has an empresa named "Administração" or "Admin"
    SELECT id INTO admin_empresa_id
    FROM empresas
    WHERE nome ILIKE '%admin%' OR nome ILIKE '%administra%'
    LIMIT 1;
    
    -- If no admin empresa exists, create one
    IF admin_empresa_id IS NULL THEN
        INSERT INTO empresas (
            nome,
            razao_social,
            cnpj,
            telefone,
            email
        ) VALUES (
            'Administração Sistema',
            'Administração Sistema LTDA',
            '00000000000000', -- Placeholder CNPJ
            '(00) 0000-0000',
            'admin@admin.com'
        )
        RETURNING id INTO admin_empresa_id;
        
        RAISE NOTICE 'Created admin empresa with id: %', admin_empresa_id;
    END IF;
    
    -- Remove admin from client's empresa (if linked)
    DELETE FROM usuarios_empresas 
    WHERE user_id = admin_user_id 
    AND empresa_id = client_empresa_id;
    
    -- Link admin to admin empresa
    INSERT INTO usuarios_empresas (user_id, empresa_id, role)
    VALUES (admin_user_id, admin_empresa_id, 'admin')
    ON CONFLICT (user_id, empresa_id) DO NOTHING;
    
    RAISE NOTICE 'Admin linked to empresa: %', admin_empresa_id;
    RAISE NOTICE 'Client empresa: %', client_empresa_id;
END $$;

-- Step 3: Verify the fix
SELECT 
    p.email,
    p.nome,
    ue.empresa_id,
    e.nome as empresa_nome,
    e.cnpj,
    (SELECT COUNT(*) FROM produtos WHERE empresa_id = ue.empresa_id) as total_produtos
FROM auth.users au
JOIN profiles p ON p.id = au.id
LEFT JOIN usuarios_empresas ue ON ue.user_id = au.id
LEFT JOIN empresas e ON e.id = ue.empresa_id
WHERE p.email IN ('admin@admin.com', 'vanildaoliveira866@gmail.com')
ORDER BY p.email;
