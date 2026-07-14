-- =====================================================================
-- DOUTORTEC - Adicionar coluna de leitura (lida) à tabela mensagens_chat
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para suportar
-- o controle de persistência de status de leitura do chat de apoio.
-- =====================================================================

ALTER TABLE public.mensagens_chat ADD COLUMN IF NOT EXISTS lida boolean NOT NULL DEFAULT false;
