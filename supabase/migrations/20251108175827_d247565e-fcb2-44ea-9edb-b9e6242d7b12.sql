-- ================================================
-- SISTEMA MULTI-TENANT - PARTE 1: ESTRUTURA BASE
-- ================================================

-- 1. Criar role de super_admin (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'caixa', 'estoquista', 'financeiro');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'super_admin' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE app_role ADD VALUE 'super_admin';
  END IF;
END $$;

-- 2. Criar tabela de empresas (se não existir)
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text UNIQUE,
  telefone text,
  email text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  logo_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Criar tabela de relacionamento usuário-empresa
CREATE TABLE IF NOT EXISTS public.usuarios_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, empresa_id)
);

-- 4. Migrar dados de configuracoes_empresa para empresas (somente se empresas estiver vazia)
INSERT INTO public.empresas (nome, cnpj, telefone, email, endereco, cidade, estado, cep, logo_url)
SELECT 
  COALESCE(nome_empresa, 'Empresa Padrão'),
  cnpj,
  telefone,
  email,
  endereco,
  cidade,
  estado,
  cep,
  logo_url
FROM public.configuracoes_empresa
WHERE NOT EXISTS (SELECT 1 FROM public.empresas)
ON CONFLICT (cnpj) DO NOTHING;

-- 5. Garantir que existe pelo menos uma empresa
INSERT INTO public.empresas (nome, ativo)
SELECT 'Empresa Padrão', true
WHERE NOT EXISTS (SELECT 1 FROM public.empresas);

-- 6. Associar usuários existentes à primeira empresa
INSERT INTO public.usuarios_empresas (user_id, empresa_id)
SELECT 
  u.id,
  (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.usuarios_empresas ue WHERE ue.user_id = u.id
)
ON CONFLICT (user_id, empresa_id) DO NOTHING;