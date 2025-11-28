-- PARTE 1: REMOVER TODAS AS POLICIES EXISTENTES ANTES DE RECRIAR

-- PROFILES (todas as variantes)
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;

-- CLIENTES (todas as variantes)
DROP POLICY IF EXISTS "Todos podem ver clientes" ON public.clientes;
DROP POLICY IF EXISTS "Todos podem criar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Todos podem atualizar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admin, caixa e financeiro podem ver clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admin e caixa podem criar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Apenas admin pode atualizar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Apenas admin pode deletar clientes" ON public.clientes;

-- VENDAS (todas as variantes)
DROP POLICY IF EXISTS "Todos podem ver vendas" ON public.vendas;
DROP POLICY IF EXISTS "Usuários autenticados podem criar vendas" ON public.vendas;
DROP POLICY IF EXISTS "Admin e operador podem atualizar suas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias vendas" ON public.vendas;
DROP POLICY IF EXISTS "Financeiro pode ver todas as vendas" ON public.vendas;
DROP POLICY IF EXISTS "Admin pode ver todas as vendas" ON public.vendas;
DROP POLICY IF EXISTS "Apenas caixa e admin podem criar vendas" ON public.vendas;

-- VENDAS_ITENS (todas as variantes)
DROP POLICY IF EXISTS "Todos podem ver itens de vendas" ON public.vendas_itens;
DROP POLICY IF EXISTS "Todos podem ver itens de venda" ON public.vendas_itens;
DROP POLICY IF EXISTS "Usuários autenticados podem criar itens de venda" ON public.vendas_itens;
DROP POLICY IF EXISTS "Usuários podem ver itens de suas próprias vendas" ON public.vendas_itens;
DROP POLICY IF EXISTS "Admin e financeiro podem ver todos os itens" ON public.vendas_itens;
DROP POLICY IF EXISTS "Apenas caixa e admin podem criar itens de venda" ON public.vendas_itens;

-- FORNECEDORES (todas as variantes)
DROP POLICY IF EXISTS "Todos podem ver fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Usuários autorizados podem criar fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Usuários autorizados podem atualizar fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Admin e estoquista podem ver fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Admin e estoquista podem gerenciar fornecedores" ON public.fornecedores;

-- PRODUTOS (todas as variantes)
DROP POLICY IF EXISTS "Todos podem ver produtos" ON public.produtos;
DROP POLICY IF EXISTS "Usuários autorizados podem criar produtos" ON public.produtos;
DROP POLICY IF EXISTS "Usuários autorizados podem atualizar produtos" ON public.produtos;
DROP POLICY IF EXISTS "Usuários autenticados podem ver produtos" ON public.produtos;
DROP POLICY IF EXISTS "Admin e estoquista podem gerenciar produtos" ON public.produtos;

-- CATEGORIAS (todas as variantes)
DROP POLICY IF EXISTS "Todos podem ver categorias" ON public.categorias;
DROP POLICY IF EXISTS "Admin pode inserir categorias" ON public.categorias;
DROP POLICY IF EXISTS "Admin pode atualizar categorias" ON public.categorias;
DROP POLICY IF EXISTS "Usuários autenticados podem ver categorias" ON public.categorias;
DROP POLICY IF EXISTS "Admin pode gerenciar categorias" ON public.categorias;

-- CAIXAS (todas as variantes)
DROP POLICY IF EXISTS "Todos podem ver caixas" ON public.caixas;
DROP POLICY IF EXISTS "Caixas e admins podem abrir caixa" ON public.caixas;
DROP POLICY IF EXISTS "Caixas e admins podem atualizar caixa" ON public.caixas;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios caixas" ON public.caixas;
DROP POLICY IF EXISTS "Admin e financeiro podem ver todos os caixas" ON public.caixas;
DROP POLICY IF EXISTS "Caixa e admin podem criar caixas" ON public.caixas;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios caixas" ON public.caixas;

-- ESTOQUE_MOVIMENTACOES (todas as variantes)
DROP POLICY IF EXISTS "Todos podem ver movimentações" ON public.estoque_movimentacoes;
DROP POLICY IF EXISTS "Usuários autorizados podem criar movimentações" ON public.estoque_movimentacoes;
DROP POLICY IF EXISTS "Admin e estoquista podem ver movimentações" ON public.estoque_movimentacoes;
DROP POLICY IF EXISTS "Admin e estoquista podem criar movimentações" ON public.estoque_movimentacoes;

-- CONTAS_RECEBER (todas as variantes)
DROP POLICY IF EXISTS "Todos podem ver contas a receber" ON public.contas_receber;
DROP POLICY IF EXISTS "Usuários autorizados podem criar contas a receber" ON public.contas_receber;
DROP POLICY IF EXISTS "Usuários autorizados podem atualizar contas a receber" ON public.contas_receber;
DROP POLICY IF EXISTS "Admin e financeiro podem ver contas a receber" ON public.contas_receber;
DROP POLICY IF EXISTS "Admin e financeiro podem gerenciar contas a receber" ON public.contas_receber;

-- CONTAS_PAGAR (todas as variantes)
DROP POLICY IF EXISTS "Todos podem ver contas a pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Usuários autorizados podem criar contas a pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Usuários autorizados podem atualizar contas a pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Admin e financeiro podem ver contas a pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Admin e financeiro podem gerenciar contas a pagar" ON public.contas_pagar;

-- USER_ROLES
DROP POLICY IF EXISTS "Usuários podem ver suas próprias roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins podem ver todas as roles" ON public.user_roles;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar roles" ON public.user_roles;

