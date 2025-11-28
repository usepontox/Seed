-- ================================================
-- SISTEMA MULTI-TENANT - PARTE 4: ATUALIZAR RLS POLICIES
-- ================================================

-- ===== PRODUTOS =====
DROP POLICY IF EXISTS "Todos podem ver produtos" ON public.produtos;
CREATE POLICY "Usuários podem ver produtos da própria empresa"
ON public.produtos FOR SELECT
USING (empresa_id = get_user_empresa_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin e estoquista podem criar produtos" ON public.produtos;
CREATE POLICY "Admin e estoquista podem criar produtos na própria empresa"
ON public.produtos FOR INSERT
WITH CHECK (
  empresa_id = get_user_empresa_id() 
  AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role])
);

DROP POLICY IF EXISTS "Admin e estoquista podem atualizar produtos" ON public.produtos;
CREATE POLICY "Admin e estoquista podem atualizar produtos da própria empresa"
ON public.produtos FOR UPDATE
USING (
  empresa_id = get_user_empresa_id() 
  AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role])
);

DROP POLICY IF EXISTS "Admin e estoquista podem deletar produtos" ON public.produtos;
CREATE POLICY "Admin e estoquista podem deletar produtos da própria empresa"
ON public.produtos FOR DELETE
USING (
  empresa_id = get_user_empresa_id() 
  AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role])
);

-- ===== CLIENTES =====
DROP POLICY IF EXISTS "Admin, caixa e financeiro podem ver clientes" ON public.clientes;
CREATE POLICY "Admin, caixa e financeiro podem ver clientes da própria empresa"
ON public.clientes FOR SELECT
USING (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'caixa'::app_role, 'financeiro'::app_role]));

DROP POLICY IF EXISTS "Admin e caixa podem criar clientes" ON public.clientes;
CREATE POLICY "Admin e caixa podem criar clientes na própria empresa"
ON public.clientes FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'caixa'::app_role]));

DROP POLICY IF EXISTS "Apenas admin pode atualizar clientes" ON public.clientes;
CREATE POLICY "Apenas admin pode atualizar clientes da própria empresa"
ON public.clientes FOR UPDATE
USING (empresa_id = get_user_empresa_id() AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Apenas admin pode deletar clientes" ON public.clientes;
CREATE POLICY "Apenas admin pode deletar clientes da própria empresa"
ON public.clientes FOR DELETE
USING (empresa_id = get_user_empresa_id() AND has_role(auth.uid(), 'admin'::app_role));

-- ===== FORNECEDORES =====
DROP POLICY IF EXISTS "Admin e estoquista podem ver fornecedores" ON public.fornecedores;
CREATE POLICY "Admin e estoquista podem ver fornecedores da própria empresa"
ON public.fornecedores FOR SELECT
USING (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role]));

DROP POLICY IF EXISTS "Admin e estoquista podem gerenciar fornecedores" ON public.fornecedores;
CREATE POLICY "Admin e estoquista podem gerenciar fornecedores da própria empresa"
ON public.fornecedores FOR ALL
USING (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role]));

-- ===== CATEGORIAS =====
DROP POLICY IF EXISTS "Usuários autenticados podem ver categorias" ON public.categorias;
CREATE POLICY "Usuários podem ver categorias da própria empresa"
ON public.categorias FOR SELECT
USING (empresa_id = get_user_empresa_id());

DROP POLICY IF EXISTS "Admin pode gerenciar categorias" ON public.categorias;
CREATE POLICY "Admin pode gerenciar categorias da própria empresa"
ON public.categorias FOR ALL
USING (empresa_id = get_user_empresa_id() AND has_role(auth.uid(), 'admin'::app_role));