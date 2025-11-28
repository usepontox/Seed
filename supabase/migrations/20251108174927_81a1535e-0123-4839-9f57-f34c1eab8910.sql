-- Fix security definer view by making it security invoker
DROP VIEW IF EXISTS public.configuracoes_empresa_publico;

CREATE OR REPLACE VIEW public.configuracoes_empresa_publico 
WITH (security_invoker = true) AS
SELECT 
  id,
  nome_empresa,
  logo_url
FROM public.configuracoes_empresa;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.configuracoes_empresa_publico TO authenticated;