-- Corrigir view para mostrar nome do operador da tabela operadores ao invés de profiles

-- 1. Deletar a view antiga
DROP VIEW IF EXISTS vw_resumo_caixas;

-- 2. Criar a nova versão com operador correto
CREATE VIEW vw_resumo_caixas AS
SELECT 
  c.id,
  c.numero_caixa,
  c.operador_id,
  COALESCE(op.nome, p.nome) as operador_nome,
  p.email as operador_email,
  c.empresa_id,
  c.saldo_inicial,
  c.saldo_atual,
  c.saldo_final,
  c.data_abertura,
  c.data_fechamento,
  c.status,
  c.observacoes,
  c.conferencia_detalhes,
  
  -- Estatísticas de vendas
  COUNT(DISTINCT v.id) as total_vendas,
  COALESCE(SUM(CASE WHEN v.forma_pagamento = 'dinheiro' THEN v.total ELSE 0 END), 0) as total_dinheiro,
  COALESCE(SUM(CASE WHEN v.forma_pagamento = 'debito' THEN v.total ELSE 0 END), 0) as total_debito,
  COALESCE(SUM(CASE WHEN v.forma_pagamento = 'credito' THEN v.total ELSE 0 END), 0) as total_credito,
  COALESCE(SUM(CASE WHEN v.forma_pagamento = 'pix' THEN v.total ELSE 0 END), 0) as total_pix,
  COALESCE(SUM(CASE WHEN v.forma_pagamento = 'fiado' THEN v.total ELSE 0 END), 0) as total_fiado,
  COALESCE(SUM(v.total), 0) as total_vendido,
  
  -- Estatísticas de movimentações
  COUNT(CASE WHEN cm.tipo = 'sangria' THEN 1 END) as total_sangrias,
  COALESCE(SUM(CASE WHEN cm.tipo = 'sangria' THEN cm.valor END), 0) as valor_sangrias,
  COUNT(CASE WHEN cm.tipo = 'suprimento' THEN 1 END) as total_suprimentos,
  COALESCE(SUM(CASE WHEN cm.tipo = 'suprimento' THEN cm.valor END), 0) as valor_suprimentos,
  
  -- Cálculo de diferença (quando fechado)
  CASE 
    WHEN c.status = 'fechado' AND c.saldo_final IS NOT NULL 
    THEN c.saldo_final - c.saldo_atual
    ELSE NULL
  END as diferenca
  
FROM caixas c
LEFT JOIN profiles p ON c.operador_id = p.id
LEFT JOIN operadores op ON c.operador_pdv_id = op.id
LEFT JOIN vendas v ON v.caixa_id = c.id
LEFT JOIN caixas_movimentacoes cm ON cm.caixa_id = c.id
GROUP BY c.id, p.nome, p.email, op.nome;

COMMENT ON VIEW vw_resumo_caixas IS 'View consolidada com resumo completo de cada caixa, mostrando nome do operador cadastrado';
