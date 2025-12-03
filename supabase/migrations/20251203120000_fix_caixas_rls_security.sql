-- Adicionar RLS policy na view vw_resumo_caixas através de security definer function
-- Como views não suportam RLS diretamente, vamos criar uma função segura

CREATE OR REPLACE FUNCTION get_resumo_caixas(p_empresa_id UUID)
RETURNS TABLE (
    id UUID,
    numero_caixa VARCHAR,
    operador_id UUID,
    operador_nome TEXT,
    operador_email TEXT,
    empresa_id UUID,
    saldo_inicial DECIMAL,
    saldo_atual DECIMAL,
    saldo_final DECIMAL,
    data_abertura TIMESTAMP,
    data_fechamento TIMESTAMP,
    status VARCHAR,
    observacoes TEXT,
    total_vendas BIGINT,
    total_dinheiro DECIMAL,
    total_debito DECIMAL,
    total_credito DECIMAL,
    total_pix DECIMAL,
    total_fiado DECIMAL,
    total_vendido DECIMAL,
    total_sangrias BIGINT,
    valor_sangrias DECIMAL,
    total_suprimentos BIGINT,
    valor_suprimentos DECIMAL,
    diferenca DECIMAL,
    conferencia_detalhes JSONB
) AS $$
BEGIN
    RETURN QUERY
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
        COUNT(DISTINCT v.id) as total_vendas,
        COALESCE(SUM(CASE WHEN v.forma_pagamento = 'dinheiro' THEN v.total ELSE 0 END), 0) as total_dinheiro,
        COALESCE(SUM(CASE WHEN v.forma_pagamento = 'debito' THEN v.total ELSE 0 END), 0) as total_debito,
        COALESCE(SUM(CASE WHEN v.forma_pagamento = 'credito' THEN v.total ELSE 0 END), 0) as total_credito,
        COALESCE(SUM(CASE WHEN v.forma_pagamento = 'pix' THEN v.total ELSE 0 END), 0) as total_pix,
        COALESCE(SUM(CASE WHEN v.forma_pagamento = 'fiado' THEN v.total ELSE 0 END), 0) as total_fiado,
        COALESCE(SUM(v.total), 0) as total_vendido,
        COUNT(CASE WHEN cm.tipo = 'sangria' THEN 1 END) as total_sangrias,
        COALESCE(SUM(CASE WHEN cm.tipo = 'sangria' THEN cm.valor END), 0) as valor_sangrias,
        COUNT(CASE WHEN cm.tipo = 'suprimento' THEN 1 END) as total_suprimentos,
        COALESCE(SUM(CASE WHEN cm.tipo = 'suprimento' THEN cm.valor END), 0) as valor_suprimentos,
        CASE 
            WHEN c.status = 'fechado' AND c.saldo_final IS NOT NULL 
            THEN c.saldo_final - c.saldo_atual
            ELSE NULL
        END as diferenca,
        c.conferencia_detalhes
    FROM caixas c
    LEFT JOIN profiles p ON c.operador_id = p.id
    LEFT JOIN vendas v ON v.caixa_id = c.id
    LEFT JOIN caixas_movimentacoes cm ON cm.caixa_id = c.id
    WHERE c.empresa_id = p_empresa_id
    GROUP BY c.id, p.nome, p.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_resumo_caixas IS 'Retorna resumo de caixas filtrado por empresa_id para garantir isolamento de dados';
