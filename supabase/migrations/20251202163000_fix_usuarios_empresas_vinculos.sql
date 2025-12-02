-- Migration: Vincular usuários existentes às suas empresas
-- Data: 2025-12-02

-- 1. Criar função para vincular usuário à empresa automaticamente
CREATE OR REPLACE FUNCTION vincular_usuario_empresa()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  -- Buscar empresa pelo email do usuário
  SELECT id INTO v_empresa_id
  FROM empresas
  WHERE email = NEW.email
  LIMIT 1;

  -- Se encontrou uma empresa com o mesmo email, vincular
  IF v_empresa_id IS NOT NULL THEN
    INSERT INTO usuarios_empresas (user_id, empresa_id)
    VALUES (NEW.id, v_empresa_id)
    ON CONFLICT (user_id, empresa_id) DO NOTHING;
    
    RAISE NOTICE 'Usuário % vinculado à empresa %', NEW.email, v_empresa_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar trigger para vincular automaticamente novos usuários
DROP TRIGGER IF EXISTS trigger_vincular_usuario_empresa ON auth.users;
CREATE TRIGGER trigger_vincular_usuario_empresa
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION vincular_usuario_empresa();

-- 3. Vincular usuários existentes que ainda não estão vinculados
INSERT INTO usuarios_empresas (user_id, empresa_id)
SELECT 
  u.id as user_id,
  e.id as empresa_id
FROM auth.users u
INNER JOIN empresas e ON e.email = u.email
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = u.id AND ue.empresa_id = e.id
)
AND u.email != 'admin@admin.com'  -- Excluir super admin
ON CONFLICT (user_id, empresa_id) DO NOTHING;

-- 4. Comentário explicativo
COMMENT ON FUNCTION vincular_usuario_empresa() IS 
'Função que vincula automaticamente um usuário à empresa quando o email do usuário corresponde ao email da empresa';
