-- =====================================================================
-- DOUTORTEC - Permitir Leitura Pública da Tabela fluxos_municipios
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para garantir que o 
-- formulário de cadastro público (Register.tsx) consiga carregar a lista 
-- de municípios credenciados mesmo quando o usuário for anônimo (anon).
-- =====================================================================

ALTER TABLE public.fluxos_municipios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de municipios parceiros" ON public.fluxos_municipios;
DROP POLICY IF EXISTS "Permitir leitura de municípios" ON public.fluxos_municipios;

CREATE POLICY "Permitir leitura publica de municipios parceiros"
ON public.fluxos_municipios
FOR SELECT
TO anon, authenticated
USING (true);
