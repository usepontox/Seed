-- Criação das tabelas do sistema PDV

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'caixa' CHECK (role IN ('admin', 'caixa', 'estoquista', 'financeiro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de categorias de produtos
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de fornecedores
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  cpf TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  codigo_barras TEXT UNIQUE,
  sku TEXT UNIQUE,
  categoria_id UUID REFERENCES public.categorias(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  unidade TEXT NOT NULL DEFAULT 'UN',
  custo DECIMAL(10, 2) NOT NULL DEFAULT 0,
  preco_venda DECIMAL(10, 2) NOT NULL DEFAULT 0,
  estoque_atual INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  ncm TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  limite_credito DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de controle de caixa
CREATE TABLE public.caixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID NOT NULL REFERENCES auth.users(id),
  saldo_inicial DECIMAL(10, 2) NOT NULL DEFAULT 0,
  saldo_final DECIMAL(10, 2),
  data_abertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fechamento TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  observacoes TEXT
);

-- Tabela de vendas
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id UUID REFERENCES public.caixas(id),
  cliente_id UUID REFERENCES public.clientes(id),
  operador_id UUID NOT NULL REFERENCES auth.users(id),
  numero_venda TEXT NOT NULL UNIQUE,
  data_venda TIMESTAMPTZ NOT NULL DEFAULT now(),
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  desconto DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'debito', 'credito', 'pix', 'fiado')),
  status TEXT NOT NULL DEFAULT 'finalizada' CHECK (status IN ('finalizada', 'cancelada')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de itens de venda
CREATE TABLE public.vendas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade INTEGER NOT NULL,
  preco_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de movimentações de estoque
CREATE TABLE public.estoque_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade INTEGER NOT NULL,
  custo_unitario DECIMAL(10, 2),
  motivo TEXT NOT NULL,
  observacoes TEXT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de contas a receber
CREATE TABLE public.contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID REFERENCES public.vendas(id),
  cliente_id UUID REFERENCES public.clientes(id),
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de contas a pagar
CREATE TABLE public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  categoria TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Usuários podem ver todos os perfis" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

-- Políticas RLS para categorias (todos podem ler, apenas admin pode modificar)
CREATE POLICY "Todos podem ver categorias" 
  ON public.categorias FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admin pode inserir categorias" 
  ON public.categorias FOR INSERT 
  TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin pode atualizar categorias" 
  ON public.categorias FOR UPDATE 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Políticas RLS para fornecedores
CREATE POLICY "Todos podem ver fornecedores" 
  ON public.fornecedores FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Usuários autorizados podem criar fornecedores" 
  ON public.fornecedores FOR INSERT 
  TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'estoquista')));

CREATE POLICY "Usuários autorizados podem atualizar fornecedores" 
  ON public.fornecedores FOR UPDATE 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'estoquista')));

-- Políticas RLS para produtos
CREATE POLICY "Todos podem ver produtos" 
  ON public.produtos FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Usuários autorizados podem criar produtos" 
  ON public.produtos FOR INSERT 
  TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'estoquista')));

CREATE POLICY "Usuários autorizados podem atualizar produtos" 
  ON public.produtos FOR UPDATE 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'estoquista')));

-- Políticas RLS para clientes
CREATE POLICY "Todos podem ver clientes" 
  ON public.clientes FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Todos podem criar clientes" 
  ON public.clientes FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Todos podem atualizar clientes" 
  ON public.clientes FOR UPDATE 
  TO authenticated 
  USING (true);

-- Políticas RLS para caixas
CREATE POLICY "Todos podem ver caixas" 
  ON public.caixas FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Caixas e admins podem abrir caixa" 
  ON public.caixas FOR INSERT 
  TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'caixa')));

CREATE POLICY "Caixas e admins podem atualizar caixa" 
  ON public.caixas FOR UPDATE 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'caixa')));

-- Políticas RLS para vendas
CREATE POLICY "Todos podem ver vendas" 
  ON public.vendas FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Usuários autenticados podem criar vendas" 
  ON public.vendas FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Admin e operador podem atualizar suas vendas" 
  ON public.vendas FOR UPDATE 
  TO authenticated 
  USING (operador_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Políticas RLS para itens de venda
CREATE POLICY "Todos podem ver itens de venda" 
  ON public.vendas_itens FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Usuários autenticados podem criar itens de venda" 
  ON public.vendas_itens FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Políticas RLS para movimentações de estoque
CREATE POLICY "Todos podem ver movimentações" 
  ON public.estoque_movimentacoes FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Usuários autorizados podem criar movimentações" 
  ON public.estoque_movimentacoes FOR INSERT 
  TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'estoquista')));

-- Políticas RLS para contas a receber
CREATE POLICY "Todos podem ver contas a receber" 
  ON public.contas_receber FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Usuários autorizados podem criar contas a receber" 
  ON public.contas_receber FOR INSERT 
  TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'financeiro')));

CREATE POLICY "Usuários autorizados podem atualizar contas a receber" 
  ON public.contas_receber FOR UPDATE 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'financeiro')));

-- Políticas RLS para contas a pagar
CREATE POLICY "Todos podem ver contas a pagar" 
  ON public.contas_pagar FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Usuários autorizados podem criar contas a pagar" 
  ON public.contas_pagar FOR INSERT 
  TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'financeiro')));

CREATE POLICY "Usuários autorizados podem atualizar contas a pagar" 
  ON public.contas_pagar FOR UPDATE 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'financeiro')));

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Novo Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'caixa')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar estoque automaticamente após venda
CREATE OR REPLACE FUNCTION public.atualizar_estoque_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar estoque do produto
  UPDATE public.produtos
  SET estoque_atual = estoque_atual - NEW.quantidade
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
    'saida',
    NEW.quantidade,
    NEW.preco_unitario,
    'Venda #' || v.numero_venda,
    v.operador_id
  FROM public.vendas v
  WHERE v.id = NEW.venda_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_estoque_venda
  AFTER INSERT ON public.vendas_itens
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_estoque_venda();

-- Função para gerar número de venda sequencial
CREATE SEQUENCE IF NOT EXISTS vendas_numero_seq START 1;

CREATE OR REPLACE FUNCTION public.gerar_numero_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.numero_venda = LPAD(nextval('vendas_numero_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_gerar_numero_venda
  BEFORE INSERT ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_venda();