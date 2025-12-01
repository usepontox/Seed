-- Limpar todos os logs de acesso
-- Isso vai resetar a contagem de "Usuários Online" para 0

DELETE FROM public.access_logs;

-- Verificar se foi limpo
SELECT COUNT(*) as total_logs FROM public.access_logs;
