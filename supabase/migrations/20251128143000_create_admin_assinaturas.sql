-- Criar tabela de assinaturas para gestão SaaS
CREATE TABLE IF NOT EXISTS admin_assinaturas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
    plano text NOT NULL, -- 'free', 'basic', 'pro', 'enterprise'
    valor_mensal numeric(10, 2) NOT NULL DEFAULT 0,
    dia_vencimento integer NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
    status text NOT NULL DEFAULT 'ativo', -- 'ativo', 'inativo', 'pendente', 'bloqueado'
    ultimo_pagamento date,
    proximo_vencimento date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE admin_assinaturas ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admin pode ver e editar (via service role na Edge Function ou política direta se logado como admin)
-- Como estamos usando Edge Function com service role, não precisamos de políticas complexas aqui para o frontend direto,
-- mas é bom garantir que usuários normais não acessem.

CREATE POLICY "Apenas admins podem ver assinaturas" ON admin_assinaturas
    FOR ALL
    USING (
        auth.jwt() ->> 'email' = 'admin@admin.com' 
        OR 
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin'
    );
