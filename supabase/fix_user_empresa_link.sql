-- Verificar e corrigir vínculos de usuários com empresas
-- Execute este SQL no Supabase Dashboard

-- 1. Ver seu user_id atual
SELECT auth.uid() as meu_user_id;

-- 2. Ver empresas disponíveis
SELECT id, nome FROM public.empresas;

-- 3. Ver vínculos existentes
SELECT * FROM public.usuarios_empresas WHERE user_id = auth.uid();

-- 4. Se não houver vínculo, criar um (SUBSTITUA os valores)
-- IMPORTANTE: Substitua 'SEU_USER_ID' e 'SUA_EMPRESA_ID' pelos valores reais
/*
INSERT INTO public.usuarios_empresas (user_id, empresa_id, role)
VALUES (
    'SEU_USER_ID',  -- Copie o UUID da query 1
    'SUA_EMPRESA_ID',  -- Copie o UUID da query 2
    'admin'
);
*/

-- 5. Verificar novamente
SELECT * FROM public.usuarios_empresas WHERE user_id = auth.uid();
