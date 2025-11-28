-- Tabela de configurações da empresa
CREATE TABLE IF NOT EXISTS public.configuracoes_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de compras/entradas
CREATE TABLE IF NOT EXISTS public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  numero_nota TEXT,
  data_compra TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valor_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'finalizada',
  observacoes TEXT,
  usuario_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de itens de compra
CREATE TABLE IF NOT EXISTS public.compras_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger para atualizar estoque após compra
CREATE OR REPLACE FUNCTION public.atualizar_estoque_compra()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar estoque do produto
  UPDATE public.produtos 
  SET estoque_atual = estoque_atual + NEW.quantidade 
  WHERE id = NEW.produto_id;
  
  -- Registrar movimentação de estoque
  INSERT INTO public.estoque_movimentacoes (
    produto_id, 
    tipo, 
    quantidade, 
    custo_unitario, 
    motivo, 
    usuario_id
  )
  SELECT 
    NEW.produto_id, 
    'entrada', 
    NEW.quantidade, 
    NEW.preco_unitario, 
    'Compra #' || c.numero_nota, 
    c.usuario_id
  FROM public.compras c 
  WHERE c.id = NEW.compra_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_estoque_compra
AFTER INSERT ON public.compras_itens
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_estoque_compra();

-- RLS Policies para configuracoes_empresa
ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver configurações"
ON public.configuracoes_empresa FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin pode gerenciar configurações"
ON public.configuracoes_empresa FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para compras
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e estoquista podem ver compras"
ON public.compras FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role]));

CREATE POLICY "Admin e estoquista podem criar compras"
ON public.compras FOR INSERT
TO authenticated
WITH CHECK (has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role]));

-- RLS Policies para compras_itens
ALTER TABLE public.compras_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e estoquista podem ver itens de compra"
ON public.compras_itens FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.compras 
    WHERE compras.id = compras_itens.compra_id
    AND has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role])
  )
);

CREATE POLICY "Admin e estoquista podem criar itens de compra"
ON public.compras_itens FOR INSERT
TO authenticated
WITH CHECK (has_any_role(auth.uid(), VARIADIC ARRAY['admin'::app_role, 'estoquista'::app_role]));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_configuracoes_empresa_updated_at
BEFORE UPDATE ON public.configuracoes_empresa
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();