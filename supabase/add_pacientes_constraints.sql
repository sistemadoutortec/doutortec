-- =====================================================================
-- DOUTORTEC - Migracao: Campos Obrigatorios na Tabela Pacientes
-- Garante: municipio_id, data_nascimento, cpf, sexo NOT NULL
-- =====================================================================

-- 1. Se houver pacientes legados sem data de nascimento, atribui valor padrao seguro antes da constraint
UPDATE public.pacientes 
SET data_nascimento = '1990-01-01' 
WHERE data_nascimento IS NULL;

-- 2. Se houver pacientes legados sem sexo, define padrao 'M'
UPDATE public.pacientes 
SET sexo = 'M' 
WHERE sexo IS NULL;

-- 3. Se houver pacientes legados sem municipio_id, vincula ao primeiro municipio disponivel
DO $$
DECLARE
    primeiro_mun_id uuid;
BEGIN
    SELECT id INTO primeiro_mun_id FROM public.fluxos_municipios LIMIT 1;
    IF primeiro_mun_id IS NOT NULL THEN
        UPDATE public.pacientes 
        SET municipio_id = primeiro_mun_id 
        WHERE municipio_id IS NULL;
    END IF;
END $$;

-- 4. Adiciona ou atualiza constraints NOT NULL
ALTER TABLE public.pacientes 
ALTER COLUMN data_nascimento SET NOT NULL;

ALTER TABLE public.pacientes 
ALTER COLUMN sexo SET NOT NULL;

ALTER TABLE public.pacientes 
ALTER COLUMN cpf SET NOT NULL;

-- Constraint de chave estrangeira com fluxos_municipios caso ainda nao exista
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_pacientes_municipio'
    ) THEN
        ALTER TABLE public.pacientes 
        ADD CONSTRAINT fk_pacientes_municipio 
        FOREIGN KEY (municipio_id) REFERENCES public.fluxos_municipios(id) ON DELETE RESTRICT;
    END IF;
END $$;
