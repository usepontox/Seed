-- Migration to allow deletion of produtos by setting references to NULL
-- Affected tables: vendas_itens, compras_itens

-- 1. Fix 'vendas_itens' table
ALTER TABLE public.vendas_itens 
DROP CONSTRAINT IF EXISTS vendas_itens_produto_id_fkey;

ALTER TABLE public.vendas_itens
ADD CONSTRAINT vendas_itens_produto_id_fkey
FOREIGN KEY (produto_id) 
REFERENCES public.produtos(id) 
ON DELETE SET NULL;

-- 2. Fix 'compras_itens' table
ALTER TABLE public.compras_itens 
DROP CONSTRAINT IF EXISTS compras_itens_produto_id_fkey;

ALTER TABLE public.compras_itens
ADD CONSTRAINT compras_itens_produto_id_fkey
FOREIGN KEY (produto_id) 
REFERENCES public.produtos(id) 
ON DELETE SET NULL;
