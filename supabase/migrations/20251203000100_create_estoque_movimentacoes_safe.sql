-- Migration: Create/Update estoque_movimentacoes table (FIXED VERSION)
-- Data: 2025-12-03
-- Descrição: Tabela para rastrear todas as movimentações de estoque

-- PASSO 1: Criar tabela base
CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'estorno')),
    quantidade DECIMAL(10, 3) NOT NULL,
    estoque_anterior DECIMAL(10, 3) NOT NULL,
    estoque_novo DECIMAL(10, 3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASSO 2: Adicionar colunas que podem estar faltando
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estoque_movimentacoes' AND column_name = 'referencia_tipo') THEN
        ALTER TABLE public.estoque_movimentacoes ADD COLUMN referencia_tipo TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estoque_movimentacoes' AND column_name = 'referencia_id') THEN
        ALTER TABLE public.estoque_movimentacoes ADD COLUMN referencia_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estoque_movimentacoes' AND column_name = 'usuario_id') THEN
        ALTER TABLE public.estoque_movimentacoes ADD COLUMN usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estoque_movimentacoes' AND column_name = 'operador_id') THEN
        ALTER TABLE public.estoque_movimentacoes ADD COLUMN operador_id UUID REFERENCES public.operadores(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estoque_movimentacoes' AND column_name = 'observacao') THEN
        ALTER TABLE public.estoque_movimentacoes ADD COLUMN observacao TEXT;
    END IF;
END $$;

-- PASSO 3: Criar índices (SOMENTE DEPOIS das colunas existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_estoque_mov_produto_id') THEN
        CREATE INDEX idx_estoque_mov_produto_id ON public.estoque_movimentacoes(produto_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_estoque_mov_empresa_id') THEN
        CREATE INDEX idx_estoque_mov_empresa_id ON public.estoque_movimentacoes(empresa_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_estoque_mov_tipo') THEN
        CREATE INDEX idx_estoque_mov_tipo ON public.estoque_movimentacoes(tipo);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_estoque_mov_referencia') THEN
        CREATE INDEX idx_estoque_mov_referencia ON public.estoque_movimentacoes(referencia_tipo, referencia_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_estoque_mov_created_at') THEN
        CREATE INDEX idx_estoque_mov_created_at ON public.estoque_movimentacoes(created_at DESC);
    END IF;
END $$;

-- PASSO 4: RLS Policies
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver movimentações da própria empresa" ON public.estoque_movimentacoes;
DROP POLICY IF EXISTS "Usuários podem inserir movimentações na própria empresa" ON public.estoque_movimentacoes;

CREATE POLICY "Usuários podem ver movimentações da própria empresa"
    ON public.estoque_movimentacoes FOR SELECT
    USING (empresa_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()));

CREATE POLICY "Usuários podem inserir movimentações na própria empresa"
    ON public.estoque_movimentacoes FOR INSERT
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()));

-- PASSO 5: Comentários
COMMENT ON TABLE public.estoque_movimentacoes IS 'Histórico de todas as movimentações de estoque';
COMMENT ON COLUMN public.estoque_movimentacoes.tipo IS 'Tipo de movimentação: entrada, saida, ajuste, estorno';
COMMENT ON COLUMN public.estoque_movimentacoes.referencia_tipo IS 'O que causou a movimentação';
COMMENT ON COLUMN public.estoque_movimentacoes.referencia_id IS 'ID do registro que causou a movimentação';
