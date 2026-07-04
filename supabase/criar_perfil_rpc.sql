-- =====================================================================
-- DOUTORTEC - Função RPC para Inserção de Perfil no Cadastro
-- =====================================================================
-- Esta função é executada com privilégios SECURITY DEFINER, ou seja,
-- ela roda como o dono da função (postgres) e bypassa o RLS completamente.
-- Isso resolve o problema de inserção de perfil durante o sign up,
-- quando a sessão JWT ainda não está ativa no cliente.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.criar_perfil_usuario(
  p_id uuid,
  p_nome text,
  p_email text,
  p_cpf text,
  p_role text,
  p_municipio text,
  p_instituicao text,
  p_telefone text DEFAULT NULL,
  p_crm_coren text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (
    id,
    nome,
    email,
    cpf,
    role,
    municipio,
    instituicao,
    telefone,
    crm_coren,
    status_cadastro
  ) VALUES (
    p_id,
    p_nome,
    p_email,
    p_cpf,
    p_role,
    p_municipio,
    p_instituicao,
    p_telefone,
    p_crm_coren,
    CASE 
      WHEN p_role IN ('solicitante', 'especialista') THEN 'pendente'
      ELSE 'aprovado'
    END
  )
  ON CONFLICT (id) DO NOTHING;  -- Evita erro se já existir (idempotente)
END;
$$;

-- Garante que qualquer usuário autenticado ou anônimo pode chamar esta função
GRANT EXECUTE ON FUNCTION public.criar_perfil_usuario TO anon, authenticated;
