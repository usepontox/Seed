-- ================================================
-- SISTEMA MULTI-TENANT - PARTE 6: RLS POLICIES FINAIS (FINANCEIRO E ESTOQUE)
-- ================================================

-- ===== CONTAS A PAGAR =====
DROP POLICY IF EXISTS "Admin e financeiro podem ver contas a pagar" ON public.contas_pagar;
CREATE POLICY "Admin e financeiro podem ver contas a pagar da própria empresa"
ON public.contas_pagar FOR SELECT
USING (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'financeiro'::app_role]));

DROP POLICY IF EXISTS "Admin e financeiro podem gerenciar contas a pagar" ON public.contas_pagar;
CREATE POLICY "Admin e financeiro podem gerenciar contas a pagar da própria empresa"
ON public.contas_pagar FOR ALL
USING (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'financeiro'::app_role]));

-- ===== CONTAS A RECEBER =====
DROP POLICY IF EXISTS "Admin e financeiro podem ver contas a receber" ON public.contas_receber;
CREATE POLICY "Admin e financeiro podem ver contas a receber da própria empresa"
ON public.contas_receber FOR SELECT
USING (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'financeiro'::app_role]));

DROP POLICY IF EXISTS "Admin e financeiro podem gerenciar contas a receber" ON public.contas_receber;
CREATE POLICY "Admin e financeiro podem gerenciar contas a receber da própria empresa"
ON public.contas_receber FOR ALL
USING (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'financeiro'::app_role]));

-- ===== ESTOQUE MOVIMENTAÇÕES =====
DROP POLICY IF EXISTS "Admin e estoquista podem ver movimentações" ON public.estoque_movimentacoes;
CREATE POLICY "Admin e estoquista podem ver movimentações da própria empresa"
ON public.estoque_movimentacoes FOR SELECT
USING (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role]));

DROP POLICY IF EXISTS "Admin e estoquista podem criar movimentações" ON public.estoque_movimentacoes;
CREATE POLICY "Admin e estoquista podem criar movimentações na própria empresa"
ON public.estoque_movimentacoes FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id() AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role]));