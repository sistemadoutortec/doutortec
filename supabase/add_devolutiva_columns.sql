-- =====================================================================
-- DOUTORTEC - Adicionar colunas de devolutiva oficial à tabela de casos
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para suportar
-- a nova estrutura de Ticket / Devolutiva Estruturada e datas de resposta.
-- =====================================================================

ALTER TABLE public.casos ADD COLUMN IF NOT EXISTS devolutiva_conduta text;
ALTER TABLE public.casos ADD COLUMN IF NOT EXISTS devolutiva_aps text;
ALTER TABLE public.casos ADD COLUMN IF NOT EXISTS respondido_em timestamptz;
ALTER TABLE public.casos ADD COLUMN IF NOT EXISTS fechado_em timestamptz;
