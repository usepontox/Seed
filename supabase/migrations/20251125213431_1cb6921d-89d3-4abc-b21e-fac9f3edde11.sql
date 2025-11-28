-- Fix RLS policies to properly allow operations with empresa_id

-- Drop and recreate policies for produtos
DROP POLICY IF EXISTS "Admin e estoquista podem criar produtos na própria empresa" ON public.produtos;
CREATE POLICY "Admin e estoquista podem criar produtos na própria empresa"
ON public.produtos
FOR INSERT
TO authenticated
WITH CHECK (
  empresa_id = get_user_empresa_id() AND 
  has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role])
);

-- Drop and recreate policies for fornecedores  
DROP POLICY IF EXISTS "Admin e estoquista podem gerenciar fornecedores da própria emp" ON public.fornecedores;
CREATE POLICY "Admin e estoquista podem gerenciar fornecedores da própria empresa"
ON public.fornecedores
FOR ALL
TO authenticated
USING (
  empresa_id = get_user_empresa_id() AND 
  has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role])
)
WITH CHECK (
  empresa_id = get_user_empresa_id() AND 
  has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role])
);

-- Drop and recreate duplicate policy for fornecedores
DROP POLICY IF EXISTS "Admin e estoquista podem ver fornecedores da própria empresa" ON public.fornecedores;

-- Drop and recreate policies for compras
DROP POLICY IF EXISTS "Usuários podem criar compras na própria empresa" ON public.compras;
DROP POLICY IF EXISTS "Admin e estoquista podem criar compras na própria empresa" ON public.compras;

CREATE POLICY "Admin e estoquista podem criar compras"
ON public.compras
FOR INSERT
TO authenticated
WITH CHECK (
  empresa_id = get_user_empresa_id() AND 
  has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role])
);

-- Drop and recreate policies for contas_pagar
DROP POLICY IF EXISTS "Admin e financeiro podem gerenciar contas a pagar da própria e" ON public.contas_pagar;
CREATE POLICY "Admin e financeiro podem gerenciar contas a pagar"
ON public.contas_pagar
FOR ALL
TO authenticated
USING (
  empresa_id = get_user_empresa_id() AND 
  has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'financeiro'::app_role])
)
WITH CHECK (
  empresa_id = get_user_empresa_id() AND 
  has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'financeiro'::app_role])
);

DROP POLICY IF EXISTS "Admin e financeiro podem ver contas a pagar da própria empresa" ON public.contas_pagar;