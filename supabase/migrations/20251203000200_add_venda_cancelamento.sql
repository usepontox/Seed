-- Migration: Add cancellation fields to vendas table
-- Data: 2025-12-03
-- Descrição: Adicionar campos para controle de cancelamento de vendas

-- Adicionar campos de cancelamento
ALTER TABLE public.vendas
ADD COLUMN IF NOT EXISTS cancelada_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelada_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

-- Atualizar constraint de status para incluir 'cancelada'
ALTER TABLE public.vendas
DROP CONSTRAINT IF EXISTS vendas_status_check;

ALTER TABLE public.vendas
ADD CONSTRAINT vendas_status_check 
CHECK (status IN ('pendente', 'finalizada', 'cancelada'));

-- Índice para buscar vendas canceladas
CREATE INDEX IF NOT EXISTS idx_vendas_cancelada_em ON public.vendas(cancelada_em) WHERE cancelada_em IS NOT NULL;

-- Comentários
COMMENT ON COLUMN public.vendas.cancelada_em IS 'Data e hora do cancelamento da venda';
COMMENT ON COLUMN public.vendas.cancelada_por IS 'Usuário que cancelou a venda';
COMMENT ON COLUMN public.vendas.motivo_cancelamento IS 'Motivo do cancelamento';
