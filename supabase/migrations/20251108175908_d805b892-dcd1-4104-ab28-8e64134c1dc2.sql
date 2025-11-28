-- ================================================
-- SISTEMA MULTI-TENANT - PARTE 2: RLS E FUNÇÕES
-- ================================================

-- 1. Habilitar RLS nas novas tabelas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresas ENABLE ROW LEVEL SECURITY;

-- 2. Criar funções auxiliares
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id 
  FROM public.usuarios_empresas 
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
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
    AND role = 'super_admin'
  )
$$;

-- 3. Trigger para atualizar updated_at em empresas
DROP TRIGGER IF EXISTS update_empresas_updated_at ON public.empresas;
CREATE TRIGGER update_empresas_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RLS Policies para empresas
DROP POLICY IF EXISTS "Super admin pode ver todas empresas" ON public.empresas;
CREATE POLICY "Super admin pode ver todas empresas"
ON public.empresas FOR SELECT
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin pode gerenciar empresas" ON public.empresas;
CREATE POLICY "Super admin pode gerenciar empresas"
ON public.empresas FOR ALL
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Usuários podem ver sua própria empresa" ON public.empresas;
CREATE POLICY "Usuários podem ver sua própria empresa"
ON public.empresas FOR SELECT
USING (id = get_user_empresa_id());

-- 5. RLS Policies para usuarios_empresas
DROP POLICY IF EXISTS "Super admin pode ver todos relacionamentos" ON public.usuarios_empresas;
CREATE POLICY "Super admin pode ver todos relacionamentos"
ON public.usuarios_empresas FOR SELECT
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin pode gerenciar relacionamentos" ON public.usuarios_empresas;
CREATE POLICY "Super admin pode gerenciar relacionamentos"
ON public.usuarios_empresas FOR ALL
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Usuários podem ver seus próprios relacionamentos" ON public.usuarios_empresas;
CREATE POLICY "Usuários podem ver seus próprios relacionamentos"
ON public.usuarios_empresas FOR SELECT
USING (user_id = auth.uid());