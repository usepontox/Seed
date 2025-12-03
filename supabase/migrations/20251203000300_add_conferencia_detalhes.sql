-- Adicionar coluna para armazenar detalhes da conferência do fechamento
ALTER TABLE caixas
ADD COLUMN IF NOT EXISTS conferencia_detalhes JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN caixas.conferencia_detalhes IS 'Armazena os valores contados pelo operador para cada forma de pagamento no fechamento';
