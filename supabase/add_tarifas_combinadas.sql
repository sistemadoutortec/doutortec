-- =====================================================================
-- DOUTORTEC - Migracao: Tarifas Combinadas
-- =====================================================================
ALTER TABLE public.configuracoes_financeiras 
ADD COLUMN IF NOT EXISTS especialista_id uuid REFERENCES public.perfis(id) ON DELETE CASCADE;

ALTER TABLE public.configuracoes_financeiras 
DROP CONSTRAINT IF EXISTS configuracoes_financeiras_tipo_check;

ALTER TABLE public.configuracoes_financeiras 
ADD CONSTRAINT configuracoes_financeiras_tipo_check 
CHECK (tipo IN ('global', 'especialidade', 'municipio', 'municipio_especialidade', 'municipio_especialista'));

CREATE UNIQUE INDEX IF NOT EXISTS unique_mun_esp 
ON public.configuracoes_financeiras (municipio_id, especialidade_id) 
WHERE (tipo = 'municipio_especialidade' AND municipio_id IS NOT NULL AND especialidade_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS unique_mun_especialista 
ON public.configuracoes_financeiras (municipio_id, especialista_id) 
WHERE (tipo = 'municipio_especialista' AND municipio_id IS NOT NULL AND especialista_id IS NOT NULL);
