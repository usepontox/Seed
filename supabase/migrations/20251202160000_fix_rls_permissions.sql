-- Fornecedores
DROP POLICY IF EXISTS "Admin e estoquista podem gerenciar fornecedores da própria emp" ON public.fornecedores;

CREATE POLICY "Permitir gerenciamento de fornecedores" ON public.fornecedores
FOR ALL
TO authenticated
USING (
  empresa_id = get_user_empresa_id() 
  AND has_any_role(auth.uid(), VARIADIC ARRAY['admin', 'estoquista', 'caixa', 'user']::app_role[])
)
WITH CHECK (
  empresa_id = get_user_empresa_id() 
  AND has_any_role(auth.uid(), VARIADIC ARRAY['admin', 'estoquista', 'caixa', 'user']::app_role[])
);

-- Produtos
DROP POLICY IF EXISTS "Admin e estoquista podem atualizar produtos da própria empresa" ON public.produtos;
DROP POLICY IF EXISTS "Admin e estoquista podem criar produtos na própria empresa" ON public.produtos;
DROP POLICY IF EXISTS "Admin e estoquista podem deletar produtos da própria empresa" ON public.produtos;

CREATE POLICY "Permitir gerenciamento de produtos" ON public.produtos
FOR ALL
TO authenticated
USING (
  empresa_id = get_user_empresa_id() 
  AND has_any_role(auth.uid(), VARIADIC ARRAY['admin', 'estoquista', 'caixa', 'user']::app_role[])
)
WITH CHECK (
  empresa_id = get_user_empresa_id() 
  AND has_any_role(auth.uid(), VARIADIC ARRAY['admin', 'estoquista', 'caixa', 'user']::app_role[])
);

-- Contas a Receber
DROP POLICY IF EXISTS "Admin e financeiro podem gerenciar contas a receber da própria" ON public.contas_receber;

CREATE POLICY "Permitir gerenciamento de contas a receber" ON public.contas_receber
FOR ALL
TO authenticated
USING (
  empresa_id = get_user_empresa_id() 
  AND has_any_role(auth.uid(), VARIADIC ARRAY['admin', 'financeiro', 'caixa', 'user']::app_role[])
)
WITH CHECK (
  empresa_id = get_user_empresa_id() 
  AND has_any_role(auth.uid(), VARIADIC ARRAY['admin', 'financeiro', 'caixa', 'user']::app_role[])
);

-- Contas a Pagar
DROP POLICY IF EXISTS "Admin e financeiro podem gerenciar contas a pagar" ON public.contas_pagar;

CREATE POLICY "Permitir gerenciamento de contas a pagar" ON public.contas_pagar
FOR ALL
TO authenticated
USING (
  empresa_id = get_user_empresa_id() 
  AND has_any_role(auth.uid(), VARIADIC ARRAY['admin', 'financeiro', 'caixa', 'user']::app_role[])
)
WITH CHECK (
  empresa_id = get_user_empresa_id() 
  AND has_any_role(auth.uid(), VARIADIC ARRAY['admin', 'financeiro', 'caixa', 'user']::app_role[])
);
