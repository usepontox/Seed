-- Criar tabela de assinaturas
CREATE TABLE IF NOT EXISTS public.assinaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    plano TEXT NOT NULL DEFAULT 'basic',
    valor_mensal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    dia_vencimento INTEGER NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'ativo',
    ultimo_pagamento TIMESTAMP WITH TIME ZONE,
    proximo_vencimento TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_assinaturas_empresa_id ON public.assinaturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON public.assinaturas(status);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados da mesma empresa
CREATE POLICY "Usuários podem ver assinaturas da própria empresa"
    ON public.assinaturas
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_empresas ue
            WHERE ue.empresa_id = assinaturas.empresa_id
            AND ue.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM auth.users u
            WHERE u.id = auth.uid()
            AND (u.raw_user_meta_data->>'role' = 'admin' OR u.raw_user_meta_data->>'role' = 'super_admin')
        )
    );

-- Política para permitir inserção/atualização apenas para admins
CREATE POLICY "Apenas admins podem modificar assinaturas"
    ON public.assinaturas
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users u
            WHERE u.id = auth.uid()
            AND (u.raw_user_meta_data->>'role' = 'admin' OR u.raw_user_meta_data->>'role' = 'super_admin')
        )
    );

-- Adicionar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assinaturas_updated_at
    BEFORE UPDATE ON public.assinaturas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.assinaturas IS 'Tabela de assinaturas/planos das empresas';
COMMENT ON COLUMN public.assinaturas.plano IS 'Tipo de plano: free, basic, pro, enterprise';
COMMENT ON COLUMN public.assinaturas.status IS 'Status da assinatura: ativo, inativo, pendente, bloqueado';
