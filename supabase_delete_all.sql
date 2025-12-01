-- ⚠️ ATENÇÃO: ESTE SCRIPT APAGA TODOS OS DADOS DO SISTEMA ⚠️
-- Execute com EXTREMO cuidado!

-- 1. Deletar todas as assinaturas
DELETE FROM public.assinaturas;

-- 2. Deletar todas as relações usuário-empresa
DELETE FROM public.usuarios_empresas;

-- 3. Deletar todas as empresas (isso vai deletar em cascata outros dados relacionados)
DELETE FROM public.empresas;

-- 4. Deletar usuários do Auth (exceto admin@admin.com)
-- NOTA: Isso precisa ser feito via Edge Function ou manualmente no painel do Supabase
-- porque não temos acesso direto à tabela auth.users via SQL

-- Verificar o que sobrou
SELECT 'Empresas restantes:' as info, COUNT(*) as total FROM public.empresas
UNION ALL
SELECT 'Assinaturas restantes:', COUNT(*) FROM public.assinaturas
UNION ALL
SELECT 'Relações usuário-empresa restantes:', COUNT(*) FROM public.usuarios_empresas;
