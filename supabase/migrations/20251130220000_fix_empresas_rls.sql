-- Função para verificar se é admin ou super_admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role::text IN ('admin', 'super_admin')
  ) OR EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = _user_id 
    AND email = 'admin@admin.com'
  )
$$;

-- Atualizar políticas da tabela empresas

-- Remover políticas antigas se existirem (para evitar conflitos)
DROP POLICY IF EXISTS "Super admin pode ver todas empresas" ON public.empresas;
DROP POLICY IF EXISTS "Super admin pode gerenciar empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins podem ver todas empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins podem gerenciar empresas" ON public.empresas;

-- Criar novas políticas mais permissivas para admins
CREATE POLICY "Admins podem ver todas empresas"
ON public.empresas FOR SELECT
TO authenticated
USING (is_admin_or_super_admin(auth.uid()) OR id = get_user_empresa_id());

CREATE POLICY "Admins podem gerenciar empresas"
ON public.empresas FOR ALL
TO authenticated
USING (is_admin_or_super_admin(auth.uid()));

-- Atualizar políticas da tabela usuarios_empresas

DROP POLICY IF EXISTS "Super admin pode ver todos relacionamentos" ON public.usuarios_empresas;
DROP POLICY IF EXISTS "Super admin pode gerenciar relacionamentos" ON public.usuarios_empresas;
DROP POLICY IF EXISTS "Admins podem ver todos relacionamentos" ON public.usuarios_empresas;
DROP POLICY IF EXISTS "Admins podem gerenciar relacionamentos" ON public.usuarios_empresas;

CREATE POLICY "Admins podem ver todos relacionamentos"
ON public.usuarios_empresas FOR SELECT
TO authenticated
USING (is_admin_or_super_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar relacionamentos"
ON public.usuarios_empresas FOR ALL
TO authenticated
USING (is_admin_or_super_admin(auth.uid()));
