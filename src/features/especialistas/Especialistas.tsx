import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  Stethoscope,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  MapPin,
  User,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
type TipoFluxo = 'Consultivo' | 'Compulsório';
type Sexo = 'M' | 'F' | '';

interface MedicoPerfil {
  id: string;
  nome: string;
  email: string;
  crm_coren: string | null;
}

interface FluxoMunicipio {
  id: string;
  municipio: string;
  uf: string;
}

interface FluxoEspecialidade {
  id: string;
  especialista_id: string;
  nome_fluxo: string;
  tipo_fluxo: TipoFluxo;
  idade_minima: number | null;
  idade_maxima: number | null;
  sexo: Sexo | null;
  created_at: string;
  // joined in-memory
  medicoNome?: string;
  medicoCrm?: string | null;
  municipios?: FluxoMunicipio[];
}

// ─────────────────────────────────────────────────────────
// Form default state
// ─────────────────────────────────────────────────────────
const FORM_EMPTY = {
  especialistaId: '',
  nomeFluxo: '',
  tipoFluxo: 'Consultivo' as TipoFluxo,
  idadeMinima: '',
  idadeMaxima: '',
  sexo: '' as Sexo,
  municipiosSelecionados: [] as string[],
};

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const tipoBadge = (tipo: TipoFluxo) =>
  tipo === 'Consultivo'
    ? 'bg-blue-50 border border-blue-200 text-blue-700'
    : 'bg-violet-50 border border-violet-200 text-violet-700';

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────
export const Especialistas: React.FC = () => {
  const { perfil } = useAuth();
  const isAdmin = perfil?.role === 'admin';

  // ── Reference data ──────────────────────────────────────
  const [medicos, setMedicos] = useState<MedicoPerfil[]>([]);
  const [municipiosRede, setMunicipiosRede] = useState<FluxoMunicipio[]>([]);
  const [refLoading, setRefLoading] = useState(true);

  // ── Fluxos list ─────────────────────────────────────────
  const [fluxos, setFluxos] = useState<FluxoEspecialidade[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Expanded rows (show municipalities inline) ───────────
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Modal state ─────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(FORM_EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // ── Delete state ─────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────
  // 1. Load reference data (médicos + municípios)
  // ─────────────────────────────────────────────────────────
  const fetchReferenceData = useCallback(async () => {
    setRefLoading(true);
    try {
      const [medicosRes, municipiosRes] = await Promise.all([
        supabase
          .from('perfis')
          .select('id, nome, email, crm_coren')
          .eq('status_cadastro', 'aprovado')
          .in('role', ['especialista', 'teleconsultor'])
          .order('nome', { ascending: true }),
        supabase
          .from('fluxos_municipios')
          .select('id, municipio, uf')
          .order('uf', { ascending: true })
          .order('municipio', { ascending: true }),
      ]);

      if (medicosRes.error) throw medicosRes.error;
      if (municipiosRes.error) throw municipiosRes.error;

      setMedicos((medicosRes.data as MedicoPerfil[]) || []);
      setMunicipiosRede((municipiosRes.data as FluxoMunicipio[]) || []);

      // Pre-select first doctor in form
      if (medicosRes.data && medicosRes.data.length > 0) {
        setForm((prev) => ({ ...prev, especialistaId: medicosRes.data[0].id }));
      }
    } catch (err: unknown) {
      console.error('Erro ao carregar dados de referência:', err);
    } finally {
      setRefLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // 2. Load fluxos + their municipality associations
  // ─────────────────────────────────────────────────────────
  const fetchFluxos = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      // a) Fetch all fluxos
      const { data: fluxosData, error: fluxosError } = await supabase
        .from('fluxos_especialidades')
        .select(
          'id, especialista_id, nome_fluxo, tipo_fluxo, idade_minima, idade_maxima, sexo, created_at',
        )
        .order('created_at', { ascending: false });

      if (fluxosError) throw fluxosError;

      if (!fluxosData || fluxosData.length === 0) {
        setFluxos([]);
        return;
      }

      // b) Fetch all municipality links in a single query
      const fluxoIds = fluxosData.map((f) => f.id as string);

      const { data: vinculosData } = await supabase
        .from('fluxos_especialidades_municipios')
        .select('fluxo_id, municipio_id')
        .in('fluxo_id', fluxoIds);

      const vinculos = (vinculosData || []) as {
        fluxo_id: string;
        municipio_id: string;
      }[];

      // c) Fetch profile names for specialists in fluxos
      const especialistaIds = Array.from(
        new Set(fluxosData.map((f) => f.especialista_id as string)),
      );

      const { data: perfisData } = await supabase
        .from('perfis')
        .select('id, nome, crm_coren')
        .in('id', especialistaIds);

      const perfisMap: Record<string, { nome: string; crm: string | null }> =
        {};
      (perfisData || []).forEach((p) => {
        perfisMap[p.id as string] = {
          nome: p.nome as string,
          crm: p.crm_coren as string | null,
        };
      });

      // d) Build municipios lookup
      const munMap: Record<string, FluxoMunicipio> = {};
      municipiosRede.forEach((m) => {
        munMap[m.id] = m;
      });

      // e) Compose final list
      const composed: FluxoEspecialidade[] = fluxosData.map((f) => {
        const muns = vinculos
          .filter((v) => v.fluxo_id === f.id)
          .map((v) => munMap[v.municipio_id])
          .filter(Boolean) as FluxoMunicipio[];

        return {
          id: f.id as string,
          especialista_id: f.especialista_id as string,
          nome_fluxo: f.nome_fluxo as string,
          tipo_fluxo: f.tipo_fluxo as TipoFluxo,
          idade_minima: f.idade_minima as number | null,
          idade_maxima: f.idade_maxima as number | null,
          sexo: (f.sexo ?? '') as Sexo,
          created_at: f.created_at as string,
          medicoNome: perfisMap[f.especialista_id as string]?.nome ?? '—',
          medicoCrm: perfisMap[f.especialista_id as string]?.crm ?? null,
          municipios: muns,
        };
      });

      setFluxos(composed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao carregar fluxos:', msg);
      setListError(
        'Não foi possível carregar os fluxos. Verifique se as tabelas "fluxos_especialidades" e "fluxos_especialidades_municipios" existem no Supabase.',
      );
    } finally {
      setListLoading(false);
    }
  }, [municipiosRede]);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  // Fetch fluxos only after reference data (municipios) is ready
  useEffect(() => {
    if (!refLoading) {
      fetchFluxos();
    }
  }, [refLoading, fetchFluxos]);

  // ─────────────────────────────────────────────────────────
  // Form helpers
  // ─────────────────────────────────────────────────────────
  const openModal = () => {
    setForm({
      ...FORM_EMPTY,
      especialistaId: medicos[0]?.id ?? '',
    });
    setFormError(null);
    setFormSuccess(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError(null);
  };

  const toggleMunicipio = (id: string) => {
    setForm((prev) => ({
      ...prev,
      municipiosSelecionados: prev.municipiosSelecionados.includes(id)
        ? prev.municipiosSelecionados.filter((m) => m !== id)
        : [...prev.municipiosSelecionados, id],
    }));
  };

  const selectAllMunicipios = () => {
    setForm((prev) => ({
      ...prev,
      municipiosSelecionados: municipiosRede.map((m) => m.id),
    }));
  };

  const clearAllMunicipios = () => {
    setForm((prev) => ({ ...prev, municipiosSelecionados: [] }));
  };

  // ─────────────────────────────────────────────────────────
  // Save fluxo (atomic: insert fluxo → insert municipality links)
  // ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!form.especialistaId) {
      setFormError('Selecione um médico especialista.');
      return;
    }
    if (!form.nomeFluxo.trim()) {
      setFormError('Informe o nome do fluxo.');
      return;
    }
    if (form.municipiosSelecionados.length === 0) {
      setFormError(
        'Selecione ao menos um município na seção de Abrangência do Fluxo.',
      );
      return;
    }

    const idadeMin =
      form.idadeMinima !== '' ? parseInt(form.idadeMinima, 10) : null;
    const idadeMax =
      form.idadeMaxima !== '' ? parseInt(form.idadeMaxima, 10) : null;

    if (idadeMin !== null && idadeMax !== null && idadeMin > idadeMax) {
      setFormError('A Idade Mínima não pode ser maior que a Idade Máxima.');
      return;
    }

    setSubmitting(true);

    try {
      // Step 1 – Insert the fluxo
      const { data: novoFluxo, error: fluxoError } = await supabase
        .from('fluxos_especialidades')
        .insert([
          {
            especialista_id: form.especialistaId,
            nome_fluxo: form.nomeFluxo.trim(),
            tipo_fluxo: form.tipoFluxo,
            idade_minima: idadeMin,
            idade_maxima: idadeMax,
            sexo: form.sexo || null,
          },
        ])
        .select('id')
        .single();

      if (fluxoError) throw fluxoError;

      const fluxoId = novoFluxo.id as string;

      // Step 2 – Insert municipality links
      const vinculos = form.municipiosSelecionados.map((munId) => ({
        fluxo_id: fluxoId,
        municipio_id: munId,
      }));

      const { error: vinculosError } = await supabase
        .from('fluxos_especialidades_municipios')
        .insert(vinculos);

      if (vinculosError) {
        // Rollback: delete the fluxo we just created
        await supabase
          .from('fluxos_especialidades')
          .delete()
          .eq('id', fluxoId);
        throw vinculosError;
      }

      // Step 3 – Optimistic UI update
      const medico = medicos.find((m) => m.id === form.especialistaId);
      const munsVinculadas = municipiosRede.filter((m) =>
        form.municipiosSelecionados.includes(m.id),
      );

      const novoFluxoComposed: FluxoEspecialidade = {
        id: fluxoId,
        especialista_id: form.especialistaId,
        nome_fluxo: form.nomeFluxo.trim(),
        tipo_fluxo: form.tipoFluxo,
        idade_minima: idadeMin,
        idade_maxima: idadeMax,
        sexo: form.sexo || ('' as Sexo),
        created_at: new Date().toISOString(),
        medicoNome: medico?.nome ?? '—',
        medicoCrm: medico?.crm_coren ?? null,
        municipios: munsVinculadas,
      };

      setFluxos((prev) => [novoFluxoComposed, ...prev]);
      setFormSuccess(`Fluxo "${form.nomeFluxo.trim()}" criado com sucesso!`);
      setTimeout(() => {
        setFormSuccess(null);
        closeModal();
      }, 1800);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao salvar fluxo.';
      console.error('Erro ao salvar fluxo:', msg);
      setFormError(
        'Não foi possível salvar o fluxo. Verifique a estrutura das tabelas e tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Delete fluxo (cascades to fluxos_especialidades_municipios via FK or manual)
  // ─────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      // Delete municipality links first (in case DB doesn't cascade)
      await supabase
        .from('fluxos_especialidades_municipios')
        .delete()
        .eq('fluxo_id', id);

      const { error } = await supabase
        .from('fluxos_especialidades')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFluxos((prev) => prev.filter((f) => f.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      console.error('Erro ao remover fluxo:', msg);
      alert('Não foi possível remover o fluxo. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-indigo-600" />
            Fluxos de Especialistas
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Configure os fluxos de telessaúde, vinculando médicos especialistas
            a seus municípios de abrangência e regras de elegibilidade.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openModal}
            disabled={refLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition shadow-xs disabled:opacity-50 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Novo Fluxo
          </button>
        )}
      </div>

      {/* ── Fluxos Table ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-900">
            Fluxos Configurados
          </span>
          {!listLoading && !listError && (
            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {fluxos.length}
            </span>
          )}
        </div>

        {listLoading || refLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : listError ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-600 max-w-md">{listError}</p>
            <button
              onClick={fetchFluxos}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : fluxos.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center px-6">
            <Activity className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-semibold text-gray-900">
              Nenhum fluxo configurado ainda.
            </p>
            {isAdmin && (
              <p className="text-xs text-gray-500">
                Clique em "Novo Fluxo" para criar o primeiro.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Nome do Fluxo</th>
                  <th className="px-6 py-3.5">Tipo</th>
                  <th className="px-6 py-3.5">Especialista</th>
                  <th className="px-6 py-3.5">Restrições</th>
                  <th className="px-6 py-3.5">Abrangência</th>
                  {isAdmin && (
                    <th className="px-6 py-3.5 text-right">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {fluxos.map((fluxo) => (
                  <React.Fragment key={fluxo.id}>
                    <tr className="hover:bg-gray-50/60 transition-colors">
                      {/* Flow name */}
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">
                          {fluxo.nome_fluxo}
                        </span>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          #{fluxo.id.substring(0, 8)}
                        </div>
                      </td>

                      {/* Type badge */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${tipoBadge(fluxo.tipo_fluxo)}`}
                        >
                          {fluxo.tipo_fluxo}
                        </span>
                      </td>

                      {/* Specialist */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 shrink-0">
                            <User className="h-3.5 w-3.5 text-indigo-600" />
                          </span>
                          <div>
                            <div className="font-semibold text-gray-900 text-xs">
                              {fluxo.medicoNome}
                            </div>
                            {fluxo.medicoCrm && (
                              <div className="text-[10px] text-gray-400 font-mono">
                                {fluxo.medicoCrm}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Restrictions */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {fluxo.sexo ? (
                            <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              Sexo: {fluxo.sexo === 'M' ? 'Masculino' : 'Feminino'}
                            </span>
                          ) : null}
                          {fluxo.idade_minima !== null ? (
                            <span className="rounded bg-slate-50 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                              ≥ {fluxo.idade_minima} anos
                            </span>
                          ) : null}
                          {fluxo.idade_maxima !== null ? (
                            <span className="rounded bg-slate-50 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                              ≤ {fluxo.idade_maxima} anos
                            </span>
                          ) : null}
                          {!fluxo.sexo &&
                            fluxo.idade_minima === null &&
                            fluxo.idade_maxima === null && (
                              <span className="text-xs text-gray-400 italic">
                                Sem restrições
                              </span>
                            )}
                        </div>
                      </td>

                      {/* Coverage toggle */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            setExpandedId(
                              expandedId === fluxo.id ? null : fluxo.id,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition"
                        >
                          <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                          {fluxo.municipios?.length ?? 0}{' '}
                          {fluxo.municipios?.length === 1
                            ? 'cidade'
                            : 'cidades'}
                          {expandedId === fluxo.id ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>

                      {/* Admin actions */}
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          {confirmDeleteId === fluxo.id ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-xs text-gray-600 font-medium">
                                Excluir?
                              </span>
                              <button
                                onClick={() => handleDelete(fluxo.id)}
                                disabled={deletingId === fluxo.id}
                                className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 px-2.5 py-1.5 text-xs font-semibold text-white transition"
                              >
                                {deletingId === fluxo.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                                Sim
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(fluxo.id)}
                              disabled={deletingId !== null}
                              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remover
                            </button>
                          )}
                        </td>
                      )}
                    </tr>

                    {/* Expanded municipalities row */}
                    {expandedId === fluxo.id && (
                      <tr className="bg-indigo-50/30">
                        <td
                          colSpan={isAdmin ? 6 : 5}
                          className="px-8 py-4"
                        >
                          <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">
                            Municípios Cobertos por este Fluxo
                          </p>
                          {!fluxo.municipios || fluxo.municipios.length === 0 ? (
                            <span className="text-xs text-gray-500 italic">
                              Nenhum município vinculado.
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {fluxo.municipios.map((m) => (
                                <span
                                  key={m.id}
                                  className="inline-flex items-center gap-1 rounded-full bg-white border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-800"
                                >
                                  <MapPin className="h-3 w-3 text-indigo-400" />
                                  {m.municipio}
                                  <span className="ml-0.5 text-[9px] font-bold text-indigo-400 bg-indigo-50 rounded px-1">
                                    {m.uf}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Novo Fluxo ─────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl my-8">
            {/* Modal header */}
            <div className="flex items-center justify-between bg-gray-50 border-b border-gray-150 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-gray-900">
                  Criar Novo Fluxo de Especialidade
                </h4>
              </div>
              <button
                onClick={closeModal}
                disabled={submitting}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* ── Section 1: Médico ──────────────────────── */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Médico Especialista
                </h5>
                <label
                  htmlFor="fluxo-especialista"
                  className="block text-xs font-semibold text-gray-600 mb-1.5"
                >
                  Selecionar Médico (aprovados)
                </label>
                <select
                  id="fluxo-especialista"
                  value={form.especialistaId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      especialistaId: e.target.value,
                    }))
                  }
                  disabled={submitting || medicos.length === 0}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
                >
                  {medicos.length === 0 ? (
                    <option value="">Nenhum médico aprovado encontrado</option>
                  ) : (
                    medicos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                        {m.crm_coren ? ` — ${m.crm_coren}` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* ── Section 2: Fluxo info ──────────────────── */}
              <div className="border-t border-gray-100 pt-5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Configuração do Fluxo
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="fluxo-nome"
                      className="block text-xs font-semibold text-gray-600 mb-1.5"
                    >
                      Nome do Fluxo <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="fluxo-nome"
                      type="text"
                      placeholder="Ex: Telecardio Santa Catarina Norte"
                      value={form.nomeFluxo}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          nomeFluxo: e.target.value,
                        }))
                      }
                      disabled={submitting}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
                    />
                  </div>

                  {/* Tipo de Fluxo */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      Tipo de Fluxo <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      {(['Consultivo', 'Compulsório'] as TipoFluxo[]).map(
                        (tipo) => (
                          <label
                            key={tipo}
                            className={`flex items-center gap-2.5 cursor-pointer rounded-xl border-2 px-4 py-3 flex-1 transition ${
                              form.tipoFluxo === tipo
                                ? tipo === 'Consultivo'
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-violet-500 bg-violet-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="tipo-fluxo"
                              value={tipo}
                              checked={form.tipoFluxo === tipo}
                              onChange={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  tipoFluxo: tipo,
                                }))
                              }
                              className="accent-indigo-600"
                            />
                            <div>
                              <span
                                className={`text-sm font-bold ${
                                  form.tipoFluxo === tipo
                                    ? tipo === 'Consultivo'
                                      ? 'text-blue-700'
                                      : 'text-violet-700'
                                    : 'text-gray-700'
                                }`}
                              >
                                {tipo}
                              </span>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {tipo === 'Consultivo'
                                  ? 'Solicitante decide após a interconsulta'
                                  : 'Encaminhamento obrigatório ao especialista'}
                              </p>
                            </div>
                          </label>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section 3: Restrições ──────────────────── */}
              <div className="border-t border-gray-100 pt-5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                  Restrições de Elegibilidade{' '}
                  <span className="normal-case font-normal text-gray-400">
                    (opcional)
                  </span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Idade mínima */}
                  <div>
                    <label
                      htmlFor="idade-min"
                      className="block text-xs font-semibold text-gray-600 mb-1.5"
                    >
                      Idade Mínima (anos)
                    </label>
                    <input
                      id="idade-min"
                      type="number"
                      min={0}
                      max={150}
                      placeholder="Ex: 18"
                      value={form.idadeMinima}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          idadeMinima: e.target.value,
                        }))
                      }
                      disabled={submitting}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
                    />
                  </div>

                  {/* Idade máxima */}
                  <div>
                    <label
                      htmlFor="idade-max"
                      className="block text-xs font-semibold text-gray-600 mb-1.5"
                    >
                      Idade Máxima (anos)
                    </label>
                    <input
                      id="idade-max"
                      type="number"
                      min={0}
                      max={150}
                      placeholder="Ex: 65"
                      value={form.idadeMaxima}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          idadeMaxima: e.target.value,
                        }))
                      }
                      disabled={submitting}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
                    />
                  </div>

                  {/* Sexo */}
                  <div>
                    <label
                      htmlFor="fluxo-sexo"
                      className="block text-xs font-semibold text-gray-600 mb-1.5"
                    >
                      Sexo
                    </label>
                    <select
                      id="fluxo-sexo"
                      value={form.sexo}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          sexo: e.target.value as Sexo,
                        }))
                      }
                      disabled={submitting}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
                    >
                      <option value="">Sem restrição</option>
                      <option value="M">Masculino (M)</option>
                      <option value="F">Feminino (F)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Section 4: Abrangência ─────────────────── */}
              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Abrangência do Fluxo{' '}
                    <span className="text-red-500">*</span>
                  </h5>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllMunicipios}
                      className="text-xs text-indigo-600 hover:underline font-semibold"
                    >
                      Todos
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllMunicipios}
                      className="text-xs text-gray-500 hover:underline font-semibold"
                    >
                      Nenhum
                    </button>
                  </div>
                </div>

                {municipiosRede.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-xs text-amber-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Nenhum município cadastrado na rede. Acesse a aba{' '}
                    <strong>Municípios</strong> primeiro.
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 max-h-56 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-0">
                      {municipiosRede.map((m) => {
                        const checked = form.municipiosSelecionados.includes(
                          m.id,
                        );
                        return (
                          <label
                            key={m.id}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                              checked
                                ? 'bg-indigo-50/60'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMunicipio(m.id)}
                              disabled={submitting}
                              className="h-4 w-4 rounded accent-indigo-600 shrink-0"
                            />
                            <span
                              className={`text-xs font-semibold ${checked ? 'text-indigo-800' : 'text-gray-700'}`}
                            >
                              {m.municipio}
                            </span>
                            <span className="ml-auto text-[9px] font-bold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                              {m.uf}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {form.municipiosSelecionados.length > 0 && (
                  <p className="mt-2 text-xs text-indigo-600 font-semibold">
                    {form.municipiosSelecionados.length} município
                    {form.municipiosSelecionados.length !== 1 ? 's' : ''}{' '}
                    selecionado
                    {form.municipiosSelecionados.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Feedback */}
              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-xs text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {formSuccess}
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || formSuccess !== null}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-sm font-semibold text-white transition disabled:bg-indigo-300"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Salvar Fluxo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
