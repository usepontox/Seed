-- Fix triggers to include empresa_id in stock movements

-- Drop existing triggers first (proper order and names)
DROP TRIGGER IF EXISTS trigger_atualizar_estoque_compra ON compras_itens;
DROP TRIGGER IF EXISTS atualizar_estoque_trigger ON vendas_itens;

-- Drop existing functions with CASCADE
DROP FUNCTION IF EXISTS atualizar_estoque_compra() CASCADE;
DROP FUNCTION IF EXISTS atualizar_estoque_venda() CASCADE;

-- Recreate function for purchase stock updates with empresa_id
CREATE OR REPLACE FUNCTION public.atualizar_estoque_compra()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update product stock
  UPDATE public.produtos 
  SET estoque_atual = estoque_atual + NEW.quantidade 
  WHERE id = NEW.produto_id;
  
  -- Register stock movement with empresa_id
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
    NEW.produto_id, 
    'entrada', 
    NEW.quantidade, 
    NEW.preco_unitario, 
    'Compra #' || c.numero_nota, 
    c.usuario_id,
    c.empresa_id
  FROM public.compras c 
  WHERE c.id = NEW.compra_id;
  
  RETURN NEW;
END;
$function$;

-- Recreate function for sales stock updates with empresa_id
CREATE OR REPLACE FUNCTION public.atualizar_estoque_venda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.produtos 
  SET estoque_atual = estoque_atual - NEW.quantidade 
  WHERE id = NEW.produto_id;
  
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
    NEW.produto_id, 
    'saida', 
    NEW.quantidade, 
    NEW.preco_unitario, 
    'Venda #' || v.numero_venda, 
    v.operador_id,
    v.empresa_id
  FROM public.vendas v 
  WHERE v.id = NEW.venda_id;
  
  RETURN NEW;
END;
$function$;

-- Recreate triggers
CREATE TRIGGER trigger_atualizar_estoque_compra
  AFTER INSERT ON compras_itens
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_estoque_compra();

CREATE TRIGGER atualizar_estoque_trigger
  AFTER INSERT ON vendas_itens
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_estoque_venda();