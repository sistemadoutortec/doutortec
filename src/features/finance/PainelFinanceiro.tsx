import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { DollarSign, Filter, Loader2, AlertCircle, Plus, Trash2, X, Pencil } from 'lucide-react';

interface FinanceLaunch {
  id: string;
  especialistaId: string;
  profissionalNome: string;
  justificativa: string;
  valorBonus: number;
  created_at: string;
}

interface SpecialistProduction {
  especialistaId: string;
  nome: string;
  crmCoren: string;
  quantidadeCasos: number;
  valorBase: number;
  bonusAdicionais: number;
  valorTotal: number;
}

export const PainelFinanceiro: React.FC = () => {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = perfil?.role === 'admin';

  // State for Month/Year filter: format YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Modal State for adding manual bonus
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [formEspecialistaId, setFormEspecialistaId] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formJustificativa, setFormJustificativa] = useState('');
  const [bonusError, setBonusError] = useState<string | null>(null);

  // States for adjusting production value
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustEspecialista, setAdjustEspecialista] = useState<SpecialistProduction | null>(null);
  const [adjustNovoValor, setAdjustNovoValor] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // States for editing manual bonus
  const [editBonusModalOpen, setEditBonusModalOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<FinanceLaunch | null>(null);
  const [editValor, setEditValor] = useState('');
  const [editJustificativa, setEditJustificativa] = useState('');
  const [editBonusError, setEditBonusError] = useState<string | null>(null);

  // 1. Fetch Specialists for mapping
  const { data: specialists = [], isLoading: loadingSpecs } = useQuery({
    queryKey: ['financeiro-especialistas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, crm_coren, municipio')
        .eq('role', 'especialista')
        .eq('status_cadastro', 'aprovado');
      if (error) throw error;
      return data || [];
    }
  });

  // 2. Fetch Cases resolved/closed
  const { data: cases = [], isLoading: loadingCases } = useQuery({
    queryKey: ['financeiro-casos', selectedMonth],
    queryFn: async () => {
      // Fetch only columns needed
      const { data, error } = await supabase
        .from('casos')
        .select('id, especialista_id, status, created_at, respondido_em, fechado_em')
        .not('especialista_id', 'is', null)
        .in('status', ['respondido', 'fechado']);
      if (error) throw error;
      return data || [];
    }
  });

  // 3. Fetch Manual Bonuses
  const { data: rawBonuses = [], isLoading: loadingBonuses } = useQuery({
    queryKey: ['financeiro-bonus', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_bonus')
        .select('id, especialista_id, valor, justificativa, created_at');
      if (error) throw error;
      return data || [];
    }
  });

  // Mutation: Insert manual bonus
  const addBonusMutation = useMutation({
    mutationFn: async (bonusData: { especialista_id: string; valor: number; justificativa: string }) => {
      const { data, error } = await supabase
        .from('financeiro_bonus')
        .insert([bonusData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-bonus', selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-casos', selectedMonth] });
      setBonusModalOpen(false);
      setFormEspecialistaId('');
      setFormValor('');
      setFormJustificativa('');
      setBonusError(null);
    },
    onError: (err: any) => {
      console.error(err);
      setBonusError(`Falha ao registrar bônus: ${err.message || err}`);
    }
  });

  // Mutation: Delete manual bonus
  const deleteBonusMutation = useMutation({
    mutationFn: async (bonusId: string) => {
      const { error } = await supabase
        .from('financeiro_bonus')
        .delete()
        .eq('id', bonusId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-bonus', selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-casos', selectedMonth] });
    },
    onError: (err: any) => {
      console.error(err);
      alert(`Falha ao remover o bônus: ${err.message || err}`);
    }
  });

  // Mutation: Insert manual bonus for adjust production
  const adjustProductionMutation = useMutation({
    mutationFn: async (adjustData: { especialista_id: string; valor: number; justificativa: string }) => {
      const { data, error } = await supabase
        .from('financeiro_bonus')
        .insert([adjustData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-bonus', selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-casos', selectedMonth] });
      setAdjustModalOpen(false);
      setAdjustEspecialista(null);
      setAdjustNovoValor('');
      setAdjustError(null);
    },
    onError: (err: any) => {
      console.error(err);
      setAdjustError(`Falha ao salvar ajuste: ${err.message || err}`);
    }
  });

  // Mutation: Update manual bonus
  const updateBonusMutation = useMutation({
    mutationFn: async (bonusData: { id: string; valor: number; justificativa: string }) => {
      const { data, error } = await supabase
        .from('financeiro_bonus')
        .update({
          valor: bonusData.valor,
          justificativa: bonusData.justificativa
        })
        .eq('id', bonusData.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-bonus', selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-casos', selectedMonth] });
      setEditBonusModalOpen(false);
      setEditingBonus(null);
      setEditValor('');
      setEditJustificativa('');
      setEditBonusError(null);
    },
    onError: (err: any) => {
      console.error(err);
      setEditBonusError(`Falha ao atualizar bônus: ${err.message || err}`);
    }
  });

  // Process data in-memory based on selectedMonth (YYYY-MM)
  const processDashboardData = () => {
    const specMap = new Map(specialists.map(s => [s.id, s]));
    
    // Filter resolved cases in the selected month
    const casesInMonth = cases.filter(c => {
      const dateToCheck = c.respondido_em || c.fechado_em || c.created_at;
      if (!dateToCheck) return false;
      return dateToCheck.substring(0, 7) === selectedMonth;
    });

    // Filter bonuses in the selected month
    const bonusesInMonth = rawBonuses.filter(b => {
      if (!b.created_at) return false;
      return b.created_at.substring(0, 7) === selectedMonth;
    });

    // Build lists
    // 1. Bonuses history
    const bonusesList: FinanceLaunch[] = bonusesInMonth.map(b => {
      const spec = specMap.get(b.especialista_id);
      return {
        id: b.id,
        especialistaId: b.especialista_id,
        profissionalNome: spec?.nome || 'Especialista Não Identificado',
        justificativa: b.justificativa,
        valorBonus: Number(b.valor),
        created_at: b.created_at
      };
    });

    // 2. Production per specialist
    const productionList: SpecialistProduction[] = specialists.map(esp => {
      const espCasos = casesInMonth.filter(c => c.especialista_id === esp.id);
      const espBonuses = bonusesInMonth.filter(b => b.especialista_id === esp.id);

      const quantidadeCasos = espCasos.length;
      const valorBase = quantidadeCasos * 150.00; // Pactuado R$ 150,00 por caso
      const bonusAdicionais = espBonuses.reduce((acc, curr) => acc + Number(curr.valor), 0);
      const valorTotal = valorBase + bonusAdicionais;

      return {
        especialistaId: esp.id,
        nome: esp.nome,
        crmCoren: esp.crm_coren || '—',
        quantidadeCasos,
        valorBase,
        bonusAdicionais,
        valorTotal
      };
    });

    // Compute Global KPIs
    const totalCases = casesInMonth.length;
    const totalBaseRepasses = totalCases * 150.00;
    const totalBonusRepasses = bonusesInMonth.reduce((acc, curr) => acc + Number(curr.valor), 0);
    const totalRepasses = totalBaseRepasses + totalBonusRepasses;
    
    // Platform Pricing (Platform charges R$ 225.00 per case to municipalities)
    const platformFaturamento = totalCases * 225.00;
    const platformLucroLiquido = platformFaturamento - totalRepasses;

    // Filtered lists for specialist dashboard
    const myProduction = productionList.find(p => p.especialistaId === perfil?.id);
    const myCasesCount = myProduction?.quantidadeCasos || 0;
    const myBaseValue = myProduction?.valorBase || 0;
    const myBonusValue = myProduction?.bonusAdicionais || 0;
    const myTotalValue = myProduction?.valorTotal || 0;
    
    // For specialist, cases on 'respondido' status are pending liquidity, 'fechado' cases are paid
    const specialistCases = casesInMonth.filter(c => c.especialista_id === perfil?.id);
    const pendingCases = specialistCases.filter(c => c.status === 'respondido').length;
    const closedCases = specialistCases.filter(c => c.status === 'fechado').length;
    
    const saldoAReceber = (pendingCases * 150.00) + myBonusValue; // includes all bonuses in month as receivable or separate
    const totalPago = closedCases * 150.00;

    return {
      bonusesList,
      productionList: productionList.filter(p => p.quantidadeCasos > 0 || p.bonusAdicionais > 0),
      adminKpis: {
        faturamento: platformFaturamento,
        repasses: totalRepasses,
        custoMedio: totalCases > 0 ? (totalRepasses / totalCases) : 0,
        lucro: platformLucroLiquido,
        casosCount: totalCases
      },
      specKpis: {
        saldoAReceber,
        totalPago,
        totalRespondido: myCasesCount,
        valorTotal: myTotalValue
      },
      myBonusValue,
      myBaseValue
    };
  };

  const handleAddBonus = (e: React.FormEvent) => {
    e.preventDefault();
    setBonusError(null);

    const val = parseFloat(formValor);
    if (!formEspecialistaId) {
      setBonusError('Por favor, selecione o especialista.');
      return;
    }
    if (isNaN(val) || val <= 0) {
      setBonusError('O valor do bônus deve ser maior que zero.');
      return;
    }
    if (!formJustificativa.trim()) {
      setBonusError('Insira uma justificativa para o bônus.');
      return;
    }

    addBonusMutation.mutate({
      especialista_id: formEspecialistaId,
      valor: val,
      justificativa: formJustificativa.trim()
    });
  };

  const handleClearFilters = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${year}-${month}`);
  };

  const handleStartAdjustProduction = (item: SpecialistProduction) => {
    setAdjustEspecialista(item);
    setAdjustNovoValor(item.valorTotal.toString());
    setAdjustError(null);
    setAdjustModalOpen(true);
  };

  const handleSaveAdjustProduction = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);
    if (!adjustEspecialista) return;

    const novoVal = parseFloat(adjustNovoValor);
    if (isNaN(novoVal) || novoVal < 0) {
      setAdjustError('O novo valor total de repasses deve ser igual ou maior que zero.');
      return;
    }

    const diff = novoVal - adjustEspecialista.valorTotal;
    if (diff === 0) {
      setAdjustError('O valor informado é igual ao valor atual.');
      return;
    }

    adjustProductionMutation.mutate({
      especialista_id: adjustEspecialista.especialistaId,
      valor: diff,
      justificativa: `Ajuste administrativo de produção mensal - Período ${selectedMonth}`
    });
  };

  const handleStartEditBonus = (item: FinanceLaunch) => {
    setEditingBonus(item);
    setEditValor(item.valorBonus.toString());
    setEditJustificativa(item.justificativa);
    setEditBonusError(null);
    setEditBonusModalOpen(true);
  };

  const handleSaveEditBonus = (e: React.FormEvent) => {
    e.preventDefault();
    setEditBonusError(null);
    if (!editingBonus) return;

    const val = parseFloat(editValor);
    if (isNaN(val) || val <= 0) {
      setEditBonusError('O valor do bônus deve ser maior que zero.');
      return;
    }
    if (!editJustificativa.trim()) {
      setEditBonusError('Insira uma justificativa.');
      return;
    }

    updateBonusMutation.mutate({
      id: editingBonus.id,
      valor: val,
      justificativa: editJustificativa.trim()
    });
  };

  const { bonusesList, productionList, adminKpis, specKpis, myBonusValue, myBaseValue } = processDashboardData();
  const loading = loadingSpecs || loadingCases || loadingBonuses;

  return (
    <div className="space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-indigo-650" />
            Controle Financeiro e Faturamento
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {isAdmin 
              ? 'Monitore faturamento, custos de repasses e lance bônus operacionais aos especialistas.' 
              : 'Consulte seu extrato de repasses acumulados, saldos a receber e histórico de produção.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setBonusModalOpen(true)}
            className="rounded-lg bg-indigo-650 hover:bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white transition flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="h-4 w-4" />
            Lançar Bônus Extra
          </button>
        )}
      </div>

      {/* Period Selection Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-150 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-650 uppercase">Período Operacional:</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="block w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
          />
          <button
            onClick={handleClearFilters}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition cursor-pointer whitespace-nowrap"
          >
            Mês Atual
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center bg-white rounded-xl border border-gray-150">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {/* Metrics Cards Grid */}
          {isAdmin ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-450 uppercase">Faturamento Estimado</span>
                <span className="text-2xl font-bold text-gray-900 mt-2">R$ {adminKpis.faturamento.toFixed(2)}</span>
                <span className="text-[10px] text-gray-400 mt-1">{adminKpis.casosCount} chamados respondidos</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-450 uppercase">Repasses a Especialistas</span>
                <span className="text-2xl font-bold text-indigo-600 mt-2">R$ {adminKpis.repasses.toFixed(2)}</span>
                <span className="text-[10px] text-indigo-400 mt-1">Base + Bônus aplicados</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-455 uppercase">Custo Médio por Chamado</span>
                <span className="text-2xl font-bold text-gray-800 mt-2">R$ {adminKpis.custoMedio.toFixed(2)}</span>
                <span className="text-[10px] text-gray-400 mt-1">Média ponderada no mês</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-450 uppercase">Margem Operacional</span>
                <span className="text-2xl font-bold text-green-600 mt-2">R$ {adminKpis.lucro.toFixed(2)}</span>
                <span className="text-[10px] text-green-500 mt-1">Lucro bruto pós-repasses</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-450 uppercase">Saldo a Receber</span>
                <span className="text-2xl font-bold text-amber-600 mt-2">R$ {specKpis.saldoAReceber.toFixed(2)}</span>
                <span className="text-[10px] text-amber-500 mt-1">Casos respondidos aguardando encerramento</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-455 uppercase">Repasses Recebidos</span>
                <span className="text-2xl font-bold text-green-600 mt-2">R$ {specKpis.totalPago.toFixed(2)}</span>
                <span className="text-[10px] text-green-550 mt-1">Transferências autorizadas pós-avaliação</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-450 uppercase">Valor por Chamado</span>
                <span className="text-2xl font-bold text-gray-800 mt-2">R$ 150,00</span>
                <span className="text-[10px] text-gray-400 mt-1">Taxa de produção padrão contratual</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-450 uppercase">Casos Atendidos</span>
                <span className="text-2xl font-bold text-indigo-650 mt-2">{specKpis.totalRespondido}</span>
                <span className="text-[10px] text-indigo-500 mt-1">Total acumulado no período</span>
              </div>
            </div>
          )}

          {/* Production Section */}
          <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
            <div className="px-6 py-4.5 border-b border-gray-150" style={{ backgroundColor: '#f8fafc' }}>
              <h4 className="text-sm font-bold text-gray-900">
                {isAdmin ? 'Demonstrativo de Produção por Especialista' : 'Seu Demonstrativo de Produção Detalhado'}
              </h4>
            </div>
            
            {isAdmin ? (
              productionList.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  Nenhuma produção registrada neste período.
                </div>
              ) : (
                <div className="overflow-x-auto max-w-full">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Especialista</th>
                        <th className="px-6 py-4">Doc/Registro</th>
                        <th className="px-6 py-4 text-center">Quantidade Casos</th>
                        <th className="px-6 py-4 text-center">Valor Base (Produção)</th>
                        <th className="px-6 py-4 text-center">Bônus Lançados</th>
                        <th className="px-6 py-4 text-right">Faturamento Total</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 bg-white">
                      {productionList.map((item) => (
                        <tr key={item.especialistaId} className="hover:bg-gray-55/30 transition">
                          <td className="px-6 py-4 font-bold text-gray-900">{item.nome}</td>
                          <td className="px-6 py-4 text-gray-600">{item.crmCoren}</td>
                          <td className="px-6 py-4 text-center font-semibold text-gray-800">{item.quantidadeCasos}</td>
                          <td className="px-6 py-4 text-center text-gray-700">R$ {item.valorBase.toFixed(2)}</td>
                          <td className="px-6 py-4 text-center text-indigo-650 font-semibold">R$ {item.bonusAdicionais.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900">R$ {item.valorTotal.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleStartAdjustProduction(item)}
                              className="text-indigo-650 hover:text-indigo-850 p-1.5 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Retificar produção"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              // Specialist View of their own row
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-xs text-gray-400 block">Quantidade de Chamados:</span>
                    <strong className="text-lg text-slate-800">{specKpis.totalRespondido}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">Valor Base das Consultas:</span>
                    <strong className="text-lg text-slate-800">R$ {myBaseValue.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">Bônus Manuais Recebidos:</span>
                    <strong className="text-lg text-indigo-600">R$ {myBonusValue.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">Total Líquido Estimado:</span>
                    <strong className="text-lg text-green-600">R$ {specKpis.valorTotal.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manual Bonuses Audit Trail Section */}
          <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
            <div className="px-6 py-4.5 border-b border-gray-150 flex items-center justify-between" style={{ backgroundColor: '#f8fafc' }}>
              <h4 className="text-sm font-bold text-gray-900">Auditoria de Bônus Administrativos</h4>
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
                Lançamentos no mês: {bonusesList.length}
              </span>
            </div>

            {bonusesList.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                Nenhum bônus extra registrado para especialistas neste período.
              </div>
            ) : (
              <div className="overflow-x-auto max-w-full">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Data Lançamento</th>
                      {isAdmin && <th className="px-6 py-4">Especialista</th>}
                      <th className="px-6 py-4">Justificativa Administrativa</th>
                      <th className="px-6 py-4 text-center">Valor do Bônus</th>
                      {isAdmin && <th className="px-6 py-4 text-right">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 bg-white">
                    {bonusesList.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4 text-gray-600 text-xs font-mono">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 font-bold text-gray-900">{item.profissionalNome}</td>
                        )}
                        <td className="px-6 py-4 text-gray-700 text-xs max-w-xs truncate" title={item.justificativa}>
                          {item.justificativa}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-800">
                          R$ {item.valorBonus.toFixed(2)}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleStartEditBonus(item)}
                              className="text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded-lg transition mr-1 cursor-pointer"
                              title="Editar bônus"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Excluir este lançamento de bônus permanentemente?')) {
                                  deleteBonusMutation.mutate(item.id);
                                }
                              }}
                              disabled={deleteBonusMutation.isPending}
                              className="text-red-650 hover:text-red-850 p-1.5 hover:bg-red-50 rounded-lg transition disabled:opacity-50 cursor-pointer"
                              title="Remover lançamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Admin Launch Bonus Modal */}
      {bonusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in select-none">
          <div className="bg-white rounded-2xl border border-gray-250 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 text-white shrink-0" style={{ backgroundColor: '#091151' }}>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4.5 w-4.5 text-[#38bdf8]" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Lançar Bônus Extra
                </h3>
              </div>
              <button 
                onClick={() => {
                  setBonusModalOpen(false);
                  setBonusError(null);
                }}
                className="text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddBonus} className="p-6 space-y-4 text-left overflow-y-auto flex-1">
              {bonusError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{bonusError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Selecionar Especialista *
                </label>
                <select
                  required
                  value={formEspecialistaId}
                  onChange={(e) => setFormEspecialistaId(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="">Selecione...</option>
                  {specialists.map(s => (
                    <option key={s.id} value={s.id}>{s.nome} ({s.crm_coren || 'Sem CRM'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Valor do Bônus (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formValor}
                  onChange={(e) => setFormValor(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-905 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Justificativa Administrativa *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Descreva a razão de lançamento deste bônus (ex: plantão extraordinário, complexidade no caso C10293, etc.)"
                  value={formJustificativa}
                  onChange={(e) => setFormJustificativa(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-905 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-150 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setBonusModalOpen(false);
                    setBonusError(null);
                  }}
                  className="rounded-lg border border-gray-300 hover:bg-gray-50 px-4.5 py-2 text-xs font-semibold text-gray-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addBonusMutation.isPending}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-750 px-4.5 py-2 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  style={{ backgroundColor: '#091151' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#000530'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#091151'}
                >
                  {addBonusMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Lançar Bônus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Production Value Modal */}
      {adjustModalOpen && adjustEspecialista && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in select-none">
          <div className="bg-white rounded-2xl border border-gray-250 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 text-white shrink-0" style={{ backgroundColor: '#091151' }}>
              <div className="flex items-center gap-2">
                <Pencil className="h-4.5 w-4.5 text-[#38bdf8]" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Retificar Produção Mensal
                </h3>
              </div>
              <button 
                onClick={() => {
                  setAdjustModalOpen(false);
                  setAdjustError(null);
                }}
                className="text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustProduction} className="p-6 space-y-4 text-left overflow-y-auto flex-1">
              {adjustError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{adjustError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-550 uppercase mb-0.5">
                  Especialista
                </label>
                <div className="text-sm font-bold text-gray-900">
                  {adjustEspecialista.nome}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-550 uppercase mb-0.5">
                    Consultas Realizadas
                  </label>
                  <div className="text-sm font-semibold text-gray-800">
                    {adjustEspecialista.quantidadeCasos} chamados
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-550 uppercase mb-0.5">
                    Valor Calculado Atual
                  </label>
                  <div className="text-sm font-mono font-bold text-gray-800">
                    R$ {adjustEspecialista.valorTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Novo Valor de Produção Ajustado (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustNovoValor}
                  onChange={(e) => setAdjustNovoValor(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-905 focus:border-indigo-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  A diferença será lançada automaticamente na auditoria de bônus do período.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-150 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustModalOpen(false);
                    setAdjustError(null);
                  }}
                  className="rounded-lg border border-gray-300 hover:bg-gray-50 px-4.5 py-2 text-xs font-semibold text-gray-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adjustProductionMutation.isPending}
                  className="rounded-lg bg-indigo-650 hover:bg-indigo-750 px-4.5 py-2 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  style={{ backgroundColor: '#091151' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#000530'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#091151'}
                >
                  {adjustProductionMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Manual Bonus Modal */}
      {editBonusModalOpen && editingBonus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in select-none">
          <div className="bg-white rounded-2xl border border-gray-250 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 text-white shrink-0" style={{ backgroundColor: '#091151' }}>
              <div className="flex items-center gap-2">
                <Pencil className="h-4.5 w-4.5 text-[#38bdf8]" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Editar Lançamento de Bônus
                </h3>
              </div>
              <button 
                onClick={() => {
                  setEditBonusModalOpen(false);
                  setEditBonusError(null);
                }}
                className="text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBonus} className="p-6 space-y-4 text-left overflow-y-auto flex-1">
              {editBonusError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editBonusError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-550 uppercase mb-0.5">
                  Especialista
                </label>
                <div className="text-sm font-bold text-gray-900">
                  {editingBonus.profissionalNome}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Valor do Bônus (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editValor}
                  onChange={(e) => setEditValor(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-905 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Justificativa Administrativa *
                </label>
                <textarea
                  required
                  rows={4}
                  value={editJustificativa}
                  onChange={(e) => setEditJustificativa(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-905 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-150 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditBonusModalOpen(false);
                    setEditBonusError(null);
                  }}
                  className="rounded-lg border border-gray-300 hover:bg-gray-50 px-4.5 py-2 text-xs font-semibold text-gray-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateBonusMutation.isPending}
                  className="rounded-lg bg-indigo-650 hover:bg-indigo-750 px-4.5 py-2 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  style={{ backgroundColor: '#091151' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#000530'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#091151'}
                >
                  {updateBonusMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
