-- Habilitar Realtime para a tabela access_logs
-- Isso permite que o frontend receba notificações em tempo real quando houver mudanças

-- 1. Habilitar replicação para a tabela
ALTER TABLE public.access_logs REPLICA IDENTITY FULL;

-- 2. Habilitar publicação (Realtime)
-- NOTA: Execute este comando no painel do Supabase em:
-- Database → Replication → access_logs → Enable Realtime

-- Ou execute via SQL (se tiver permissão):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.access_logs;
