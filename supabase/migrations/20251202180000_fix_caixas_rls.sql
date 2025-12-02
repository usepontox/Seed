-- Migration: Allow 'user' role to open caixas
-- Data: 2025-12-02

-- Drop existing policy
DROP POLICY IF EXISTS "Caixa e admin podem criar caixas na própria empresa" ON public.caixas;

-- Create new policy including 'user' role
CREATE POLICY "Caixa, admin e user podem criar caixas na própria empresa" ON public.caixas
    FOR INSERT
    WITH CHECK (
        (empresa_id = get_user_empresa_id()) AND 
        has_any_role(auth.uid(), VARIADIC ARRAY['caixa'::app_role, 'admin'::app_role, 'user'::app_role])
    );
