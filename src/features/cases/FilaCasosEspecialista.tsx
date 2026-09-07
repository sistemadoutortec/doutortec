import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { CasoClinico, CasoPrioridade } from '../../types';
import {
  Inbox,
  Clock,
  Activity,
  MapPin,
  User,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';

interface FilaCasosEspecialistaProps {
  onSelectCaso?: (caso: CasoClinico) => void;
  onCasoPuxado?: (caso: CasoClinico) => void;
}

interface CasoPool extends CasoClinico {
  especialidadeNome?: string;
  solicitanteMunicipio?: string;
  solicitanteNome?: string;
  slaStatus: 'ok' | 'warning' | 'overdue';
  slaLabel: string;
}

export const FilaCasosEspecialista: React.FC<FilaCasosEspecialistaProps> = ({
  onSelectCaso,
  onCasoPuxado,
}) => {
  const { user, perfil } = useAuth();
  const [casosPool, setCasosPool] = useState<CasoPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [puxandoId, setPuxandoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Mapas de autorização do especialista
  const [allowedSpecialties, setAllowedSpecialties] = useState<string[]>([]);
  const [allowedMunicipios, setAllowedMunicipios] = useState<string[]>([]);
  const [specialtiesMap, setSpecialtiesMap] = useState<Record<string, string>>({});

  // 1. Carregar especialidades e municípios vinculados ao especialista
  const loadSpecialistCoverage = useCallback(async () => {
    if (!user || perfil?.role !== 'especialista') return;

    try {
      // Buscar todos os nomes de especialidades para resolução de texto
      const { data: espAll } = await supabase.from('especialidades').select('id, nome');
      const spMap: Record<string, string> = {};
      (espAll || []).forEach((e) => {
        spMap[e.id] = e.nome;
      });
      setSpecialtiesMap(spMap);

      // Buscar fluxos atribuídos ao médico
      const { data: flows, error: flowsErr } = await supabase
        .from('fluxos_especialidades')
        .select('id, nome_fluxo')
        .eq('especialista_id', user.id);

      if (flowsErr) throw flowsErr;

      if (!flows || flows.length === 0) {
        setAllowedSpecialties([]);
        setAllowedMunicipios([]);
        return;
      }

      // Mapear especialidades a partir dos fluxos (por nome do fluxo ou especialidades associadas)
      const matchedSpecIds = (espAll || [])
        .filter((esp) =>
          flows.some((f) =>
            f.nome_fluxo?.toLowerCase().includes(esp.nome.toLowerCase())
          )
        )
        .map((e) => e.id);

      // Se nenhum nome deu match direto por string, permite as especialidades gerais
      setAllowedSpecialties(matchedSpecIds.length > 0 ? matchedSpecIds : (espAll || []).map(e => e.id));

      const flowIds = flows.map((f) => f.id);

      // Buscar municípios vinculados aos fluxos
      const { data: links } = await supabase
        .from('fluxos_especialidades_municipios')
        .select('municipio_id')
        .in('fluxo_id', flowIds);

      if (links && links.length > 0) {
        const munIds = links.map((l) => l.municipio_id);
        const { data: muns } = await supabase
          .from('fluxos_municipios')
          .select('municipio')
          .in('id', munIds);

        if (muns) {
          setAllowedMunicipios(muns.map((m) => m.municipio.toLowerCase().trim()));
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar credenciamento do especialista:', err);
    }
  }, [user, perfil]);

  // 2. Buscar casos novos na fila
  const fetchPoolCasos = useCallback(async () => {
    if (!user) return;
    setError(null);

    try {
      const { data: casosData, error: casosErr } = await supabase
        .from('casos')
        .select(`
          id, paciente_nome, especialidade_id, prioridade, historico_clinico, conduta_atual, duvida_clinica, solicitante_id, especialista_id, status, created_at,
          solicitante:perfis!solicitante_id(id, nome, municipio)
        `)
        .eq('status', 'novo')
        .is('especialista_id', null)
        .order('created_at', { ascending: true });

      if (casosErr) throw casosErr;

      let list = (casosData as any[]) || [];

      // Filtrar estritamente pelos municípios do especialista (se houver restrição configurada)
      if (allowedMunicipios.length > 0) {
        list = list.filter((c) => {
          const munSolicitante = (c.solicitante?.municipio || '').toLowerCase().trim();
          return allowedMunicipios.includes(munSolicitante);
        });
      }

      // Filtrar por especialidade
      if (allowedSpecialties.length > 0) {
        list = list.filter((c) => allowedSpecialties.includes(c.especialidade_id));
      }

      const getSlaHours = (prio: string) => {
        if (prio === 'alta') return 12;
        if (prio === 'media') return 48;
        return 72;
      };

      const enriched: CasoPool[] = list.map((c) => {
        const hours = getSlaHours(c.prioridade);
        const limitTime = new Date(new Date(c.created_at).getTime() + hours * 60 * 60 * 1000);
        const remainingMs = limitTime.getTime() - Date.now();

        let slaStatus: CasoPool['slaStatus'] = 'ok';
        let slaLabel = '';

        if (remainingMs <= 0) {
          slaStatus = 'overdue';
          slaLabel = 'SLA Vencido';
        } else {
          if (remainingMs < 4 * 60 * 60 * 1000) slaStatus = 'warning';
          const h = Math.floor(remainingMs / (1000 * 60 * 60));
          const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          slaLabel = `${h}h ${m}m restantes`;
        }

        return {
          ...c,
          especialidadeNome: specialtiesMap[c.especialidade_id] || 'Especialidade',
          solicitanteMunicipio: c.solicitante?.municipio || 'Não informado',
          solicitanteNome: c.solicitante?.nome || 'Clínico Solicitante',
          slaStatus,
          slaLabel,
        };
      });

      setCasosPool(enriched);
    } catch (err: any) {
      console.error('Erro ao buscar pool de casos:', err);
      setError('Não foi possível carregar a fila de casos disponíveis.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, allowedMunicipios, allowedSpecialties, specialtiesMap]);

  useEffect(() => {
    loadSpecialistCoverage();
  }, [loadSpecialistCoverage]);

  useEffect(() => {
    fetchPoolCasos();
  }, [fetchPoolCasos]);

  // Supabase Realtime: se qualquer caso for assumido, remove da fila instantaneamente
  useEffect(() => {
    const channel = supabase
      .channel('especialista_pool_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'casos',
        },
        () => {
          fetchPoolCasos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPoolCasos]);

  // 3. Ação atômica de "Puxar Atendimento"
  const handlePuxarCaso = async (caso: CasoPool, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || puxandoId) return;

    setPuxandoId(caso.id);
    setError(null);
    setActionSuccess(null);

    try {
      // 1. Tenta via RPC com lock atômico
      const { data: rpcRes, error: rpcError } = await supabase.rpc('puxar_caso_atendimento', {
        p_caso_id: caso.id,
      });

      if (!rpcError && rpcRes) {
        if (rpcRes.success) {
          setActionSuccess(`Caso #${caso.id.substring(0, 8)} de ${caso.paciente_nome} assumido com sucesso!`);
          setCasosPool((prev) => prev.filter((c) => c.id !== caso.id));
          if (onCasoPuxado && rpcRes.caso) {
            onCasoPuxado(rpcRes.caso);
          }
          return;
        } else {
          // Outro médico pegou primeiro
          setError(rpcRes.error || 'Este caso acabou de ser assumido por outro especialista.');
          setCasosPool((prev) => prev.filter((c) => c.id !== caso.id));
          return;
        }
      }

      // 2. Fallback de update atômico direto com row-level check
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('casos')
        .update({
          especialista_id: user.id,
          status: 'em_progresso',
          aceito_em: new Date().toISOString(),
        })
        .eq('id', caso.id)
        .eq('status', 'novo')
        .is('especialista_id', null)
        .select()
        .maybeSingle();

      if (fallbackError) throw fallbackError;

      if (!fallbackData) {
        setError('Atenção: Este caso acabou de ser assumido por outro especialista online.');
        setCasosPool((prev) => prev.filter((c) => c.id !== caso.id));
      } else {
        setActionSuccess(`Caso de ${caso.paciente_nome} assumido com sucesso!`);
        setCasosPool((prev) => prev.filter((c) => c.id !== caso.id));
        if (onCasoPuxado) {
          onCasoPuxado(fallbackData as CasoClinico);
        }
      }
    } catch (err: any) {
      console.error('Erro ao puxar caso:', err);
      setError('Erro ao tentar assumir o atendimento. Tente novamente.');
    } finally {
      setPuxandoId(null);
    }
  };

  const filtered = casosPool.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.paciente_nome.toLowerCase().includes(term) ||
      (c.especialidadeNome || '').toLowerCase().includes(term) ||
      (c.solicitanteMunicipio || '').toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term)
    );
  });

  const getPriorityBadge = (prio: CasoPrioridade) => {
    switch (prio) {
      case 'alta':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
            ALTA
          </span>
        );
      case 'media':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
            MÉDIA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
            BAIXA
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#56657c]">
              Fila de Teleinterconsultas
            </p>
          </div>
          <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#002157' }}>
            <Inbox className="h-5 w-5 text-indigo-600" />
            Fila de Casos Disponíveis para Puxar
          </h3>
          <p className="text-xs text-[#56657c] mt-0.5">
            Casos novos aguardando teleconsultoria nos seus municípios de atuação e especialidades.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1.5">
            <span className="text-xs font-bold text-indigo-700">{filtered.length} disponíveis</span>
          </div>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchPoolCasos();
            }}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-700 flex items-center gap-2 shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-700 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Busca */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrar por paciente, especialidade, município ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Listagem */}
      {loading ? (
        <div className="flex h-40 items-center justify-center bg-white rounded-xl border border-gray-200">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-3" />
          <h4 className="text-base font-bold text-gray-900">Fila em dia!</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-md">
            Não há nenhum caso clínico pendente aguardando atendimento nos seus municípios de cobertura neste momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((caso) => (
            <div
              key={caso.id}
              onClick={() => onSelectCaso?.(caso)}
              className="bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition duration-150 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-gray-400">#{caso.id.substring(0, 8)}</span>
                  {getPriorityBadge(caso.prioridade)}
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Activity className="h-3 w-3" />
                    {caso.especialidadeNome}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
                    <MapPin className="h-3 w-3" />
                    {caso.solicitanteMunicipio}
                  </span>
                </div>

                <h4 className="text-base font-bold text-gray-900 truncate">{caso.paciente_nome}</h4>

                <p className="text-xs text-gray-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                  {caso.duvida_clinica}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Solicitante: {caso.solicitanteNome}
                  </span>
                  <span>Aberto em {new Date(caso.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {/* Lado Direito: SLA e Botão de Puxar */}
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border font-medium ${
                    caso.slaStatus === 'overdue'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : caso.slaStatus === 'warning'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>{caso.slaLabel}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => handlePuxarCaso(caso, e)}
                  disabled={puxandoId === caso.id}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {puxandoId === caso.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Assumindo...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                      <span>Puxar Atendimento</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
