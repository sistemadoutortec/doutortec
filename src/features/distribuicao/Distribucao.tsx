import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { CasoClinico, CasoPrioridade } from '../../types';
import {
  Shuffle,
  User,
  MapPin,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Stethoscope,
  Star,
  AlertTriangle,
  FileText,
  RefreshCw,
  X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface EspecialidadeMap {
  [id: string]: string;
}

interface SolicitanteInfo {
  id: string;
  nome: string;
  municipio: string;
  instituicao: string;
}

interface CasoNaFila extends CasoClinico {
  especialidadeNome?: string;
  solicitanteInfo?: SolicitanteInfo;
  slaStatus: 'ok' | 'warning' | 'overdue';
  slaLabel: string;
}

interface Especialista {
  id: string;
  nome: string;
  email: string;
  crm_coren: string | null;
  municipio: string;
  instituicao: string;
  activeCaseCount: number; // current load
  match: 'recommended' | 'available' | 'none'; // computed per selected case
  matchFluxoNome?: string; // name of matching flow, if any
}

// ─────────────────────────────────────────────────────────
// SLA helpers
// ─────────────────────────────────────────────────────────
const computeSla = (slaLimite: string): CasoNaFila['slaStatus'] => {
  const remainingMs = new Date(slaLimite).getTime() - Date.now();
  if (remainingMs <= 0) return 'overdue';
  if (remainingMs < 4 * 60 * 60 * 1000) return 'warning';
  return 'ok';
};

const formatSlaLabel = (slaLimite: string, status: CasoNaFila['slaStatus']): string => {
  if (status === 'overdue') return 'SLA Vencido';
  const remainingMs = new Date(slaLimite).getTime() - Date.now();
  const h = Math.floor(remainingMs / (1000 * 60 * 60));
  const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${m}m restantes`;
};

const slaClasses: Record<CasoNaFila['slaStatus'], string> = {
  ok: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-red-50 text-red-700 border-red-200 animate-pulse',
};

const priorityClasses: Record<CasoPrioridade, string> = {
  alta: 'bg-red-50 text-red-700 border-red-200',
  media: 'bg-amber-50 text-amber-700 border-amber-200',
  baixa: 'bg-blue-50 text-blue-700 border-blue-200',
};

// Patient initials (privacy-safe display)
const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter((_, i, a) => i === 0 || i === a.length - 1)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('.');

// ─────────────────────────────────────────────────────────
// Skeleton components
// ─────────────────────────────────────────────────────────
const QueueSkeleton: React.FC = () => (
  <div className="space-y-2 p-3 animate-pulse">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-2">
        <div className="h-3 w-24 rounded bg-gray-100" />
        <div className="h-4 w-36 rounded bg-gray-200" />
        <div className="h-3 w-28 rounded bg-gray-100" />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────
export const Distribucao: React.FC = () => {
  const { user } = useAuth();

  // ── Queue state ──────────────────────────────────────────
  const [queue, setQueue] = useState<CasoNaFila[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Reference maps ───────────────────────────────────────
  const [specialtiesMap, setSpecialtiesMap] = useState<EspecialidadeMap>({});
  // municipio (text) → array of fluxo_especialidade IDs that cover it
  const [municipioFluxoMap, setMunicipioFluxoMap] = useState<Record<string, string[]>>({});
  // fluxo_id → especialista_id + nome_fluxo
  const [fluxoEspMap, setFluxoEspMap] = useState<Record<string, { especialistaId: string; nomeFluxo: string }>>({});

  // ── Selected case state ──────────────────────────────────
  const [selectedCaso, setSelectedCaso] = useState<CasoNaFila | null>(null);

  // ── Specialists panel ────────────────────────────────────
  const [specialists, setSpecialists] = useState<Especialista[]>([]);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [selectedEspId, setSelectedEspId] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [distributing, setDistributing] = useState(false);
  const [distError, setDistError] = useState<string | null>(null);
  const [distSuccess, setDistSuccess] = useState<string | null>(null);

  // Search inside queue
  const [queueSearch, setQueueSearch] = useState('');
  const queueSearchRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────
  // 1. Load reference data (specialties, fluxos, municipios)
  // ─────────────────────────────────────────────────────────
  const fetchReferenceData = useCallback(async () => {
    try {
      const [espRes, fluxosRes, vinculosRes, munsRes] = await Promise.all([
        // All specialties for name mapping
        supabase.from('especialidades').select('id, nome'),
        // All active flows
        supabase
          .from('fluxos_especialidades')
          .select('id, especialista_id, nome_fluxo'),
        // All flow-municipality associations
        supabase
          .from('fluxos_especialidades_municipios')
          .select('fluxo_id, municipio_id'),
        // All network municipalities
        supabase.from('fluxos_municipios').select('id, municipio'),
      ]);

      // Build specialty map
      const spMap: EspecialidadeMap = {};
      (espRes.data || []).forEach((e) => { spMap[e.id as string] = e.nome as string; });
      setSpecialtiesMap(spMap);

      // Build fluxo → especialista map
      const feMap: Record<string, { especialistaId: string; nomeFluxo: string }> = {};
      (fluxosRes.data || []).forEach((f) => {
        feMap[f.id as string] = {
          especialistaId: f.especialista_id as string,
          nomeFluxo: f.nome_fluxo as string,
        };
      });
      setFluxoEspMap(feMap);

      // Build municipio-name → [fluxo_id] map (via municipio UUID → name)
      const munIdToName: Record<string, string> = {};
      (munsRes.data || []).forEach((m) => {
        munIdToName[m.id as string] = (m.municipio as string).toLowerCase().trim();
      });

      const mfMap: Record<string, string[]> = {};
      (vinculosRes.data || []).forEach((v) => {
        const munName = munIdToName[v.municipio_id as string];
        if (!munName) return;
        if (!mfMap[munName]) mfMap[munName] = [];
        mfMap[munName].push(v.fluxo_id as string);
      });
      setMunicipioFluxoMap(mfMap);
    } catch (err: unknown) {
      console.error('Erro ao carregar dados de referência:', err);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // 2. Load queue (cases with status 'novo' and no specialist)
  // ─────────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    setQueueError(null);

    try {
      // Fetch unassigned new cases
      // Buscamos apenas os campos estruturais obrigatórios para garantir compatibilidade
      const { data: casosData, error: casosError } = await supabase
        .from('casos')
        .select(
          'id, paciente_nome, especialidade_id, prioridade, historico_clinico, conduta_atual, duvida_clinica, solicitante_id, especialista_id, status, created_at'
        )
        .eq('status', 'novo')
        .is('especialista_id', null)
        .order('created_at', { ascending: true }); // oldest first como fallback robusto

      if (casosError) throw casosError;

      if (!casosData || casosData.length === 0) {
        setQueue([]);
        return;
      }

      // Fetch solicitante profiles for municipality info
      const solIds = Array.from(new Set(casosData.map((c) => c.solicitante_id as string)));
      const { data: perfisData } = await supabase
        .from('perfis')
        .select('id, nome, municipio, instituicao')
        .in('id', solIds);

      const solMap: Record<string, SolicitanteInfo> = {};
      (perfisData || []).forEach((p) => {
        solMap[p.id as string] = {
          id: p.id as string,
          nome: p.nome as string,
          municipio: p.municipio as string,
          instituicao: p.instituicao as string,
        };
      });

      const enriched: CasoNaFila[] = (casosData as any[]).map((c) => {
        // Fallback seguro caso o banco de dados não possua a coluna sla_limite
        const limite = c.sla_limite || new Date(new Date(c.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString();
        const slaStatus = computeSla(limite);
        return {
          ...c,
          especialidadeNome: specialtiesMap[c.especialidade_id] ?? '—',
          solicitanteInfo: solMap[c.solicitante_id],
          slaStatus,
          slaLabel: formatSlaLabel(limite, slaStatus),
          sla_horas: c.sla_horas ?? 24,
          sla_limite: limite,
        };
      });

      setQueue(enriched);
    } catch (err: any) {
      const errMsg = err?.message || err?.details || 'Erro de rede ou permissão.';
      console.error('Erro ao carregar fila de distribuição:', err);
      setQueueError(
        `Não foi possível carregar a fila. Detalhe técnico: ${errMsg}`
      );
    } finally {
      setQueueLoading(false);
      setRefreshing(false);
    }
  }, [specialtiesMap]);

  // ─────────────────────────────────────────────────────────
  // 3. Load specialists + compute match when a case is selected
  // ─────────────────────────────────────────────────────────
  const loadSpecialists = useCallback(
    async (caso: CasoNaFila) => {
      setSpecsLoading(true);
      setSelectedEspId('');
      setDistError(null);
      setDistSuccess(null);
      setJustificativa('');

      try {
        const [specsRes, activeCountsRes] = await Promise.all([
          // Approved specialists and teleconsultors
          supabase
            .from('perfis')
            .select('id, nome, email, crm_coren, municipio, instituicao')
            .eq('status_cadastro', 'aprovado')
            .in('role', ['especialista', 'teleconsultor'])
            .order('nome', { ascending: true }),
          // Count active cases per specialist
          supabase
            .from('casos')
            .select('especialista_id')
            .in('status', ['novo', 'em_progresso']),
        ]);

        // Build active case count per specialist
        const caseCountMap: Record<string, number> = {};
        (activeCountsRes.data || []).forEach((c) => {
          const espId = c.especialista_id as string | null;
          if (!espId) return;
          caseCountMap[espId] = (caseCountMap[espId] ?? 0) + 1;
        });

        // Determine patient municipality from the solicitante's profile
        const patientMun = (caso.solicitanteInfo?.municipio ?? '').toLowerCase().trim();

        // Fluxo IDs that cover the patient's municipality
        const coveringFluxoIds = municipioFluxoMap[patientMun] ?? [];

        // For each specialist, compute match level
        const enriched: Especialista[] = (specsRes.data || []).map((p) => {
          const espId = p.id as string;

          // Find any fluxo that covers the patient's municipality AND belongs to this specialist
          const matchingFluxoId = coveringFluxoIds.find(
            (fId) => fluxoEspMap[fId]?.especialistaId === espId,
          );

          let match: Especialista['match'] = 'available';
          let matchFluxoNome: string | undefined;

          if (matchingFluxoId) {
            match = 'recommended';
            matchFluxoNome = fluxoEspMap[matchingFluxoId]?.nomeFluxo;
          }

          return {
            id: espId,
            nome: p.nome as string,
            email: p.email as string,
            crm_coren: p.crm_coren as string | null,
            municipio: p.municipio as string,
            instituicao: p.instituicao as string,
            activeCaseCount: caseCountMap[espId] ?? 0,
            match,
            matchFluxoNome,
          };
        });

        // Sort: recommended first, then by active case count ascending
        enriched.sort((a, b) => {
          if (a.match === 'recommended' && b.match !== 'recommended') return -1;
          if (b.match === 'recommended' && a.match !== 'recommended') return 1;
          return a.activeCaseCount - b.activeCaseCount;
        });

        setSpecialists(enriched);
        if (enriched.length > 0) setSelectedEspId(enriched[0].id);
      } catch (err: unknown) {
        console.error('Erro ao carregar especialistas:', err);
      } finally {
        setSpecsLoading(false);
      }
    },
    [municipioFluxoMap, fluxoEspMap],
  );

  // ─────────────────────────────────────────────────────────
  // 4. Confirm distribution
  // ─────────────────────────────────────────────────────────
  const handleDistribute = async () => {
    if (!selectedCaso || !selectedEspId || !user) return;

    setDistributing(true);
    setDistError(null);
    setDistSuccess(null);

    try {
      // Step 1: Update the case
      const { error: updateError } = await supabase
        .from('casos')
        .update({
          especialista_id: selectedEspId,
          status: 'em_progresso',
        })
        .eq('id', selectedCaso.id);

      if (updateError) throw updateError;

      // Step 2: Log in historico_reatribuicao
      await supabase.from('historico_reatribuicao').insert([
        {
          caso_id: selectedCaso.id,
          especialista_anterior_id: selectedCaso.especialista_id ?? null,
          novo_especialista_id: selectedEspId,
          reatribuido_por_id: user.id,
          justificativa: justificativa.trim() || null,
        },
      ]);
      // Note: historico insert failure is non-fatal — we log but continue

      // Step 3: Optimistic update — remove from queue
      setQueue((prev) => prev.filter((c) => c.id !== selectedCaso.id));

      const espNome =
        specialists.find((e) => e.id === selectedEspId)?.nome ?? 'especialista';
      setDistSuccess(`Caso distribuído com sucesso para ${espNome}!`);

      // Deselect after a brief success flash
      setTimeout(() => {
        setSelectedCaso(null);
        setDistSuccess(null);
      }, 2200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      console.error('Erro ao distribuir caso:', msg);
      setDistError(
        'Não foi possível distribuir o caso. Verifique a conexão e tente novamente.',
      );
    } finally {
      setDistributing(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  // Wait until specialties are loaded before fetching queue
  useEffect(() => {
    if (Object.keys(specialtiesMap).length > 0) {
      fetchQueue();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialtiesMap]);

  // Load specialists when a case is selected
  useEffect(() => {
    if (selectedCaso) {
      loadSpecialists(selectedCaso);
    }
  }, [selectedCaso, loadSpecialists]);

  // Realtime subscription — remove distributed cases from the queue
  useEffect(() => {
    const channel = supabase
      .channel('telerregulacao_queue')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'casos',
          filter: "status=neq.novo",
        },
        (payload) => {
          const updated = payload.new as { id: string; status: string };
          if (updated.status !== 'novo') {
            setQueue((prev) => prev.filter((c) => c.id !== updated.id));
            if (selectedCaso?.id === updated.id) setSelectedCaso(null);
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedCaso]);

  // Manual refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchQueue();
  };

  // ─────────────────────────────────────────────────────────
  // Derived: filtered queue
  // ─────────────────────────────────────────────────────────
  const filteredQueue = queue.filter((c) => {
    if (!queueSearch.trim()) return true;
    const term = queueSearch.toLowerCase();
    return (
      c.paciente_nome.toLowerCase().includes(term) ||
      (c.especialidadeNome ?? '').toLowerCase().includes(term) ||
      (c.solicitanteInfo?.municipio ?? '').toLowerCase().includes(term)
    );
  });

  // Selected specialist object
  const selectedEsp = specialists.find((e) => e.id === selectedEspId);

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full space-y-4">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-indigo-600" />
            Telerregulação de Casos Clínicos
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Selecione um caso na fila e vincule ao especialista mais adequado
            para iniciar o atendimento.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-amber-700">
              {queue.length} na fila
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || queueLoading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Split Layout ─────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* ════════════════════════════════════════════════════
            LEFT PANEL — Queue
        ════════════════════════════════════════════════════ */}
        <div className="flex flex-col w-full md:w-80 lg:w-96 shrink-0 bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Activity className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                ref={queueSearchRef}
                type="text"
                placeholder="Filtrar por paciente, especialidade..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="pl-9 pr-9 block w-full rounded-lg border border-gray-200 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition"
              />
              {queueSearch && (
                <button
                  onClick={() => setQueueSearch('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Queue list */}
          <div className="flex-1 overflow-y-auto">
            {queueLoading ? (
              <QueueSkeleton />
            ) : queueError ? (
              <div className="flex flex-col h-full items-center justify-center gap-3 p-6 text-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p className="text-xs text-red-600">{queueError}</p>
                <button
                  onClick={handleRefresh}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center gap-2 p-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-300" />
                <p className="text-sm font-semibold text-gray-800">
                  {queueSearch ? 'Nenhum caso encontrado.' : 'Fila vazia!'}
                </p>
                <p className="text-xs text-gray-400">
                  {!queueSearch &&
                    'Todos os casos foram distribuídos ou não há novos casos aguardando.'}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {filteredQueue.map((caso) => {
                  const isSelected = selectedCaso?.id === caso.id;
                  return (
                    <button
                      key={caso.id}
                      onClick={() => setSelectedCaso(caso)}
                      className={`w-full text-left rounded-xl border p-3.5 transition-all duration-150 ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-300'
                          : 'border-gray-150 bg-white hover:border-indigo-200 hover:bg-indigo-50/20'
                      }`}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-gray-400">
                            #{caso.id.substring(0, 8)}
                          </span>
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold border ${priorityClasses[caso.prioridade]}`}
                          >
                            {caso.prioridade.toUpperCase()}
                          </span>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 mt-0.5 transition-transform ${isSelected ? 'text-indigo-500 translate-x-0.5' : 'text-gray-300'}`}
                        />
                      </div>

                      {/* Patient */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 shrink-0">
                          {initials(caso.paciente_nome)}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {caso.paciente_nome}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                          <Activity className="h-3 w-3 text-indigo-400 shrink-0" />
                          <span className="truncate">
                            {caso.especialidadeNome ?? '—'}
                          </span>
                        </div>
                        {caso.solicitanteInfo?.municipio && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="truncate">
                              {caso.solicitanteInfo.municipio}
                            </span>
                          </div>
                        )}
                        <div
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold border ${slaClasses[caso.slaStatus]}`}
                        >
                          <Clock className="h-2.5 w-2.5" />
                          {caso.slaLabel}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            RIGHT PANEL — Case Detail + Action
        ════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto">
          {!selectedCaso ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
                <Shuffle className="h-8 w-8 text-indigo-400" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-800">
                  Selecione um caso na fila
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Clique em qualquer caso à esquerda para ver o resumo clínico e
                  vincular um especialista.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Case Summary Card ─────────────────────── */}
              <div className="bg-white rounded-xl border border-gray-150 shadow-xs p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-400">
                        Caso #{selectedCaso.id.substring(0, 8)}
                      </span>
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold border ${priorityClasses[selectedCaso.prioridade]}`}
                      >
                        Prioridade {selectedCaso.prioridade.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">
                      {selectedCaso.paciente_nome}
                    </h4>
                  </div>
                  <button
                    onClick={() => setSelectedCaso(null)}
                    className="text-gray-400 hover:text-gray-600 transition shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    <Activity className="h-3.5 w-3.5" />
                    {selectedCaso.especialidadeNome ?? '—'}
                  </span>
                  {selectedCaso.solicitanteInfo?.municipio && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      <MapPin className="h-3.5 w-3.5" />
                      {selectedCaso.solicitanteInfo.municipio}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold border ${slaClasses[selectedCaso.slaStatus]}`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {selectedCaso.slaLabel}
                  </span>
                </div>

                {/* Clinical details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                        Dúvida Clínica
                      </p>
                      <p className="text-sm text-gray-800 bg-indigo-50/50 border border-indigo-100/50 rounded-lg p-3 leading-relaxed font-medium line-clamp-4">
                        {selectedCaso.duvida_clinica}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                        Unidade Solicitante
                      </p>
                      <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5 text-xs text-gray-700 space-y-0.5">
                        <div className="font-semibold">
                          {selectedCaso.solicitanteInfo?.nome ?? '—'}
                        </div>
                        <div className="text-gray-500">
                          {selectedCaso.solicitanteInfo?.instituicao ?? '—'}
                        </div>
                        <div className="text-gray-400">
                          Aberto em{' '}
                          {new Date(selectedCaso.created_at).toLocaleDateString(
                            'pt-BR',
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Specialist Assignment Panel ────────────── */}
              <div className="bg-white rounded-xl border border-gray-150 shadow-xs p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-indigo-600" />
                  <h5 className="text-sm font-bold text-gray-900">
                    Vincular Especialista
                  </h5>
                  {selectedEsp?.match === 'recommended' && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-bold text-green-700">
                      <Star className="h-3 w-3" />
                      Selecionado: Recomendado para este caso
                    </span>
                  )}
                </div>

                {specsLoading ? (
                  <div className="flex h-24 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  </div>
                ) : specialists.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-4 text-xs text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Nenhum especialista aprovado disponível no sistema.
                  </div>
                ) : (
                  <>
                    {/* Specialist selector */}
                    <div>
                      <label
                        htmlFor="esp-select"
                        className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2"
                      >
                        Selecionar Especialista
                      </label>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {specialists.map((esp) => {
                          const isSelected = selectedEspId === esp.id;
                          return (
                            <label
                              key={esp.id}
                              className={`flex items-start gap-3 rounded-xl border-2 p-3.5 cursor-pointer transition-all ${
                                isSelected
                                  ? esp.match === 'recommended'
                                    ? 'border-green-500 bg-green-50/60'
                                    : 'border-indigo-500 bg-indigo-50/60'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="especialista"
                                value={esp.id}
                                checked={isSelected}
                                onChange={() => setSelectedEspId(esp.id)}
                                className="mt-0.5 accent-indigo-600 shrink-0"
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-gray-900">
                                    {esp.nome}
                                  </span>

                                  {/* Match badges */}
                                  {esp.match === 'recommended' && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-300 px-2 py-0.5 text-[9px] font-bold text-green-700">
                                      <Star className="h-2.5 w-2.5" />
                                      RECOMENDADO
                                    </span>
                                  )}
                                  {esp.match === 'available' && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[9px] font-bold text-blue-600">
                                      Disponível na Rede
                                    </span>
                                  )}

                                  {/* Active case load */}
                                  <span
                                    className={`ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                      esp.activeCaseCount === 0
                                        ? 'bg-green-50 text-green-700'
                                        : esp.activeCaseCount < 5
                                          ? 'bg-amber-50 text-amber-700'
                                          : 'bg-red-50 text-red-700'
                                    }`}
                                  >
                                    <FileText className="h-2.5 w-2.5" />
                                    {esp.activeCaseCount} ativo
                                    {esp.activeCaseCount !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                <div className="mt-0.5 text-[10px] text-gray-500 flex flex-wrap gap-x-3">
                                  {esp.crm_coren && (
                                    <span className="font-mono">{esp.crm_coren}</span>
                                  )}
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="h-2.5 w-2.5" />
                                    {esp.municipio}
                                  </span>
                                  <span className="text-gray-400">{esp.instituicao}</span>
                                </div>

                                {esp.match === 'recommended' && esp.matchFluxoNome && (
                                  <div className="mt-1 text-[10px] text-green-700 bg-green-50 rounded px-2 py-0.5 inline-flex items-center gap-1">
                                    <Activity className="h-2.5 w-2.5" />
                                    Fluxo ativo: {esp.matchFluxoNome}
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Justification (optional) */}
                    <div>
                      <label
                        htmlFor="justif"
                        className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5"
                      >
                        Justificativa da Distribuição{' '}
                        <span className="normal-case font-normal text-gray-400">
                          (opcional)
                        </span>
                      </label>
                      <textarea
                        id="justif"
                        rows={2}
                        placeholder="Registre a razão da escolha deste especialista para o histórico de reatribuição..."
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                        disabled={distributing}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none disabled:bg-gray-50 transition"
                      />
                    </div>

                    {/* Feedback */}
                    {distError && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {distError}
                      </div>
                    )}
                    {distSuccess && (
                      <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-xs text-green-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {distSuccess}
                      </div>
                    )}

                    {/* Confirm button */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleDistribute}
                        disabled={
                          !selectedEspId ||
                          distributing ||
                          distSuccess !== null
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition disabled:bg-indigo-300 disabled:cursor-not-allowed"
                      >
                        {distributing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Distribuindo...
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4" />
                            Confirmar Distribuição
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
