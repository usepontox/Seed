-- Adicionar campo NCM na tabela produtos
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS ncm VARCHAR(8);

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.produtos.ncm IS 'Nomenclatura Comum do Mercosul - código de 8 dígitos';

-- Criar função para retornar estoque ao cancelar venda
CREATE OR REPLACE FUNCTION public.retornar_estoque_cancelamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando uma venda é cancelada, retornar produtos ao estoque
  IF OLD.status = 'finalizada' AND NEW.status = 'cancelada' THEN
    -- Retornar estoque de todos os itens da venda
    UPDATE public.produtos p
    SET estoque_atual = estoque_atual + vi.quantidade
    FROM public.vendas_itens vi
    WHERE vi.venda_id = NEW.id AND vi.produto_id = p.id;
    
    -- Registrar movimentações de estoque
    INSERT INTO public.estoque_movimentacoes (
      produto_id,
      tipo,
      quantidade,
      custo_unitario,
      motivo,
      usuario_id
    )
    SELECT
      vi.produto_id,
      'entrada',
      vi.quantidade,
      vi.preco_unitario,
      'Cancelamento da Venda #' || NEW.numero_venda,
      NEW.operador_id
    FROM public.vendas_itens vi
    WHERE vi.venda_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para cancelamento de vendas
DROP TRIGGER IF EXISTS retornar_estoque_ao_cancelar ON public.vendas;
CREATE TRIGGER retornar_estoque_ao_cancelar
  AFTER UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.retornar_estoque_cancelamento();