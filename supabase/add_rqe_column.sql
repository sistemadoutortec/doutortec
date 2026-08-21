-- =====================================================================
-- DOUTORTEC - Adicionar coluna rqe à tabela public.perfis
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para garantir que a
-- tabela perfis possa armazenar o Registro de Qualificação de Especialista (RQE).
-- =====================================================================

ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS rqe text;
