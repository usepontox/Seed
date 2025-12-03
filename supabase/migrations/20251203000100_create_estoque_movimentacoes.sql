-- Migration: Create estoque_movimentacoes table
-- Data: 2025-12-03
-- Descrição: Tabela para rastrear todas as movimentações de estoque

-- Criar tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    
    -- Tipo de movimentação
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'estorno')),
    
    -- Quantidades
    quantidade DECIMAL(10, 3) NOT NULL,
    estoque_anterior DECIMAL(10, 3) NOT NULL,
    estoque_novo DECIMAL(10, 3) NOT NULL,
    
    -- Referência (o que causou a movimentação)
    referencia_tipo TEXT, -- 'venda', 'compra', 'ajuste_manual', 'cancelamento_venda', etc
    referencia_id UUID, -- ID da venda, compra, etc
    
    -- Quem fez
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    operador_id UUID REFERENCES public.operadores(id) ON DELETE SET NULL,
    
    -- Observações
    observacao TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_estoque_mov_produto_id ON public.estoque_movimentacoes(produto_id);
CREATE INDEX idx_estoque_mov_empresa_id ON public.estoque_movimentacoes(empresa_id);
CREATE INDEX idx_estoque_mov_tipo ON public.estoque_movimentacoes(tipo);
CREATE INDEX idx_estoque_mov_referencia ON public.estoque_movimentacoes(referencia_tipo, referencia_id);
CREATE INDEX idx_estoque_mov_created_at ON public.estoque_movimentacoes(created_at DESC);

-- RLS Policies
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver movimentações da própria empresa
CREATE POLICY "Usuários podem ver movimentações da própria empresa"
    ON public.estoque_movimentacoes
    FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.usuarios_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Usuários podem inserir movimentações na própria empresa
CREATE POLICY "Usuários podem inserir movimentações na própria empresa"
    ON public.estoque_movimentacoes
    FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.usuarios_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Comentários
COMMENT ON TABLE public.estoque_movimentacoes IS 'Histórico de todas as movimentações de estoque';
COMMENT ON COLUMN public.estoque_movimentacoes.tipo IS 'Tipo de movimentação: entrada, saida, ajuste, estorno';
COMMENT ON COLUMN public.estoque_movimentacoes.referencia_tipo IS 'O que causou a movimentação';
COMMENT ON COLUMN public.estoque_movimentacoes.referencia_id IS 'ID do registro que causou a movimentação';
