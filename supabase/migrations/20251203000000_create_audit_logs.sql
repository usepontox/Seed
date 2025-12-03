-- Migration: Create audit_logs table
-- Data: 2025-12-03
-- Descrição: Tabela para registrar todas as ações importantes do sistema (auditoria)

-- Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    operador_id UUID REFERENCES public.operadores(id) ON DELETE SET NULL,
    
    -- Informações da ação
    acao TEXT NOT NULL, -- 'venda_criada', 'venda_cancelada', 'sangria', 'suprimento', 'preco_alterado', etc
    entidade TEXT NOT NULL, -- 'vendas', 'caixas', 'produtos', etc
    entidade_id UUID, -- ID do registro afetado
    
    -- Dados da mudança
    dados_antes JSONB, -- Estado anterior (para updates/deletes)
    dados_depois JSONB, -- Estado novo (para inserts/updates)
    
    -- Contexto adicional
    motivo TEXT, -- Motivo da ação (ex: cancelamento)
    ip_address TEXT, -- IP do usuário
    user_agent TEXT, -- Navegador/dispositivo
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_audit_logs_empresa_id ON public.audit_logs(empresa_id);
CREATE INDEX idx_audit_logs_usuario_id ON public.audit_logs(usuario_id);
CREATE INDEX idx_audit_logs_acao ON public.audit_logs(acao);
CREATE INDEX idx_audit_logs_entidade ON public.audit_logs(entidade, entidade_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS Policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver logs da própria empresa
CREATE POLICY "Usuários podem ver logs da própria empresa"
    ON public.audit_logs
    FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.usuarios_empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Apenas o sistema pode inserir logs (via trigger ou função)
CREATE POLICY "Sistema pode inserir logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.audit_logs IS 'Registro de auditoria de todas as ações importantes do sistema';
COMMENT ON COLUMN public.audit_logs.acao IS 'Tipo de ação realizada';
COMMENT ON COLUMN public.audit_logs.entidade IS 'Tabela/entidade afetada';
COMMENT ON COLUMN public.audit_logs.dados_antes IS 'Estado anterior do registro (JSON)';
COMMENT ON COLUMN public.audit_logs.dados_depois IS 'Estado novo do registro (JSON)';
