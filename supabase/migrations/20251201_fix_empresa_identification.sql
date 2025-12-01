-- Atualizar função get_user_empresa_id para lidar com admins sem empresa vinculada
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Primeiro tenta pegar da tabela usuarios_empresas
  SELECT COALESCE(
    (
      SELECT empresa_id 
      FROM public.usuarios_empresas 
      WHERE user_id = auth.uid()
      LIMIT 1
    ),
    -- Se não encontrar e o usuário for admin/super_admin, pega a primeira empresa disponível
    (
      SELECT e.id
      FROM public.empresas e
      WHERE EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role::text IN ('admin', 'super_admin')
      )
      OR EXISTS (
        SELECT 1 
        FROM auth.users u
        WHERE u.id = auth.uid() 
        AND u.email = 'admin@admin.com'
      )
      LIMIT 1
    )
  )
$$;
