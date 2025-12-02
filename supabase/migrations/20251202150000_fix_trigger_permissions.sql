CREATE OR REPLACE FUNCTION public.atualizar_saldo_caixa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_saldo_inicial DECIMAL(10,2);
  v_total_vendas DECIMAL(10,2);
  v_total_suprimentos DECIMAL(10,2);
  v_total_sangrias DECIMAL(10,2);
  v_novo_saldo DECIMAL(10,2);
BEGIN
  -- Buscar saldo inicial do caixa
  SELECT saldo_inicial INTO v_saldo_inicial
  FROM caixas
  WHERE id = NEW.caixa_id;
  
  -- Calcular total de vendas
  SELECT COALESCE(SUM(total), 0) INTO v_total_vendas
  FROM vendas
  WHERE caixa_id = NEW.caixa_id;
  
  -- Calcular total de suprimentos
  SELECT COALESCE(SUM(valor), 0) INTO v_total_suprimentos
  FROM caixas_movimentacoes
  WHERE caixa_id = NEW.caixa_id AND tipo = 'suprimento';
  
  -- Calcular total de sangrias
  SELECT COALESCE(SUM(valor), 0) INTO v_total_sangrias
  FROM caixas_movimentacoes
  WHERE caixa_id = NEW.caixa_id AND tipo = 'sangria';
  
  -- Calcular novo saldo
  v_novo_saldo := v_saldo_inicial + v_total_vendas + v_total_suprimentos - v_total_sangrias;
  
  -- Atualizar saldo atual do caixa
  UPDATE caixas
  SET saldo_atual = v_novo_saldo
  WHERE id = NEW.caixa_id;
  
  RETURN NEW;
END;
$function$;
