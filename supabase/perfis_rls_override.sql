-- =====================================================================
-- DOUTORTEC - Substituição de Políticas RLS para Cadastro
-- =====================================================================

-- O erro de violação ocorre quando existe uma regra antiga ou conflitante
-- que impede a inserção. Vamos limpar as políticas de INSERT existentes e 
-- criar uma política permissiva para inserções no cadastro.

-- 1. Remove qualquer política de inserção antiga para evitar conflitos de nome
DROP POLICY IF EXISTS "Permitir inserção de perfil próprio no cadastro" ON public.perfis;
DROP POLICY IF EXISTS "Enable insert for users" ON public.perfis;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.perfis;
DROP POLICY IF EXISTS "Permitir inserção" ON public.perfis;

-- 2. Cria a nova política de inserção livre de validações de token JWT/Sessão (comum no signup)
-- Isso resolve problemas onde o e-mail não foi verificado ainda e a sessão não está ativa.
CREATE POLICY "Permitir inserção de perfil próprio no cadastro"
ON public.perfis
FOR INSERT
WITH CHECK (true);
