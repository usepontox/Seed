-- Script para permitir deletar produtos mesmo com vendas associadas
-- Execute este script no Editor SQL do Supabase Dashboard

-- 1. Remove a constraint antiga
ALTER TABLE vendas_itens 
DROP CONSTRAINT IF EXISTS vendas_itens_produto_id_fkey;

-- 2. Adiciona nova constraint com ON DELETE SET NULL
-- Isso fará com que quando um produto for deletado, o produto_id nos itens de venda seja definido como NULL
ALTER TABLE vendas_itens 
ADD CONSTRAINT vendas_itens_produto_id_fkey 
FOREIGN KEY (produto_id) 
REFERENCES produtos(id) 
ON DELETE SET NULL;

-- Alternativa: Se preferir deletar os itens de venda quando o produto for deletado (CASCADE):
-- ALTER TABLE vendas_itens 
-- ADD CONSTRAINT vendas_itens_produto_id_fkey 
-- FOREIGN KEY (produto_id) 
-- REFERENCES produtos(id) 
-- ON DELETE CASCADE;
