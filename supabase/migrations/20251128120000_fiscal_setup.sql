-- Alterar tabela configuracoes_empresa
ALTER TABLE configuracoes_empresa
ADD COLUMN IF NOT EXISTS certificado_url text,
ADD COLUMN IF NOT EXISTS senha_certificado text,
ADD COLUMN IF NOT EXISTS csc_token text,
ADD COLUMN IF NOT EXISTS csc_id text,
ADD COLUMN IF NOT EXISTS ambiente text DEFAULT 'homologacao', -- homologacao ou producao
ADD COLUMN IF NOT EXISTS proximo_numero_nfe int DEFAULT 1,
ADD COLUMN IF NOT EXISTS proximo_numero_nfce int DEFAULT 1,
ADD COLUMN IF NOT EXISTS serie_nfe int DEFAULT 1,
ADD COLUMN IF NOT EXISTS serie_nfce int DEFAULT 1;

-- Criar tabela notas_fiscais
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    venda_id uuid REFERENCES vendas(id),
    tipo text NOT NULL, -- NFE ou NFCE
    chave_acesso text,
    numero int,
    serie int,
    status text DEFAULT 'pendente', -- pendente, autorizado, rejeitado, cancelado
    xml_url text,
    pdf_url text,
    mensagem_sefaz text,
    recibo text,
    protocolo text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Configurar Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados', 'certificados', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos_fiscais', 'documentos_fiscais', false)
ON CONFLICT (id) DO NOTHING;

-- Policies para Storage (Certificados)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Acesso autenticado a certificados'
    ) THEN
        CREATE POLICY "Acesso autenticado a certificados"
        ON storage.objects FOR ALL
        TO authenticated
        USING ( bucket_id = 'certificados' )
        WITH CHECK ( bucket_id = 'certificados' );
    END IF;
END $$;

-- Policies para Storage (Documentos Fiscais)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Acesso autenticado a documentos fiscais'
    ) THEN
        CREATE POLICY "Acesso autenticado a documentos fiscais"
        ON storage.objects FOR ALL
        TO authenticated
        USING ( bucket_id = 'documentos_fiscais' )
        WITH CHECK ( bucket_id = 'documentos_fiscais' );
    END IF;
END $$;