-- PARTE 2: CRIAR SISTEMA DE ROLES (se não existir)

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrar dados existentes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, role::app_role FROM public.profiles WHERE role IS NOT NULL
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Funções security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, VARIADIC _roles app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles)) $$;

-- Corrigir função atualizar_estoque_venda
DROP FUNCTION IF EXISTS public.atualizar_estoque_venda() CASCADE;
CREATE OR REPLACE FUNCTION public.atualizar_estoque_venda()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.produtos SET estoque_atual = estoque_atual - NEW.quantidade WHERE id = NEW.produto_id;
  INSERT INTO public.estoque_movimentacoes (produto_id, tipo, quantidade, custo_unitario, motivo, usuario_id)
  SELECT NEW.produto_id, 'saida', NEW.quantidade, NEW.preco_unitario, 'Venda #' || v.numero_venda, v.operador_id
  FROM public.vendas v WHERE v.id = NEW.venda_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER atualizar_estoque_trigger AFTER INSERT ON public.vendas_itens FOR EACH ROW EXECUTE FUNCTION public.atualizar_estoque_venda();

-- Atualizar handle_new_user
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE user_role app_role;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'caixa')::app_role;
  INSERT INTO public.profiles (id, nome, email) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', 'Novo Usuário'), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, user_role);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PARTE 3: CRIAR TODAS AS POLICIES

CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins podem ver todos os perfis" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Usuários podem ver suas próprias roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins podem ver todas as roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Apenas admins podem gerenciar roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin, caixa e financeiro podem ver clientes" ON public.clientes FOR SELECT USING (public.has_any_role(auth.uid(), 'admin', 'caixa', 'financeiro'));
CREATE POLICY "Admin e caixa podem criar clientes" ON public.clientes FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), 'admin', 'caixa'));
CREATE POLICY "Apenas admin pode atualizar clientes" ON public.clientes FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Apenas admin pode deletar clientes" ON public.clientes FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem ver suas próprias vendas" ON public.vendas FOR SELECT USING (operador_id = auth.uid());
CREATE POLICY "Financeiro pode ver todas as vendas" ON public.vendas FOR SELECT USING (public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Admin pode ver todas as vendas" ON public.vendas FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Apenas caixa e admin podem criar vendas" ON public.vendas FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), 'caixa', 'admin'));
CREATE POLICY "Admin e operador podem atualizar suas vendas" ON public.vendas FOR UPDATE USING (operador_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem ver itens de suas próprias vendas" ON public.vendas_itens FOR SELECT USING (EXISTS (SELECT 1 FROM public.vendas WHERE vendas.id = vendas_itens.venda_id AND vendas.operador_id = auth.uid()));
CREATE POLICY "Admin e financeiro podem ver todos os itens" ON public.vendas_itens FOR SELECT USING (public.has_any_role(auth.uid(), 'admin', 'financeiro'));
CREATE POLICY "Apenas caixa e admin podem criar itens de venda" ON public.vendas_itens FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), 'caixa', 'admin'));

CREATE POLICY "Admin e estoquista podem ver fornecedores" ON public.fornecedores FOR SELECT USING (public.has_any_role(auth.uid(), 'admin', 'estoquista'));
CREATE POLICY "Admin e estoquista podem gerenciar fornecedores" ON public.fornecedores FOR ALL USING (public.has_any_role(auth.uid(), 'admin', 'estoquista'));

CREATE POLICY "Usuários autenticados podem ver produtos" ON public.produtos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin e estoquista podem gerenciar produtos" ON public.produtos FOR ALL USING (public.has_any_role(auth.uid(), 'admin', 'estoquista'));

CREATE POLICY "Usuários autenticados podem ver categorias" ON public.categorias FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin pode gerenciar categorias" ON public.categorias FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem ver seus próprios caixas" ON public.caixas FOR SELECT USING (operador_id = auth.uid());
CREATE POLICY "Admin e financeiro podem ver todos os caixas" ON public.caixas FOR SELECT USING (public.has_any_role(auth.uid(), 'admin', 'financeiro'));
CREATE POLICY "Caixa e admin podem criar caixas" ON public.caixas FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), 'caixa', 'admin'));
CREATE POLICY "Usuários podem atualizar seus próprios caixas" ON public.caixas FOR UPDATE USING (operador_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin e estoquista podem ver movimentações" ON public.estoque_movimentacoes FOR SELECT USING (public.has_any_role(auth.uid(), 'admin', 'estoquista'));
CREATE POLICY "Admin e estoquista podem criar movimentações" ON public.estoque_movimentacoes FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), 'admin', 'estoquista'));

CREATE POLICY "Admin e financeiro podem ver contas a receber" ON public.contas_receber FOR SELECT USING (public.has_any_role(auth.uid(), 'admin', 'financeiro'));
CREATE POLICY "Admin e financeiro podem gerenciar contas a receber" ON public.contas_receber FOR ALL USING (public.has_any_role(auth.uid(), 'admin', 'financeiro'));

CREATE POLICY "Admin e financeiro podem ver contas a pagar" ON public.contas_pagar FOR SELECT USING (public.has_any_role(auth.uid(), 'admin', 'financeiro'));
CREATE POLICY "Admin e financeiro podem gerenciar contas a pagar" ON public.contas_pagar FOR ALL USING (public.has_any_role(auth.uid(), 'admin', 'financeiro'));

-- Remover coluna role de profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;