-- =====================================================================
-- DOUTORTEC - Adicionar colunas faltantes à tabela public.perfis
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para garantir que a
-- tabela perfis tem todas as colunas necessárias para o sistema.
-- =====================================================================

-- Adiciona coluna 'role' se não existir
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'solicitante';

-- Adiciona coluna 'municipio' se não existir
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS municipio text;

-- Adiciona coluna 'instituicao' se não existir
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS instituicao text;

-- Adiciona coluna 'telefone' se não existir
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS telefone text;

-- Adiciona coluna 'status_cadastro' se não existir
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS status_cadastro text NOT NULL DEFAULT 'pendente';

-- Adiciona coluna 'created_at' se não existir
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Confirma as colunas existentes (execute para verificar)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'perfis'
ORDER BY ordinal_position;
