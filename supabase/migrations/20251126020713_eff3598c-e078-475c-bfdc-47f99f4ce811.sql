-- Corrigir trigger de cancelamento de vendas para incluir empresa_id
CREATE OR REPLACE FUNCTION public.retornar_estoque_cancelamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Quando uma venda é cancelada, retornar produtos ao estoque
  IF OLD.status = 'finalizada' AND NEW.status = 'cancelada' THEN
    -- Retornar estoque de todos os itens da venda
    UPDATE public.produtos p
    SET estoque_atual = estoque_atual + vi.quantidade
    FROM public.vendas_itens vi
    WHERE vi.venda_id = NEW.id AND vi.produto_id = p.id;
    
    -- Registrar movimentações de estoque (INCLUINDO empresa_id)
    INSERT INTO public.estoque_movimentacoes (
      produto_id,
      tipo,
      quantidade,
      custo_unitario,
      motivo,
      usuario_id,
      empresa_id
    )
    SELECT
      vi.produto_id,
      'entrada',
      vi.quantidade,
      vi.preco_unitario,
      'Cancelamento da Venda #' || NEW.numero_venda,
      NEW.operador_id,
      NEW.empresa_id
    FROM public.vendas_itens vi
    WHERE vi.venda_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;