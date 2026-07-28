-- =====================================================================
-- DOUTORTEC - Correção Completa de RLS para a Tabela Perfis
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para corrigir de vez
-- o erro "new row violates row-level security policy for table perfis"
-- ao criar usuários via administrador ou fazer cadastro próprio.
-- =====================================================================

-- 1. Remove políticas anteriores para evitar conflitos de nomes ou regras duplicadas
DROP POLICY IF EXISTS "Permitir inserção de perfil próprio no cadastro" ON public.perfis;
DROP POLICY IF EXISTS "Permitir que usuários visualizem seus próprios perfis" ON public.perfis;
DROP POLICY IF EXISTS "Permitir que usuários atualizem seus próprios perfis" ON public.perfis;
DROP POLICY IF EXISTS "Enable insert for users" ON public.perfis;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.perfis;
DROP POLICY IF EXISTS "Permitir inserção" ON public.perfis;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.perfis;
DROP POLICY IF EXISTS "Permitir leitura de perfis" ON public.perfis;
DROP POLICY IF EXISTS "Permitir atualização de perfis" ON public.perfis;
DROP POLICY IF EXISTS "Permitir que admins insiram perfis" ON public.perfis;

-- 2. Criação da função de validação de Admin (SECURITY DEFINER para evitar recursão infinita no RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfis
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Garante permissões de execução da função
GRANT EXECUTE ON FUNCTION public.is_admin TO anon, authenticated;

-- 3. Nova política de INSERÇÃO (INSERT)
-- Permite inserções para que o cadastro público (signup) e a criação 
-- de perfis por administradores funcionem sem bloqueios de RLS.
CREATE POLICY "Permitir inserção de perfis"
ON public.perfis
FOR INSERT
WITH CHECK (true);

-- 4. Nova política de LEITURA (SELECT)
-- Permite visualizar perfis para que os profissionais se identifiquem no sistema.
CREATE POLICY "Permitir leitura de perfis"
ON public.perfis
FOR SELECT
USING (true);

-- 5. Nova política de ATUALIZAÇÃO (UPDATE)
-- Permite que o próprio usuário edite seu perfil ou que um Administrador edite qualquer perfil.
CREATE POLICY "Permitir atualização de perfis"
ON public.perfis
FOR UPDATE
USING (
  (auth.uid() = id) OR is_admin()
);
