-- ================================================
-- SISTEMA MULTI-TENANT - PARTE 5: RLS POLICIES (VENDAS, COMPRAS, CAIXAS)
-- ================================================

-- ===== VENDAS =====
DROP POLICY IF EXISTS "Usuários podem ver suas próprias vendas" ON public.vendas;
CREATE POLICY "Usuários podem ver vendas da própria empresa"
ON public.vendas FOR SELECT
USING (empresa_id = get_user_empresa_id() AND (operador_id = auth.uid() OR has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'financeiro'::app_role])));

DROP POLICY IF EXISTS "Financeiro pode ver todas as vendas" ON public.vendas;
DROP POLICY IF EXISTS "Admin pode ver todas as vendas" ON public.vendas;

DROP POLICY IF EXISTS "Apenas caixa e admin podem criar vendas" ON public.vendas;
CREATE POLICY "Caixa e admin podem criar vendas na própria empresa"
ON public.vendas FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['caixa'::app_role, 'admin'::app_role]));

DROP POLICY IF EXISTS "Admin e operador podem atualizar suas vendas" ON public.vendas;
CREATE POLICY "Admin e operador podem atualizar vendas da própria empresa"
ON public.vendas FOR UPDATE
USING (empresa_id = get_user_empresa_id() AND (operador_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)));

-- ===== VENDAS_ITENS =====
DROP POLICY IF EXISTS "Usuários podem ver itens de suas próprias vendas" ON public.vendas_itens;
CREATE POLICY "Usuários podem ver itens de vendas da própria empresa"
ON public.vendas_itens FOR SELECT
USING (EXISTS (
  SELECT 1 FROM vendas 
  WHERE vendas.id = vendas_itens.venda_id 
  AND vendas.empresa_id = get_user_empresa_id()
  AND (vendas.operador_id = auth.uid() OR has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'financeiro'::app_role]))
));

DROP POLICY IF EXISTS "Admin e financeiro podem ver todos os itens" ON public.vendas_itens;

DROP POLICY IF EXISTS "Apenas caixa e admin podem criar itens de venda" ON public.vendas_itens;
CREATE POLICY "Caixa e admin podem criar itens de venda da própria empresa"
ON public.vendas_itens FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), VARIADIC ARRAY['caixa'::app_role, 'admin'::app_role])
  AND EXISTS (SELECT 1 FROM vendas WHERE vendas.id = vendas_itens.venda_id AND vendas.empresa_id = get_user_empresa_id())
);

-- ===== COMPRAS =====
DROP POLICY IF EXISTS "Admin e estoquista podem ver compras" ON public.compras;
CREATE POLICY "Admin e estoquista podem ver compras da própria empresa"
ON public.compras FOR SELECT
USING (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role]));

DROP POLICY IF EXISTS "Admin e estoquista podem criar compras" ON public.compras;
CREATE POLICY "Admin e estoquista podem criar compras na própria empresa"
ON public.compras FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role]));

-- ===== COMPRAS_ITENS =====
DROP POLICY IF EXISTS "Admin e estoquista podem ver itens de compra" ON public.compras_itens;
CREATE POLICY "Admin e estoquista podem ver itens de compra da própria empresa"
ON public.compras_itens FOR SELECT
USING (EXISTS (
  SELECT 1 FROM compras 
  WHERE compras.id = compras_itens.compra_id 
  AND compras.empresa_id = get_user_empresa_id()
  AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role])
));

DROP POLICY IF EXISTS "Admin e estoquista podem criar itens de compra" ON public.compras_itens;
CREATE POLICY "Admin e estoquista podem criar itens de compra da própria empresa"
ON public.compras_itens FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role])
  AND EXISTS (SELECT 1 FROM compras WHERE compras.id = compras_itens.compra_id AND compras.empresa_id = get_user_empresa_id())
);

-- ===== CAIXAS =====
DROP POLICY IF EXISTS "Usuários podem ver seus próprios caixas" ON public.caixas;
CREATE POLICY "Usuários podem ver caixas da própria empresa"
ON public.caixas FOR SELECT
USING (empresa_id = get_user_empresa_id() AND (operador_id = auth.uid() OR has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'financeiro'::app_role])));

DROP POLICY IF EXISTS "Admin e financeiro podem ver todos os caixas" ON public.caixas;

DROP POLICY IF EXISTS "Caixa e admin podem criar caixas" ON public.caixas;
CREATE POLICY "Caixa e admin podem criar caixas na própria empresa"
ON public.caixas FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['caixa'::app_role, 'admin'::app_role]));

DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios caixas" ON public.caixas;
CREATE POLICY "Usuários podem atualizar caixas da própria empresa"
ON public.caixas FOR UPDATE
USING (empresa_id = get_user_empresa_id() AND (operador_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)));