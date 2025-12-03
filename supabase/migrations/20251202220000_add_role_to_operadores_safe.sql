-- Migration: Add role column to operadores table (SAFE VERSION)
-- Data: 2025-12-02
-- Descrição: Adicionar coluna role para diferenciar operadores de supervisores

-- Adicionar coluna role se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'operadores' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.operadores
        ADD COLUMN role TEXT NOT NULL DEFAULT 'operador';
    END IF;
END $$;

-- Adicionar constraint se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_operador_role'
    ) THEN
        ALTER TABLE public.operadores
        ADD CONSTRAINT check_operador_role CHECK (role IN ('operador', 'supervisor'));
    END IF;
END $$;

-- Criar índice se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'operadores' 
        AND indexname = 'idx_operadores_role'
    ) THEN
        CREATE INDEX idx_operadores_role ON public.operadores(role);
    END IF;
END $$;

-- Comentário
COMMENT ON COLUMN public.operadores.role IS 'Função do operador: operador ou supervisor';
