-- Migration: Fix case sensitivity in user-company linking
-- Data: 2025-12-02

-- 1. Update function to use case-insensitive comparison
CREATE OR REPLACE FUNCTION vincular_usuario_empresa()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  -- Buscar empresa pelo email do usuário (case insensitive)
  SELECT id INTO v_empresa_id
  FROM empresas
  WHERE LOWER(email) = LOWER(NEW.email)
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

-- 2. Re-run linking for existing unlinked users (case insensitive)
INSERT INTO usuarios_empresas (user_id, empresa_id)
SELECT 
  u.id as user_id,
  e.id as empresa_id
FROM auth.users u
INNER JOIN empresas e ON LOWER(e.email) = LOWER(u.email)
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = u.id AND ue.empresa_id = e.id
)
AND u.email != 'admin@admin.com'  -- Excluir super admin
ON CONFLICT (user_id, empresa_id) DO NOTHING;

-- 3. Comment
COMMENT ON FUNCTION vincular_usuario_empresa() IS 
'Função que vincula automaticamente um usuário à empresa quando o email do usuário corresponde ao email da empresa (case insensitive)';
