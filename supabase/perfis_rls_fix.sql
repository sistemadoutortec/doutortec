-- =====================================================================
-- DOUTORTEC - Correção de Política RLS para Cadastro de Perfis
-- =====================================================================

-- O erro "new row violates row-level security policy for table 'perfis'"
-- ocorre porque a tabela public.perfis está com RLS (Segurança de Linha) ativado,
-- mas não há nenhuma política (POLICY) que permita a inserção de novos perfis 
-- no momento do cadastro (sign up).

-- Para corrigir isso, execute o comando abaixo no SQL Editor do seu console Supabase:

-- 1. Garante que qualquer usuário (autenticado ou anônimo em processo de cadastro)
-- possa inserir seu próprio perfil contanto que o 'id' do perfil corresponda ao seu 'auth.uid()'.
CREATE POLICY "Permitir inserção de perfil próprio no cadastro"
ON public.perfis
FOR INSERT
WITH CHECK (
  -- Permite a inserção se o ID do perfil corresponder ao ID gerado pelo Supabase Auth
  -- ou (caso o token da sessão ainda esteja carregando) permite a inserção pública inicial
  (auth.uid() = id) OR (auth.uid() IS NULL)
);

-- 2. Política de Leitura própria (por garantia)
CREATE POLICY "Permitir que usuários visualizem seus próprios perfis"
ON public.perfis
FOR SELECT
USING (
  (auth.uid() = id) OR 
  -- Admins podem ler todos os perfis para a tela de aprovação
  (EXISTS (
    SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'admin'
  ))
);

-- 3. Política de Atualização própria
CREATE POLICY "Permitir que usuários atualizem seus próprios perfis"
ON public.perfis
FOR UPDATE
USING (auth.uid() = id);
