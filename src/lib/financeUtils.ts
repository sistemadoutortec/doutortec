interface Rule {
  tipo: 'global' | 'especialidade' | 'municipio';
  especialidade_id?: string | null;
  municipio_id?: string | null;
  valor_total_caso: number;
  valor_repasse_especialista: number;
  valor_repasse_clinico: number;
}

interface Municipio {
  id: string;
  municipio: string;
}

export const getPricingForCaso = (
  especialidadeId: string | undefined,
  municipioNome: string | undefined,
  configs: Rule[],
  municipiosList: Municipio[]
) => {
  // Default values matching global fallbacks
  let valorTotal = 225.00;
  let valorRepasseSpec = 150.00;
  let valorRepasseClinico = 0.00;

  // 1. Apply Global rule first
  const globalRule = configs.find(c => c.tipo === 'global');
  if (globalRule) {
    valorTotal = Number(globalRule.valor_total_caso);
    valorRepasseSpec = Number(globalRule.valor_repasse_especialista);
    valorRepasseClinico = Number(globalRule.valor_repasse_clinico);
  }

  // 2. Override with Specialty rule if exists
  if (especialidadeId) {
    const specRule = configs.find(c => c.tipo === 'especialidade' && c.especialidade_id === especialidadeId);
    if (specRule) {
      valorTotal = Number(specRule.valor_total_caso);
      valorRepasseSpec = Number(specRule.valor_repasse_especialista);
      valorRepasseClinico = Number(specRule.valor_repasse_clinico);
    }
  }

  // 3. Override with Municipality rule if exists (case-insensitive name resolving)
  if (municipioNome) {
    const normalizedMunName = municipioNome.toLowerCase().trim();
    const resolvedMun = municipiosList.find(m => m.municipio.toLowerCase().trim() === normalizedMunName);
    if (resolvedMun) {
      const munRule = configs.find(c => c.tipo === 'municipio' && c.municipio_id === resolvedMun.id);
      if (munRule) {
        valorTotal = Number(munRule.valor_total_caso);
        valorRepasseSpec = Number(munRule.valor_repasse_especialista);
        valorRepasseClinico = Number(munRule.valor_repasse_clinico);
      }
    }
  }

  return {
    valorTotal,
    valorRepasseSpec,
    valorRepasseClinico
  };
};
