-- Listar todos os usuários cadastrados no sistema
-- Mostra informações de empresas e seus usuários

-- 1. Listar empresas cadastradas
SELECT 
    'EMPRESAS' as tipo,
    e.nome,
    e.email,
    e.ativo,
    e.created_at
FROM public.empresas e
ORDER BY e.created_at DESC;

-- 2. Listar usuários do Auth (precisa ser executado via Dashboard do Supabase)
-- Vá em: Authentication → Users
-- Ou execute esta query se tiver permissão:
-- SELECT email, created_at FROM auth.users ORDER BY created_at DESC;
