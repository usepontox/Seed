-- 1. Atualizar a função que cria novos usuários para que o padrão seja 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Define role como 'admin' por padrão (em vez de 'caixa')
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin')::app_role;
  
  -- Inserir perfil
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Novo Usuário'),
    NEW.email
  );
  
  -- Inserir role na tabela user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;

-- 2. Deletar todas as roles que não são 'admin'
DELETE FROM public.user_roles WHERE role != 'admin';

-- 3. Adicionar role 'admin' para todos os usuários que não têm
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Garantir vínculo com empresa para todos (caso alguém tenha ficado sem)
INSERT INTO public.usuarios_empresas (user_id, empresa_id)
SELECT 
  u.id,
  (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.usuarios_empresas ue WHERE ue.user_id = u.id
)
ON CONFLICT DO NOTHING;