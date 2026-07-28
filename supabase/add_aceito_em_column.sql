-- =====================================================================
-- DOUTORTEC - Adicionar coluna 'aceito_em' à tabela de casos
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para garantir que a
-- tabela casos tem a coluna aceito_em para o cálculo de tempo de resposta.
-- =====================================================================

ALTER TABLE public.casos ADD COLUMN IF NOT EXISTS aceito_em timestamptz;
