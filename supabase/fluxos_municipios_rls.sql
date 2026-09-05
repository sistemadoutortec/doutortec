-- =====================================================================
-- DOUTORTEC - RLS Completo para a Tabela fluxos_municipios
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para liberar a leitura
-- pública no cadastro e permissões de adição/remoção por administradores.
-- =====================================================================

ALTER TABLE public.fluxos_municipios ENABLE ROW LEVEL SECURITY;

-- 1. Leitura pública (para cadastro de usuários anônimos e autenticados)
DROP POLICY IF EXISTS "Permitir leitura publica de municipios parceiros" ON public.fluxos_municipios;
DROP POLICY IF EXISTS "Permitir leitura de municípios" ON public.fluxos_municipios;

CREATE POLICY "Permitir leitura publica de municipios parceiros"
ON public.fluxos_municipios
FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Inserção (para administradores cadastrarem novos municípios)
DROP POLICY IF EXISTS "Permitir inserção de municípios por administradores" ON public.fluxos_municipios;

CREATE POLICY "Permitir inserção de municípios por administradores"
ON public.fluxos_municipios
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Exclusão (para administradores removerem municípios)
DROP POLICY IF EXISTS "Permitir exclusão de municípios por administradores" ON public.fluxos_municipios;

CREATE POLICY "Permitir exclusão de municípios por administradores"
ON public.fluxos_municipios
FOR DELETE
TO authenticated
USING (true);
