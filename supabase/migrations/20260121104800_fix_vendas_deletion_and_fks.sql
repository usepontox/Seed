-- Add DELETE policy for vendas
DROP POLICY IF EXISTS "Admin pode excluir vendas da própria empresa" ON public.vendas;

CREATE POLICY "Admin pode excluir vendas da própria empresa" 
ON public.vendas 
FOR DELETE 
USING (
    empresa_id = get_user_empresa_id()
);

-- Update foreign keys to CASCADE
ALTER TABLE public.contas_receber 
DROP CONSTRAINT IF EXISTS contas_receber_venda_id_fkey,
ADD CONSTRAINT contas_receber_venda_id_fkey 
FOREIGN KEY (venda_id) 
REFERENCES public.vendas(id) 
ON DELETE CASCADE;

ALTER TABLE public.notas_fiscais 
DROP CONSTRAINT IF EXISTS notas_fiscais_venda_id_fkey,
ADD CONSTRAINT notas_fiscais_venda_id_fkey 
FOREIGN KEY (venda_id) 
REFERENCES public.vendas(id) 
ON DELETE CASCADE;

-- Ensure transacoes_pix has a cascading FK
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transacoes_pix_venda_id_fkey') THEN
        ALTER TABLE public.transacoes_pix 
        ADD CONSTRAINT transacoes_pix_venda_id_fkey 
        FOREIGN KEY (venda_id) 
        REFERENCES public.vendas(id) 
        ON DELETE CASCADE;
    END IF;
END $$;
