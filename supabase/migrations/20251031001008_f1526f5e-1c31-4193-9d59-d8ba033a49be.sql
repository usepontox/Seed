-- Atualizar política RLS para permitir que caixa também gerencie produtos
DROP POLICY IF EXISTS "Admin e estoquista podem gerenciar produtos" ON public.produtos;

CREATE POLICY "Admin, estoquista e caixa podem gerenciar produtos"
ON public.produtos
FOR ALL
USING (has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role, 'caixa'::app_role]));