-- =====================================================================
-- DOUTORTEC - Configuração de Storage e Políticas de Segurança (RLS)
-- =====================================================================

-- 1. Criação do Bucket Privado para Documentos Médicos e Exames
-- Define o limite de tamanho para 15MB (15.728.640 bytes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'doutortec-documentos',
  'doutortec-documentos',
  false, -- Bucket privado por segurança de dados médicos (LGPD)
  15728640, -- Limite estrito de 15MB
  '{image/jpeg,image/png,image/gif,image/webp,application/pdf}' -- Apenas imagens e PDFs comuns de exames
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Habilitar RLS (Row Level Security) na tabela de Storage
-- Nota: A tabela storage.objects por padrão já tem RLS habilitado,
-- mas garantimos que as políticas criadas sejam aplicadas.

-- 3. Política de Inserção (Upload de Arquivos)
-- Permite que apenas profissionais de saúde devidamente autenticados no sistema façam upload.
CREATE POLICY "Permitir upload para profissionais autenticados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'doutortec-documentos' AND
  (auth.role() = 'authenticated')
);

-- 4. Política de Leitura (Download/Visualização de Arquivos)
-- Permite a visualização de exames anexados apenas a usuários autenticados na plataforma.
CREATE POLICY "Permitir leitura apenas para usuários autenticados"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'doutortec-documentos' AND
  (auth.role() = 'authenticated')
);

-- 5. Política de Exclusão (Deletar Arquivos)
-- Permite exclusão apenas ao proprietário do upload que esteja autenticado
CREATE POLICY "Permitir exclusão ao proprietário autenticado"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'doutortec-documentos' AND
  (owner = auth.uid()::text)
);
