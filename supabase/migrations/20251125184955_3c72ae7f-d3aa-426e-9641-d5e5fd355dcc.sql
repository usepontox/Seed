-- Políticas RLS para tabela compras
-- Permitir INSERT para usuários autenticados na própria empresa
CREATE POLICY "Usuários podem criar compras na própria empresa"
ON public.compras
FOR INSERT
TO authenticated
WITH CHECK (empresa_id = get_user_empresa_id());

-- Permitir UPDATE apenas para o usuário que criou a compra
CREATE POLICY "Usuário pode atualizar suas próprias compras"
ON public.compras
FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid() OR has_role(auth.uid(), 'admin'))
WITH CHECK (usuario_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Adicionar campos de NFC-e na tabela vendas
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS nfce_status TEXT DEFAULT 'pendente';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS nfce_chave TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS nfce_xml TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS nfce_protocolo TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS nfce_data_emissao TIMESTAMP WITH TIME ZONE;

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_vendas_nfce_status ON public.vendas(nfce_status);
CREATE INDEX IF NOT EXISTS idx_vendas_nfce_chave ON public.vendas(nfce_chave);
CREATE INDEX IF NOT EXISTS idx_vendas_data_emissao ON public.vendas(nfce_data_emissao);