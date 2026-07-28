-- =====================================================================
-- DOUTORTEC - Correção de Políticas RLS para Casos e Avaliações
-- =====================================================================
-- Execute este script no SQL Editor do Supabase se você receber erros
-- de RLS ou permissão ao tentar fechar, avaliar ou atualizar casos.
-- =====================================================================

-- 1. Garante que RLS está habilitado para a tabela casos
ALTER TABLE public.casos ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas de UPDATE que possam causar conflitos
DROP POLICY IF EXISTS "Permitir update para especialista designado" ON public.casos;
DROP POLICY IF EXISTS "Especialistas podem atualizar seus casos" ON public.casos;
DROP POLICY IF EXISTS "Permitir atualização para o especialista do caso" ON public.casos;
DROP POLICY IF EXISTS "Admins podem atualizar todos os casos" ON public.casos;
DROP POLICY IF EXISTS "Permitir update para admins" ON public.casos;
DROP POLICY IF EXISTS "Enable update for users" ON public.casos;
DROP POLICY IF EXISTS "Permitir atualização para o solicitante do caso" ON public.casos;

-- 3. Criar política de UPDATE para Especialistas designados
-- O especialista atribuído pode atualizar o caso (devolutiva, etc.)
CREATE POLICY "Permitir atualização para o especialista do caso"
ON public.casos
FOR UPDATE
TO authenticated
USING (auth.uid() = especialista_id)
WITH CHECK (auth.uid() = especialista_id OR especialista_id IS NULL);

-- 4. Criar política de UPDATE para Solicitantes do caso
-- O solicitante pode atualizar o próprio caso (por exemplo, ao fechar e avaliar o caso)
CREATE POLICY "Permitir atualização para o solicitante do caso"
ON public.casos
FOR UPDATE
TO authenticated
USING (auth.uid() = solicitante_id);

-- 5. Criar política de UPDATE para Administradores
-- Administradores podem atualizar qualquer caso (reatribuir, fechar, etc.)
CREATE POLICY "Permitir update para admins"
ON public.casos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfis
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================================
-- 6. Configurar RLS para a tabela casos_avaliacoes
-- =====================================================================
ALTER TABLE public.casos_avaliacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de avaliacoes" ON public.casos_avaliacoes;
DROP POLICY IF EXISTS "Permitir inserção de avaliacoes pelo solicitante" ON public.casos_avaliacoes;
DROP POLICY IF EXISTS "Permitir update de avaliacoes pelo solicitante" ON public.casos_avaliacoes;

-- Permite leitura pública/autenticada de avaliações para o ranking
CREATE POLICY "Permitir leitura de avaliacoes"
ON public.casos_avaliacoes
FOR SELECT
USING (true);

-- Permite que o solicitante insira avaliações vinculadas ao seu ID
CREATE POLICY "Permitir inserção de avaliacoes pelo solicitante"
ON public.casos_avaliacoes
FOR INSERT
WITH CHECK (auth.uid() = solicitante_id);

-- Permite que o solicitante atualize avaliações vinculadas ao seu ID
CREATE POLICY "Permitir update de avaliacoes pelo solicitante"
ON public.casos_avaliacoes
FOR UPDATE
USING (auth.uid() = solicitante_id);
