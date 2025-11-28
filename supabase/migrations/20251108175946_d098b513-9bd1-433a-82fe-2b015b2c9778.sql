-- ================================================
-- SISTEMA MULTI-TENANT - PARTE 3: ADICIONAR EMPRESA_ID
-- ================================================

-- 1. Adicionar empresa_id às tabelas (nullable inicialmente)
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.estoque_movimentacoes ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);

-- 2. Obter ID da primeira empresa
DO $$
DECLARE
  primeira_empresa_id uuid;
BEGIN
  SELECT id INTO primeira_empresa_id FROM public.empresas ORDER BY created_at LIMIT 1;
  
  -- 3. Atualizar registros existentes com a primeira empresa
  IF primeira_empresa_id IS NOT NULL THEN
    UPDATE public.produtos SET empresa_id = primeira_empresa_id WHERE empresa_id IS NULL;
    UPDATE public.clientes SET empresa_id = primeira_empresa_id WHERE empresa_id IS NULL;
    UPDATE public.fornecedores SET empresa_id = primeira_empresa_id WHERE empresa_id IS NULL;
    UPDATE public.categorias SET empresa_id = primeira_empresa_id WHERE empresa_id IS NULL;
    UPDATE public.vendas SET empresa_id = primeira_empresa_id WHERE empresa_id IS NULL;
    UPDATE public.compras SET empresa_id = primeira_empresa_id WHERE empresa_id IS NULL;
    UPDATE public.caixas SET empresa_id = primeira_empresa_id WHERE empresa_id IS NULL;
    UPDATE public.contas_pagar SET empresa_id = primeira_empresa_id WHERE empresa_id IS NULL;
    UPDATE public.contas_receber SET empresa_id = primeira_empresa_id WHERE empresa_id IS NULL;
    UPDATE public.estoque_movimentacoes SET empresa_id = primeira_empresa_id WHERE empresa_id IS NULL;
  END IF;
END $$;

-- 4. Tornar empresa_id obrigatório (NOT NULL) apenas se houver dados
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.empresas LIMIT 1) THEN
    ALTER TABLE public.produtos ALTER COLUMN empresa_id SET NOT NULL;
    ALTER TABLE public.clientes ALTER COLUMN empresa_id SET NOT NULL;
    ALTER TABLE public.fornecedores ALTER COLUMN empresa_id SET NOT NULL;
    ALTER TABLE public.categorias ALTER COLUMN empresa_id SET NOT NULL;
    ALTER TABLE public.vendas ALTER COLUMN empresa_id SET NOT NULL;
    ALTER TABLE public.compras ALTER COLUMN empresa_id SET NOT NULL;
    ALTER TABLE public.caixas ALTER COLUMN empresa_id SET NOT NULL;
    ALTER TABLE public.contas_pagar ALTER COLUMN empresa_id SET NOT NULL;
    ALTER TABLE public.contas_receber ALTER COLUMN empresa_id SET NOT NULL;
    ALTER TABLE public.estoque_movimentacoes ALTER COLUMN empresa_id SET NOT NULL;
  END IF;
END $$;