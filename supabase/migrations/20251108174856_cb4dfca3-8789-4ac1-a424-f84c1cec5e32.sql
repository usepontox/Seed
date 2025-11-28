-- Fix produtos RLS policy: Split ALL policy into separate SELECT, INSERT, UPDATE, DELETE
-- This prevents caixa role from managing products (only allows SELECT for PDV lookups)

DROP POLICY IF EXISTS "Admin, estoquista e caixa podem gerenciar produtos" ON public.produtos;
DROP POLICY IF EXISTS "Usuários autenticados podem ver produtos" ON public.produtos;

-- Allow all authenticated users to view products (for PDV lookups)
CREATE POLICY "Todos podem ver produtos"
ON public.produtos FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admin and estoquista can create products
CREATE POLICY "Admin e estoquista podem criar produtos"
ON public.produtos FOR INSERT
WITH CHECK (has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role]));

-- Only admin and estoquista can update products
CREATE POLICY "Admin e estoquista podem atualizar produtos"
ON public.produtos FOR UPDATE
USING (has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role]));

-- Only admin and estoquista can delete products
CREATE POLICY "Admin e estoquista podem deletar produtos"
ON public.produtos FOR DELETE
USING (has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role]));

-- Fix configuracoes_empresa RLS policy: Restrict to admin and financeiro only
DROP POLICY IF EXISTS "Usuários autenticados podem ver configurações" ON public.configuracoes_empresa;
DROP POLICY IF EXISTS "Admin pode gerenciar configurações" ON public.configuracoes_empresa;

-- Only admin and financeiro can view company configuration
CREATE POLICY "Admin e financeiro podem ver configurações"
ON public.configuracoes_empresa FOR SELECT
USING (has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'financeiro'::app_role]));

-- Only admin can manage company configuration
CREATE POLICY "Admin pode gerenciar configurações"
ON public.configuracoes_empresa FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a view for caixa role to access only company name for fiscal coupon
CREATE OR REPLACE VIEW public.configuracoes_empresa_publico AS
SELECT 
  id,
  nome_empresa,
  logo_url
FROM public.configuracoes_empresa;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.configuracoes_empresa_publico TO authenticated;