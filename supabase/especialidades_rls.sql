-- =====================================================================
-- DOUTORTEC - Permitir Leitura Pública da Tabela especialidades
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para garantir que o 
-- formulário de cadastro público de novos médicos (Register.tsx) consiga 
-- listar as especialidades médicas mesmo quando o usuário for anônimo (anon).
-- =====================================================================

ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de especialidades" ON public.especialidades;
DROP POLICY IF EXISTS "Permitir leitura de especialidades" ON public.especialidades;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.especialidades;

CREATE POLICY "Permitir leitura publica de especialidades"
ON public.especialidades
FOR SELECT
TO anon, authenticated
USING (true);
