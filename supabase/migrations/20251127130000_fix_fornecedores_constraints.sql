-- Migration to allow deletion of fornecedores by setting references to NULL
-- Affected tables: compras, contas_pagar

-- 1. Fix 'compras' table
ALTER TABLE public.compras 
DROP CONSTRAINT IF EXISTS compras_fornecedor_id_fkey;

ALTER TABLE public.compras
ADD CONSTRAINT compras_fornecedor_id_fkey
FOREIGN KEY (fornecedor_id) 
REFERENCES public.fornecedores(id) 
ON DELETE SET NULL;

-- 2. Fix 'contas_pagar' table
ALTER TABLE public.contas_pagar 
DROP CONSTRAINT IF EXISTS contas_pagar_fornecedor_id_fkey;

ALTER TABLE public.contas_pagar
ADD CONSTRAINT contas_pagar_fornecedor_id_fkey
FOREIGN KEY (fornecedor_id) 
REFERENCES public.fornecedores(id) 
ON DELETE SET NULL;
