-- =====================================================================
-- DOUTORTEC - Script SQL para Exclusão de Usuários (RPC + RLS)
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para ativar a exclusão
-- de usuários pelo Administrador tanto na tabela public.perfis quanto 
-- na autenticação (auth.users).
-- =====================================================================

-- 1. Garante que exista política de DELETE na tabela public.perfis
DROP POLICY IF EXISTS "Permitir exclusão de perfis" ON public.perfis;
CREATE POLICY "Permitir exclusão de perfis"
ON public.perfis
FOR DELETE
USING (
  (auth.uid() = id) OR is_admin()
);

-- 2. Cria a função RPC com privilégios de superusuário (SECURITY DEFINER)
-- para permitir deletar da tabela auth.users do Supabase Auth
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Permite apenas Administradores ou o próprio usuário
  IF NOT (public.is_admin() OR auth.uid() = user_id) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir usuários.';
  END IF;

  -- Remove vínculos de fluxos de especialidades se existirem
  DELETE FROM public.fluxos_especialidades_municipios
  WHERE fluxo_id IN (SELECT id FROM public.fluxos_especialidades WHERE especialista_id = user_id);

  DELETE FROM public.fluxos_especialidades WHERE especialista_id = user_id;

  -- Remove o registro de perfil da tabela public.perfis
  DELETE FROM public.perfis WHERE id = user_id;

  -- Remove a conta do Supabase Auth (auth.users)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- 3. Concede permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(uuid) TO authenticated;
