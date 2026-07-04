import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Perfil } from '../../types';
import { Check, X, ShieldAlert, Loader2 } from 'lucide-react';

export const AprovacaoCadastros: React.FC = () => {
  const [solicitacoes, setSolicitacoes] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending profiles
  const fetchPendentes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let columns = 'id, nome, email, cpf, crm_coren, role, municipio, instituicao, telefone, status_cadastro, created_at';
      let result = await supabase
        .from('perfis')
        .select(columns)
        .eq('status_cadastro', 'pendente')
        .order('created_at', { ascending: true });

      if (result.error) {
        console.warn('Erro ao buscar cadastros completos, tentando fallback:', result.error.message);
        
        if (result.error.message.includes('instituicao')) {
          columns = columns.replace('instituicao, ', '');
        }
        
        if (result.error.message.includes('status_cadastro')) {
          // If status_cadastro is missing, they might not have registration status checking yet
          columns = columns.replace('status_cadastro, ', '');
        }

        if (result.error.message.includes('crm_coren')) {
          columns = columns.replace('crm_coren, ', '');
        }

        result = await supabase
          .from('perfis')
          .select(columns)
          .order('created_at', { ascending: true }); // select all since we can't filter by missing status_cadastro
      }

      if (result.error) throw result.error;

      const mappedList = (result.data || []).map((item: any) => ({
        ...item,
        status_cadastro: item.status_cadastro || item.status || 'pendente',
        instituicao: item.instituicao || 'Não especificado'
      }));

      // Filter locally if status_cadastro check was skipped in query
      const finalPending = mappedList.filter((item: any) => item.status_cadastro === 'pendente') as Perfil[];
      setSolicitacoes(finalPending);
    } catch (err: any) {
      console.error('Erro ao buscar cadastros pendentes:', err.message || err);
      setError('Não foi possível carregar a lista de solicitações pendentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendentes();
  }, []);

  const handleDecisao = async (profileId: string, novoStatus: 'aprovado' | 'rejeitado') => {
    setActioningId(profileId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('perfis')
        .update({ status_cadastro: novoStatus })
        .eq('id', profileId);

      if (updateError) throw updateError;

      // Update state locally (remove from list)
      setSolicitacoes(prev => prev.filter(item => item.id !== profileId));
    } catch (err: any) {
      console.error(`Erro ao mudar status para ${novoStatus}:`, err.message || err);
      setError(`Falha ao processar a solicitação: ${err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Aprovação de Profissionais</h3>
          <p className="text-xs text-gray-500">Valide e aprove novos médicos especialistas ou solicitantes cadastrados</p>
        </div>
        <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
          Pendentes: {solicitacoes.length}
        </span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center bg-white rounded-xl border border-gray-150">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : solicitacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-150 text-center">
          <ShieldAlert className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-sm font-semibold text-gray-900">Nenhum cadastro aguardando aprovação</p>
          <p className="text-xs text-gray-500 mt-1">Todos os profissionais cadastrados já foram avaliados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Profissional</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Registro / Doc</th>
                  <th className="px-6 py-4">Instituição</th>
                  <th className="px-6 py-4">Papel</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 bg-white">
                {solicitacoes.map((item) => {
                  const isActioning = actioningId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{item.nome}</div>
                        <div className="text-xs text-gray-400">CPF: {item.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700">{item.email}</div>
                        {item.telefone && <div className="text-xs text-gray-400">{item.telefone}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-800 bg-gray-100 rounded px-1.5 py-0.5 text-xs">
                          {item.crm_coren || 'Não informado'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700">{item.instituicao}</div>
                        <div className="text-xs text-gray-400">{item.municipio}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${
                          item.role === 'especialista' 
                            ? 'bg-purple-50 border-purple-200 text-purple-700' 
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                          {item.role === 'especialista' ? 'Especialista' : 'Solicitante'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDecisao(item.id, 'aprovado')}
                            disabled={isActioning}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-550 hover:bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                            title="Aprovar Profissional"
                          >
                            {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleDecisao(item.id, 'rejeitado')}
                            disabled={isActioning}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                            title="Rejeitar Profissional"
                          >
                            {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                            Rejeitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
