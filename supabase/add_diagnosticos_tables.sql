-- =====================================================================
-- DOUTORTEC - Criar Tabelas de Referência Clínica (CID-10 e CIAP-2)
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para suportar
-- a classificação diagnóstica oficial de teleconsultorias.
-- =====================================================================

-- 1. Criar tabela de referência CID-10
CREATE TABLE IF NOT EXISTS public.cid10 (
  codigo text PRIMARY KEY,
  descricao text NOT NULL
);

-- Habilitar RLS na tabela cid10
ALTER TABLE public.cid10 ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública para cid10
CREATE POLICY "Leitura pública de CID-10" ON public.cid10
  FOR SELECT USING (true);

-- 2. Criar tabela de referência CIAP-2
CREATE TABLE IF NOT EXISTS public.ciap2 (
  codigo text PRIMARY KEY,
  descricao text NOT NULL
);

-- Habilitar RLS na tabela ciap2
ALTER TABLE public.ciap2 ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública para ciap2
CREATE POLICY "Leitura pública de CIAP-2" ON public.ciap2
  FOR SELECT USING (true);

-- 3. Adicionar colunas de codificação clínica à tabela de casos
ALTER TABLE public.casos ADD COLUMN IF NOT EXISTS cid_10 text REFERENCES public.cid10(codigo);
ALTER TABLE public.casos ADD COLUMN IF NOT EXISTS ciap_2 text REFERENCES public.ciap2(codigo);

-- 4. Popular tabelas com os códigos e diagnósticos mais comuns na Atenção Primária
INSERT INTO public.cid10 (codigo, descricao) VALUES
('A09', 'Diarreia e gastroenterite de origem infecciosa presumida'),
('I10', 'Hipertensao essencial (primaria)'),
('E11', 'Diabetes mellitus nao-insulino-dependente'),
('J06', 'Infeccoes agudas das vias aereas superiores de localizacoes multiplas e nao especificadas'),
('N39', 'Outros transtornos do aparelho urinario'),
('M54', 'Dorsalgia (Dor nas costas)'),
('F41', 'Outros transtornos ansiosos'),
('K21', 'Doenca de refluxo gastroesofagico'),
('B34', 'Doencas por virus, de localizacao nao especificada'),
('R51', 'Cefaleia (Dor de cabeca)')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.ciap2 (codigo, descricao) VALUES
('A03', 'Febre'),
('K86', 'Hipertensao sem complicacao'),
('T90', 'Diabetes nao-insulinodependente'),
('R74', 'Sintomas/queixas respiratorias agudas'),
('U02', 'Urina com aspecto/odor anormal'),
('L02', 'Dores nas costas/lombar'),
('P74', 'Transtorno ansioso/estado de ansiedade'),
('D87', 'Dores de estomago/indigestao'),
('A77', 'Infeccao viral n.e.p.'),
('N01', 'Dor de cabeca')
ON CONFLICT (codigo) DO NOTHING;
