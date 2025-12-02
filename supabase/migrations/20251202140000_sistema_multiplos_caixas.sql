-- =====================================================
-- MIGRATION: Sistema de Múltiplos Caixas
-- Data: 2025-12-02
-- Descrição: Implementa sistema completo de gerenciamento
--            de múltiplos caixas simultâneos com isolamento
-- =====================================================

-- 1. ADICIONAR CAMPOS NA TABELA CAIXAS
-- =====================================================

-- Adicionar campo de numeração automática
ALTER TABLE caixas 
ADD COLUMN IF NOT EXISTS numero_caixa VARCHAR(20);

-- Adicionar campo de saldo atual (calculado em tempo real)
ALTER TABLE caixas 
ADD COLUMN IF NOT EXISTS saldo_atual DECIMAL(10,2) DEFAULT 0;

-- Criar sequência para numeração automática de caixas
CREATE SEQUENCE IF NOT EXISTS caixas_numero_seq START 1;

-- Criar função para gerar número do caixa automaticamente
CREATE OR REPLACE FUNCTION gerar_numero_caixa()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_caixa IS NULL THEN
    NEW.numero_caixa := 'CAIXA ' || LPAD(nextval('caixas_numero_seq')::TEXT, 3, '0');
  END IF;
  
  -- Inicializar saldo_atual com saldo_inicial
  IF NEW.saldo_atual IS NULL THEN
    NEW.saldo_atual := NEW.saldo_inicial;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para gerar número automaticamente
DROP TRIGGER IF EXISTS trigger_gerar_numero_caixa ON caixas;
CREATE TRIGGER trigger_gerar_numero_caixa
  BEFORE INSERT ON caixas
  FOR EACH ROW
  EXECUTE FUNCTION gerar_numero_caixa();

-- 2. CRIAR TABELA DE MOVIMENTAÇÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS caixas_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id UUID NOT NULL REFERENCES caixas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('sangria', 'suprimento', 'venda')),
  valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  descricao TEXT,
  usuario_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para performance
  CONSTRAINT fk_caixa FOREIGN KEY (caixa_id) REFERENCES caixas(id) ON DELETE CASCADE
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa ON caixas_movimentacoes(caixa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON caixas_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_created ON caixas_movimentacoes(created_at);

-- 3. FUNÇÃO PARA ATUALIZAR SALDO DO CAIXA
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_saldo_caixa()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 4. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA DE SALDO
-- =====================================================

-- Trigger para movimentações
DROP TRIGGER IF EXISTS trigger_atualizar_saldo_movimentacao ON caixas_movimentacoes;
CREATE TRIGGER trigger_atualizar_saldo_movimentacao
  AFTER INSERT OR UPDATE OR DELETE ON caixas_movimentacoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_saldo_caixa();

-- Trigger para vendas
DROP TRIGGER IF EXISTS trigger_atualizar_saldo_venda ON vendas;
CREATE TRIGGER trigger_atualizar_saldo_venda
  AFTER INSERT OR UPDATE ON vendas
  FOR EACH ROW
  WHEN (NEW.caixa_id IS NOT NULL)
  EXECUTE FUNCTION atualizar_saldo_caixa();

-- 5. VIEW PARA RESUMO DE CAIXAS
-- =====================================================

CREATE OR REPLACE VIEW vw_resumo_caixas AS
SELECT 
  c.id,
  c.numero_caixa,
  c.operador_id,
  p.nome as operador_nome,
  p.email as operador_email,
  c.empresa_id,
  c.saldo_inicial,
  c.saldo_atual,
  c.saldo_final,
  c.data_abertura,
  c.data_fechamento,
  c.status,
  c.observacoes,
  
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
LEFT JOIN vendas v ON v.caixa_id = c.id
LEFT JOIN caixas_movimentacoes cm ON cm.caixa_id = c.id
GROUP BY c.id, p.nome, p.email;

-- 6. POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS na tabela de movimentações
ALTER TABLE caixas_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver movimentações dos caixas da sua empresa
DROP POLICY IF EXISTS "Usuários podem ver movimentações da empresa" ON caixas_movimentacoes;
CREATE POLICY "Usuários podem ver movimentações da empresa"
  ON caixas_movimentacoes
  FOR SELECT
  USING (
    caixa_id IN (
      SELECT c.id 
      FROM caixas c
      INNER JOIN usuarios_empresas ue ON ue.empresa_id = c.empresa_id
      WHERE ue.user_id = auth.uid()
    )
  );

-- Política: Usuários podem inserir movimentações nos caixas da sua empresa
DROP POLICY IF EXISTS "Usuários podem inserir movimentações" ON caixas_movimentacoes;
CREATE POLICY "Usuários podem inserir movimentações"
  ON caixas_movimentacoes
  FOR INSERT
  WITH CHECK (
    caixa_id IN (
      SELECT c.id 
      FROM caixas c
      INNER JOIN usuarios_empresas ue ON ue.empresa_id = c.empresa_id
      WHERE ue.user_id = auth.uid()
    )
  );

-- 7. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para verificar se usuário é supervisor
CREATE OR REPLACE FUNCTION is_supervisor(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM user_roles
  WHERE user_id = $1
  LIMIT 1;
  
  RETURN v_role IN ('admin', 'supervisor', 'gerente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter caixa aberto do operador
CREATE OR REPLACE FUNCTION get_caixa_aberto(p_operador_id UUID, p_empresa_id UUID)
RETURNS TABLE (
  id UUID,
  numero_caixa VARCHAR,
  saldo_inicial DECIMAL,
  saldo_atual DECIMAL,
  data_abertura TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.numero_caixa,
    c.saldo_inicial,
    c.saldo_atual,
    c.data_abertura
  FROM caixas c
  WHERE c.operador_id = p_operador_id
    AND c.empresa_id = p_empresa_id
    AND c.status = 'aberto'
  ORDER BY c.data_abertura DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 8. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE caixas_movimentacoes IS 'Registra todas as movimentações de caixa (sangrias, suprimentos)';
COMMENT ON COLUMN caixas.numero_caixa IS 'Número automático do caixa (CAIXA 001, CAIXA 002, etc)';
COMMENT ON COLUMN caixas.saldo_atual IS 'Saldo calculado em tempo real (saldo_inicial + vendas + suprimentos - sangrias)';
COMMENT ON VIEW vw_resumo_caixas IS 'View consolidada com resumo completo de cada caixa';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
