-- =====================================================================
-- DOUTORTEC - Correção de Políticas RLS para a Tabela public.casos
-- =====================================================================
-- Execute este script no SQL Editor do Supabase se você receber erros
-- de RLS ou permissão ao tentar enviar a devolutiva ou atualizar casos.
-- =====================================================================

-- 1. Desabilitar temporariamente e habilitar RLS para limpar estados
ALTER TABLE public.casos ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas de UPDATE que possam causar conflitos
DROP POLICY IF EXISTS "Permitir update para especialista designado" ON public.casos;
DROP POLICY IF EXISTS "Especialistas podem atualizar seus casos" ON public.casos;
DROP POLICY IF EXISTS "Permitir atualização para o especialista do caso" ON public.casos;
DROP POLICY IF EXISTS "Admins podem atualizar todos os casos" ON public.casos;
DROP POLICY IF EXISTS "Permitir update para admins" ON public.casos;
DROP POLICY IF EXISTS "Enable update for users" ON public.casos;

-- 3. Criar política de UPDATE para Especialistas designados
-- O especialista atribuído pode atualizar o caso (mudar status, adicionar devolutiva, etc)
CREATE POLICY "Permitir atualização para o especialista do caso"
ON public.casos
FOR UPDATE
TO authenticated
USING (auth.uid() = especialista_id)
WITH CHECK (auth.uid() = especialista_id);

-- 4. Criar política de UPDATE para Administradores
-- Administradores podem atualizar qualquer caso (reatribuir, fechar, etc)
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
