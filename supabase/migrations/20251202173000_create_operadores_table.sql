-- Migration: Create operadores table
-- Data: 2025-12-02

CREATE TABLE IF NOT EXISTS public.operadores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    codigo TEXT NOT NULL,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas podem ver seus operadores" ON public.operadores
    FOR SELECT
    USING (empresa_id IN (
        SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Empresas podem criar seus operadores" ON public.operadores
    FOR INSERT
    WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Empresas podem atualizar seus operadores" ON public.operadores
    FOR UPDATE
    USING (empresa_id IN (
        SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()
    ));

CREATE POLICY "Empresas podem deletar seus operadores" ON public.operadores
    FOR DELETE
    USING (empresa_id IN (
        SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()
    ));

-- Add index for performance
CREATE INDEX idx_operadores_empresa_id ON public.operadores(empresa_id);
