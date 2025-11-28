-- Drop políticas antigas
DROP POLICY IF EXISTS "Admin pode gerenciar configurações" ON public.configuracoes_empresa;
DROP POLICY IF EXISTS "Admin e financeiro podem ver configurações" ON public.configuracoes_empresa;

-- Criar novas políticas mais permissivas
CREATE POLICY "Usuários autenticados podem ver configurações"
ON public.configuracoes_empresa
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem criar configurações"
ON public.configuracoes_empresa
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar configurações"
ON public.configuracoes_empresa
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Apenas admin pode deletar configurações"
ON public.configuracoes_empresa
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));