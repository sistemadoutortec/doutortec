export interface FinanceRule {
  id?: string;
  tipo: 'global' | 'especialidade' | 'municipio' | 'municipio_especialidade' | 'municipio_especialista';
  especialidade_id?: string | null;
  municipio_id?: string | null;
  especialista_id?: string | null;
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
  configs: FinanceRule[],
  municipiosList: Municipio[],
  especialistaId?: string | undefined
) => {
  // Default values matching global fallbacks
  let valorTotal = 225.00;
  let valorRepasseSpec = 150.00;
  let valorRepasseClinico = 0.00;

  // 1. Fallback base: Regra Global
  const globalRule = configs.find(c => c.tipo === 'global');
  if (globalRule) {
    valorTotal = Number(globalRule.valor_total_caso);
    valorRepasseSpec = Number(globalRule.valor_repasse_especialista);
    valorRepasseClinico = Number(globalRule.valor_repasse_clinico);
  }

  // 2. Fallback intermediário: Regra por Especialidade
  if (especialidadeId) {
    const specRule = configs.find(c => c.tipo === 'especialidade' && c.especialidade_id === especialidadeId);
    if (specRule) {
      valorTotal = Number(specRule.valor_total_caso);
      valorRepasseSpec = Number(specRule.valor_repasse_especialista);
      valorRepasseClinico = Number(specRule.valor_repasse_clinico);
    }
  }

  // Resolver ID do município
  let resolvedMunId: string | undefined;
  if (municipioNome) {
    const normalizedMunName = municipioNome.toLowerCase().trim();
    const resolvedMun = municipiosList.find(m => m.municipio.toLowerCase().trim() === normalizedMunName);
    if (resolvedMun) {
      resolvedMunId = resolvedMun.id;
    }
  }

  // 3. Fallback intermediário: Regra por Município
  if (resolvedMunId) {
    const munRule = configs.find(c => c.tipo === 'municipio' && c.municipio_id === resolvedMunId);
    if (munRule) {
      valorTotal = Number(munRule.valor_total_caso);
      valorRepasseSpec = Number(munRule.valor_repasse_especialista);
      valorRepasseClinico = Number(munRule.valor_repasse_clinico);
    }
  }

  // 4. Regra de alta especificidade: Município + Especialidade
  if (resolvedMunId && especialidadeId) {
    const munEspRule = configs.find(
      c => c.tipo === 'municipio_especialidade' && 
           c.municipio_id === resolvedMunId && 
           c.especialidade_id === especialidadeId
    );
    if (munEspRule) {
      valorTotal = Number(munEspRule.valor_total_caso);
      valorRepasseSpec = Number(munEspRule.valor_repasse_especialista);
      valorRepasseClinico = Number(munEspRule.valor_repasse_clinico);
    }
  }

  // 5. Regra de máxima especificidade: Município + Especialista Específico
  if (resolvedMunId && especialistaId) {
    const munEspecialistaRule = configs.find(
      c => c.tipo === 'municipio_especialista' && 
           c.municipio_id === resolvedMunId && 
           c.especialista_id === especialistaId
    );
    if (munEspecialistaRule) {
      valorTotal = Number(munEspecialistaRule.valor_total_caso);
      valorRepasseSpec = Number(munEspecialistaRule.valor_repasse_especialista);
      valorRepasseClinico = Number(munEspecialistaRule.valor_repasse_clinico);
    }
  }

  return {
    valorTotal,
    valorRepasseSpec,
    valorRepasseClinico
  };
};
