-- Migration: Clean admin stock while preserving client data
-- Date: 2025-12-09
-- Admin: admin@admin.com.br
-- Action: Delete all products from admin's empresa, keep client stocks intact

-- Step 1: Identify admin's empresa_id
DO $$ 
DECLARE
    admin_empresa_id uuid;
    produtos_deletados integer;
BEGIN
    -- Get admin's empresa_id
    SELECT ue.empresa_id INTO admin_empresa_id
    FROM profiles p
    JOIN usuarios_empresas ue ON ue.user_id = p.id
    WHERE p.email = 'admin@admin.com.br'
    LIMIT 1;
    
    IF admin_empresa_id IS NULL THEN
        RAISE NOTICE 'Admin empresa not found for admin@admin.com.br';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Admin empresa_id: %', admin_empresa_id;
    
    -- Count products before deletion
    SELECT COUNT(*) INTO produtos_deletados
    FROM produtos
    WHERE empresa_id = admin_empresa_id;
    
    RAISE NOTICE 'Products to delete: %', produtos_deletados;
    
    -- Step 2: Delete admin's products (cascades to vendas_itens, compras_itens, etc)
    DELETE FROM produtos 
    WHERE empresa_id = admin_empresa_id;
    
    RAISE NOTICE 'Deleted % products from admin empresa', produtos_deletados;
    
    -- Step 3: Clean related records
    DELETE FROM estoque_movimentacoes 
    WHERE empresa_id = admin_empresa_id;
    
    DELETE FROM categorias 
    WHERE empresa_id = admin_empresa_id;
    
    DELETE FROM fornecedores 
    WHERE empresa_id = admin_empresa_id;
    
    RAISE NOTICE 'Cleaned related records (movimentacoes, categorias, fornecedores)';
END $$;

-- Step 4: Verify deletion and show client stocks are intact
SELECT 
    e.nome as empresa,
    p.email as admin_email,
    COUNT(pr.id) as total_produtos
FROM empresas e
LEFT JOIN usuarios_empresas ue ON ue.empresa_id = e.id
LEFT JOIN profiles p ON p.id = ue.user_id
LEFT JOIN produtos pr ON pr.empresa_id = e.id
WHERE p.email IN ('admin@admin.com.br', 'vanildaoliveira866@gmail.com')
   OR e.id IN (SELECT empresa_id FROM usuarios_empresas WHERE user_id IN 
       (SELECT id FROM profiles WHERE email IN ('admin@admin.com.br', 'vanildaoliveira866@gmail.com')))
GROUP BY e.nome, p.email
ORDER BY e.nome;

-- Final verification: Show all companies with their product counts
SELECT 
    e.nome as empresa,
    e.cnpj,
    COUNT(DISTINCT p.id) as total_produtos,
    COUNT(DISTINCT ue.user_id) as total_usuarios,
    STRING_AGG(DISTINCT prof.email, ', ') as usuarios
FROM empresas e
LEFT JOIN produtos p ON p.empresa_id = e.id
LEFT JOIN usuarios_empresas ue ON ue.empresa_id = e.id
LEFT JOIN profiles prof ON prof.id = ue.user_id
GROUP BY e.id, e.nome, e.cnpj
ORDER BY e.nome;
