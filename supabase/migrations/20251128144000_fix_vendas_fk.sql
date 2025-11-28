-- Alterar constraint para permitir exclusão de clientes
ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_cliente_id_fkey;

ALTER TABLE vendas 
    ADD CONSTRAINT vendas_cliente_id_fkey 
    FOREIGN KEY (cliente_id) 
    REFERENCES clientes(id) 
    ON DELETE SET NULL;
