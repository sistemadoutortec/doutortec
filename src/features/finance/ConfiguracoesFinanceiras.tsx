import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Sliders, Save, Plus, Trash2, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ConfiguracoesFinanceirasProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface Rule {
  id: string;
  tipo: 'global' | 'especialidade' | 'municipio';
  especialidade_id: string | null;
  municipio_id: string | null;
  valor_total_caso: number;
  valor_repasse_especialista: number;
  valor_repasse_clinico: number;
}

export const ConfiguracoesFinanceiras: React.FC<ConfiguracoesFinanceirasProps> = ({ isOpen, onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reference data
  const [especialidades, setEspecialidades] = useState<{ id: string; nome: string }[]>([]);
  const [municipios, setMunicipios] = useState<{ id: string; municipio: string; uf: string }[]>([]);

  // Rules list
  const [rules, setRules] = useState<Rule[]>([]);

  // Form states
  const [globalTotal, setGlobalTotal] = useState('225.00');
  const [globalEspecialista, setGlobalEspecialista] = useState('150.00');
  const [globalClinico, setGlobalClinico] = useState('0.00');

  const [newTipo, setNewTipo] = useState<'especialidade' | 'municipio'>('especialidade');
  const [newEspecialidadeId, setNewEspecialidadeId] = useState('');
  const [newMunicipioId, setNewMunicipioId] = useState('');
  const [newTotal, setNewTotal] = useState('');
  const [newEspecialista, setNewEspecialista] = useState('');
  const [newClinico, setNewClinico] = useState('0.00');

  // Load rules and reference data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch references
      const [espRes, munRes, rulesRes] = await Promise.all([
        supabase.from('especialidades').select('id, nome').order('nome'),
        supabase.from('fluxos_municipios').select('id, municipio, uf').order('uf').order('municipio'),
        supabase.from('configuracoes_financeiras').select('*')
      ]);

      if (espRes.error) throw espRes.error;
      if (munRes.error) throw munRes.error;
      if (rulesRes.error) throw rulesRes.error;

      setEspecialidades(espRes.data || []);
      setMunicipios(munRes.data || []);

      const loadedRules = (rulesRes.data || []) as Rule[];
      setRules(loadedRules);

      // Set global form values
      const globalRule = loadedRules.find(r => r.tipo === 'global');
      if (globalRule) {
        setGlobalTotal(globalRule.valor_total_caso.toString());
        setGlobalEspecialista(globalRule.valor_repasse_especialista.toString());
        setGlobalClinico(globalRule.valor_repasse_clinico.toString());
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar configurações financeiras.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const valorTotal = parseFloat(globalTotal);
      const valorEspecialista = parseFloat(globalEspecialista);
      const valorClinico = parseFloat(globalClinico);

      if (isNaN(valorTotal) || isNaN(valorEspecialista) || isNaN(valorClinico)) {
        throw new Error('Por favor, informe valores numéricos válidos.');
      }

      // Check if global rule exists
      const globalRule = rules.find(r => r.tipo === 'global');

      if (globalRule) {
        // Update
        const { error: updateError } = await supabase
          .from('configuracoes_financeiras')
          .update({
            valor_total_caso: valorTotal,
            valor_repasse_especialista: valorEspecialista,
            valor_repasse_clinico: valorClinico,
            updated_at: new Date().toISOString()
          })
          .eq('id', globalRule.id);

        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('configuracoes_financeiras')
          .insert([{
            tipo: 'global',
            valor_total_caso: valorTotal,
            valor_repasse_especialista: valorEspecialista,
            valor_repasse_clinico: valorClinico
          }]);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      await loadData();
      if (onSaved) onSaved();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao salvar configuração global.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const valorTotal = parseFloat(newTotal);
      const valorEspecialista = parseFloat(newEspecialista);
      const valorClinico = parseFloat(newClinico);

      if (isNaN(valorTotal) || isNaN(valorEspecialista) || isNaN(valorClinico)) {
        throw new Error('Por favor, informe valores válidos para o caso e os repasses.');
      }

      const payload: Partial<Rule> = {
        tipo: newTipo,
        valor_total_caso: valorTotal,
        valor_repasse_especialista: valorEspecialista,
        valor_repasse_clinico: valorClinico,
      };

      if (newTipo === 'especialidade') {
        if (!newEspecialidadeId) {
          throw new Error('Selecione a especialidade alvo.');
        }
        // Check for duplicates
        const exists = rules.some(r => r.tipo === 'especialidade' && r.especialidade_id === newEspecialidadeId);
        if (exists) {
          throw new Error('Já existe uma regra de exceção para esta especialidade.');
        }
        payload.especialidade_id = newEspecialidadeId;
      } else {
        if (!newMunicipioId) {
          throw new Error('Selecione o município alvo.');
        }
        // Check for duplicates
        const exists = rules.some(r => r.tipo === 'municipio' && r.municipio_id === newMunicipioId);
        if (exists) {
          throw new Error('Já existe uma regra de exceção para este município.');
        }
        payload.municipio_id = newMunicipioId;
      }

      const { error: insertError } = await supabase
        .from('configuracoes_financeiras')
        .insert([payload]);

      if (insertError) throw insertError;

      // Reset form
      setNewTotal('');
      setNewEspecialista('');
      setNewClinico('0.00');
      setNewEspecialidadeId('');
      setNewMunicipioId('');

      await loadData();
      if (onSaved) onSaved();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao adicionar exceção financeira.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra de precificação customizada?')) return;
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('configuracoes_financeiras')
        .delete()
        .eq('id', ruleId);

      if (deleteError) throw deleteError;

      await loadData();
      if (onSaved) onSaved();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao remover regra.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-250 shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150" style={{ backgroundColor: '#091151' }}>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-[#28ffb2]" />
            Configuração de Tarifas e Parametrização Financeira
          </h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 flex items-start gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-650 shrink-0" />
              <span>Configuração padrão salva com sucesso!</span>
            </div>
          )}

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 text-indigo-650 animate-spin" />
            </div>
          ) : (
            <>
              {/* Global Rule Section */}
              <form onSubmit={handleSaveGlobal} className="bg-slate-50 border border-gray-200 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Tarifa Padrão Global (Todos os Casos)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 whitespace-nowrap">
                      Valor Total do Caso (Faturamento) *
                    </label>
                    <div className="relative rounded-md shadow-xs">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        disabled={submitting}
                        value={globalTotal}
                        onChange={e => setGlobalTotal(e.target.value)}
                        className="block w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-550"
                        placeholder="225.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 whitespace-nowrap">
                      Repasse ao Especialista *
                    </label>
                    <div className="relative rounded-md shadow-xs">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        disabled={submitting}
                        value={globalEspecialista}
                        onChange={e => setGlobalEspecialista(e.target.value)}
                        className="block w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-550"
                        placeholder="150.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Repasse ao Clínico (Opcional)
                    </label>
                    <div className="relative rounded-md shadow-xs">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        disabled={submitting}
                        value={globalClinico}
                        onChange={e => setGlobalClinico(e.target.value)}
                        className="block w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-555"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Salvar Tarifa Padrão
                  </button>
                </div>
              </form>

              {/* Exception Rule Creation Form */}
              <form onSubmit={handleAddException} className="border border-gray-200 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Criar Exceção / Regra Customizada</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo de Filtro / Alvo</label>
                    <select
                      value={newTipo}
                      onChange={e => setNewTipo(e.target.value as 'especialidade' | 'municipio')}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 bg-white"
                    >
                      <option value="especialidade">Por Especialidade Médica</option>
                      <option value="municipio">Por Município de Origem</option>
                    </select>
                  </div>

                  <div>
                    {newTipo === 'especialidade' ? (
                      <>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Especialidade Alvo *</label>
                        <select
                          required
                          value={newEspecialidadeId}
                          onChange={e => setNewEspecialidadeId(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 bg-white"
                        >
                          <option value="">Selecione uma especialidade...</option>
                          {especialidades.map(esp => (
                            <option key={esp.id} value={esp.id}>{esp.nome}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Município Alvo *</label>
                        <select
                          required
                          value={newMunicipioId}
                          onChange={e => setNewMunicipioId(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 bg-white"
                        >
                          <option value="">Selecione um município...</option>
                          {municipios.map(m => (
                            <option key={m.id} value={m.id}>{m.municipio} - {m.uf}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 whitespace-nowrap">Valor do Caso (Faturamento)</label>
                    <div className="relative rounded-md shadow-xs">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newTotal}
                        onChange={e => setNewTotal(e.target.value)}
                        className="block w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-555"
                        placeholder="300.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 whitespace-nowrap">Repasse Especialista</label>
                      <div className="relative rounded-md shadow-xs">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-xs">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={newEspecialista}
                          onChange={e => setNewEspecialista(e.target.value)}
                          className="block w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-555"
                          placeholder="200.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 whitespace-nowrap">Repasse Clínico</label>
                      <div className="relative rounded-md shadow-xs">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-xs">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={newClinico}
                          onChange={e => setNewClinico(e.target.value)}
                          className="block w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-555"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Regra de Exceção
                  </button>
                </div>
              </form>

              {/* Rules List Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Regras de Exceção Ativas</h4>
                
                <div className="border border-gray-150 rounded-xl overflow-hidden shadow-xs">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-xs bg-white">
                    <thead className="bg-gray-50 font-bold text-gray-500 uppercase text-[10px]">
                      <tr>
                        <th className="px-5 py-3">Tipo</th>
                        <th className="px-5 py-3">Alvo</th>
                        <th className="px-5 py-3 text-right">Valor Caso</th>
                        <th className="px-5 py-3 text-right">Repasse Espec.</th>
                        <th className="px-5 py-3 text-right">Repasse Clín.</th>
                        <th className="px-5 py-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-gray-700">
                      {rules.filter(r => r.tipo !== 'global').length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-6 text-center text-gray-400 italic">
                            Nenhuma regra de exceção customizada ativa.
                          </td>
                        </tr>
                      ) : (
                        rules
                          .filter(r => r.tipo !== 'global')
                          .map(rule => {
                            let targetName = '—';
                            if (rule.tipo === 'especialidade') {
                              targetName = especialidades.find(e => e.id === rule.especialidade_id)?.nome || 'Especialidade excluída';
                            } else if (rule.tipo === 'municipio') {
                              const mun = municipios.find(m => m.id === rule.municipio_id);
                              targetName = mun ? `${mun.municipio} - ${mun.uf}` : 'Município excluído';
                            }

                            return (
                              <tr key={rule.id} className="hover:bg-slate-50/50 transition">
                                <td className="px-5 py-3 font-semibold capitalize">{rule.tipo === 'especialidade' ? 'Especialidade' : 'Município'}</td>
                                <td className="px-5 py-3 font-medium text-gray-900">{targetName}</td>
                                <td className="px-5 py-3 text-right font-mono font-bold">R$ {rule.valor_total_caso.toFixed(2)}</td>
                                <td className="px-5 py-3 text-right font-mono font-bold text-indigo-650">R$ {rule.valor_repasse_especialista.toFixed(2)}</td>
                                <td className="px-5 py-3 text-right font-mono text-gray-550">R$ {rule.valor_repasse_clinico.toFixed(2)}</td>
                                <td className="px-5 py-3 text-center">
                                  <button
                                    onClick={() => handleDeleteRule(rule.id)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="Remover Regra"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-150 bg-gray-50">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 hover:bg-gray-100 px-4.5 py-2 text-xs font-semibold text-gray-700 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
