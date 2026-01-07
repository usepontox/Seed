-- Tabela para armazenar configurações PIX por empresa
CREATE TABLE IF NOT EXISTS configuracoes_pix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) NOT NULL UNIQUE,
  provider VARCHAR(50) NOT NULL DEFAULT 'mercadopago',
  access_token_encrypted TEXT NOT NULL,
  public_key TEXT,
  webhook_secret TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para registrar transações PIX
CREATE TABLE IF NOT EXISTS transacoes_pix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id UUID REFERENCES vendas(id) NOT NULL,
  empresa_id UUID REFERENCES empresas(id) NOT NULL,
  payment_id VARCHAR(255) UNIQUE,
  qr_code_base64 TEXT,
  qr_code_url TEXT,
  valor DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  expires_at TIMESTAMP,
  paid_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE configuracoes_pix ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_pix ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para configuracoes_pix
CREATE POLICY "Usuários podem ver configurações da própria empresa"
  ON configuracoes_pix FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresa_link WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir configurações da própria empresa"
  ON configuracoes_pix FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM user_empresa_link WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar configurações da própria empresa"
  ON configuracoes_pix FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresa_link WHERE user_id = auth.uid()
    )
  );

-- Políticas RLS para transacoes_pix
CREATE POLICY "Usuários podem ver transações da própria empresa"
  ON transacoes_pix FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresa_link WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir transações da própria empresa"
  ON transacoes_pix FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM user_empresa_link WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar transações da própria empresa"
  ON transacoes_pix FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM user_empresa_link WHERE user_id = auth.uid()
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_configuracoes_pix_empresa ON configuracoes_pix(empresa_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_pix_venda ON transacoes_pix(venda_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_pix_payment ON transacoes_pix(payment_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_pix_status ON transacoes_pix(status);
CREATE INDEX IF NOT EXISTS idx_transacoes_pix_empresa ON transacoes_pix(empresa_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_configuracoes_pix_updated_at BEFORE UPDATE ON configuracoes_pix
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transacoes_pix_updated_at BEFORE UPDATE ON transacoes_pix
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
