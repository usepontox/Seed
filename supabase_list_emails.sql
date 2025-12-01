-- Listar todos os e-mails cadastrados no sistema
SELECT 
    e.nome AS empresa,
    e.email,
    e.ativo,
    e.created_at AS data_cadastro
FROM public.empresas e
ORDER BY e.created_at DESC;
