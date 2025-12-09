-- Migration: Fix produtos RLS to properly isolate stock between companies
-- Date: 2025-12-09
-- Problem: Admin stock appearing for client companies

-- Drop existing product policies
DROP POLICY IF EXISTS "Permitir gerenciamento de produtos" ON public.produtos;
DROP POLICY IF EXISTS "Usuários podem ver produtos da própria empresa" ON public.produtos;
DROP POLICY IF EXISTS "Admin e estoquista podem criar produtos na própria empresa" ON public.produtos;
DROP POLICY IF EXISTS "Admin e estoquista podem atualizar produtos da própria empresa" ON public.produtos;
DROP POLICY IF EXISTS "Admin e estoquista podem deletar produtos da própria empresa" ON public.produtos;
DROP POLICY IF EXISTS "Todos podem ver produtos" ON public.produtos;

-- Create strict RLS policy for produtos - users can ONLY see their own company's products
CREATE POLICY "Usuários veem produtos apenas da própria empresa"
ON public.produtos
FOR SELECT
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Users can insert products only for their own company
CREATE POLICY "Usuários inserem produtos na própria empresa"
ON public.produtos
FOR INSERT
TO authenticated
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Users can update only their company's products
CREATE POLICY "Usuários atualizam produtos da própria empresa"
ON public.produtos
FOR UPDATE
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.usuarios_empresas 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Users can delete only their company's products
CREATE POLICY "Usuários deletam produtos da própria empresa"
ON public.produtos
FOR DELETE
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM public.usuarios_empresas 
    WHERE user_id = auth.uid()
  )
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_id ON public.produtos(empresa_id);

-- Verify RLS is enabled
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Test query (for verification - commented out in production)
-- SELECT p.*, e.nome as empresa_nome
-- FROM produtos p
-- JOIN empresas e ON p.empresa_id = e.id
-- WHERE p.empresa_id IN (SELECT empresa_id FROM usuarios_empresas WHERE user_id = auth.uid());
