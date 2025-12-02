-- Migration: Add operador_pdv_id to caixas table
-- Data: 2025-12-02

ALTER TABLE public.caixas 
ADD COLUMN IF NOT EXISTS operador_pdv_id UUID REFERENCES public.operadores(id);

-- Add comment
COMMENT ON COLUMN public.caixas.operador_pdv_id IS 'Reference to the operadores table (cashier operator)';
