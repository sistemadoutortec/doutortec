-- Up Migration: Create configuracoes_financeiras table
CREATE TABLE IF NOT EXISTS public.configuracoes_financeiras (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo text NOT NULL CHECK (tipo IN ('global', 'especialidade', 'municipio')),
    especialidade_id uuid REFERENCES public.especialidades(id) ON DELETE CASCADE,
    municipio_id uuid REFERENCES public.fluxos_municipios(id) ON DELETE CASCADE,
    valor_total_caso numeric(10,2) NOT NULL DEFAULT 0.00,
    valor_repasse_especialista numeric(10,2) NOT NULL DEFAULT 0.00,
    valor_repasse_clinico numeric(10,2) NOT NULL DEFAULT 0.00,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enforce conditional unique indexes (PostgreSQL standard for conditional uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS unique_global ON public.configuracoes_financeiras (tipo) 
WHERE (tipo = 'global');

CREATE UNIQUE INDEX IF NOT EXISTS unique_especialidade ON public.configuracoes_financeiras (especialidade_id) 
WHERE (tipo = 'especialidade');

CREATE UNIQUE INDEX IF NOT EXISTS unique_municipio ON public.configuracoes_financeiras (municipio_id) 
WHERE (tipo = 'municipio');

-- Enable RLS and setup policies
ALTER TABLE public.configuracoes_financeiras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on configuracoes_financeiras" ON public.configuracoes_financeiras;
CREATE POLICY "Allow public select on configuracoes_financeiras" ON public.configuracoes_financeiras
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin write on configuracoes_financeiras" ON public.configuracoes_financeiras;
CREATE POLICY "Allow admin write on configuracoes_financeiras" ON public.configuracoes_financeiras
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default global pricing configuration safely without ON CONFLICT constraints matching issues
INSERT INTO public.configuracoes_financeiras (tipo, valor_total_caso, valor_repasse_especialista, valor_repasse_clinico)
SELECT 'global', 225.00, 150.00, 0.00
WHERE NOT EXISTS (
    SELECT 1 FROM public.configuracoes_financeiras WHERE tipo = 'global'
);
