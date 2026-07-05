import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  MapPin,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface FluxoMunicipio {
  id: string;
  municipio: string;
  uf: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────
// Constants – Brazilian states
// ─────────────────────────────────────────────────────────
const UF_OPTIONS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO',
  'MA','MG','MS','MT','PA','PB','PE','PI','PR',
  'RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────
export const Municipios: React.FC = () => {
  // ── List state ──────────────────────────────────────────
  const [municipios, setMunicipios] = useState<FluxoMunicipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Form state ──────────────────────────────────────────
  const [formNome, setFormNome] = useState('');
  const [formUf, setFormUf] = useState('SC');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Delete state ─────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────
  // Fetch municipalities
  // ─────────────────────────────────────────────────────────
  const fetchMunicipios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('fluxos_municipios')
        .select('id, municipio, uf, created_at')
        .order('uf', { ascending: true })
        .order('municipio', { ascending: true });

      if (fetchError) throw fetchError;
      setMunicipios((data as FluxoMunicipio[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao buscar municípios:', message);
      setError('Não foi possível carregar os municípios da rede. Verifique se a tabela "fluxos_municipios" existe no Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMunicipios();
  }, [fetchMunicipios]);

  // ─────────────────────────────────────────────────────────
  // Add municipality
  // ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = formNome.trim();

    if (!nome) {
      setFormError('Informe o nome do município.');
      return;
    }

    // Prevent duplicates (case-insensitive)
    const exists = municipios.some(
      (m) =>
        m.municipio.toLowerCase() === nome.toLowerCase() &&
        m.uf === formUf,
    );
    if (exists) {
      setFormError(`${nome} / ${formUf} já está cadastrado na rede.`);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSuccessMsg(null);

    try {
      const { data, error: insertError } = await supabase
        .from('fluxos_municipios')
        .insert([{ municipio: nome, uf: formUf }])
        .select('id, municipio, uf, created_at')
        .single();

      if (insertError) throw insertError;

      if (data) {
        setMunicipios((prev) =>
          [...prev, data as FluxoMunicipio].sort((a, b) =>
            a.uf.localeCompare(b.uf) || a.municipio.localeCompare(b.municipio),
          ),
        );
      }

      setFormNome('');
      setFormUf('SC');
      setSuccessMsg(`${nome} / ${formUf} adicionado com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      const errMsg = err?.message || err?.details || 'Erro de rede ou permissão.';
      console.error('Erro ao inserir município:', err);
      setFormError(`Não foi possível cadastrar o município. Detalhe: ${errMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Delete municipality
  // ─────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      const { error: deleteError } = await supabase
        .from('fluxos_municipios')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setMunicipios((prev) => prev.filter((m) => m.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao remover município.';
      console.error('Erro ao excluir município:', message);
      alert('Não foi possível remover o município. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Derived – filtered list
  // ─────────────────────────────────────────────────────────
  const filtered = municipios.filter((m) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.municipio.toLowerCase().includes(term) ||
      m.uf.toLowerCase().includes(term)
    );
  });

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-xs">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-indigo-600" />
          Municípios Parceiros da Rede
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Gerencie as cidades e UFs que fazem parte da abrangência do serviço de
          Telessaúde. Os casos só podem ser enviados por unidades vinculadas a
          municípios cadastrados aqui.
        </p>
      </div>

      {/* ── Add Form ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 bg-indigo-50/60 border-b border-indigo-100">
          <Plus className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-bold text-indigo-800">
            Cadastrar Novo Município Parceiro
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-4 items-end">
            {/* Municipality name */}
            <div>
              <label
                htmlFor="municipio-nome"
                className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5"
              >
                Nome do Município
              </label>
              <input
                id="municipio-nome"
                type="text"
                placeholder="Ex: Florianópolis"
                value={formNome}
                onChange={(e) => {
                  setFormNome(e.target.value);
                  setFormError(null);
                }}
                disabled={submitting}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 transition"
              />
            </div>

            {/* UF select */}
            <div>
              <label
                htmlFor="municipio-uf"
                className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5"
              >
                UF
              </label>
              <select
                id="municipio-uf"
                value={formUf}
                onChange={(e) => setFormUf(e.target.value)}
                disabled={submitting}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 transition"
              >
                {UF_OPTIONS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting || !formNome.trim()}
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white transition disabled:bg-indigo-300 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Adicionar
                </>
              )}
            </button>
          </div>

          {/* Feedback messages */}
          {formError && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}
          {successMsg && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-xs text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {successMsg}
            </div>
          )}
        </form>
      </div>

      {/* ── List + Search ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        {/* Search bar + counter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              Municípios Cadastrados
            </span>
            {!loading && (
              <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                {filtered.length}
                {searchTerm && municipios.length !== filtered.length
                  ? ` / ${municipios.length}`
                  : ''}
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrar município ou UF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* States */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button
              onClick={fetchMunicipios}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
            <MapPin className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-semibold text-gray-900">
              {searchTerm
                ? 'Nenhum município encontrado para essa busca.'
                : 'Nenhum município cadastrado ainda.'}
            </p>
            <p className="text-xs text-gray-500">
              {!searchTerm &&
                'Use o formulário acima para adicionar o primeiro município parceiro.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Município</th>
                  <th className="px-6 py-3.5">UF</th>
                  <th className="px-6 py-3.5">Cadastrado em</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    {/* Municipality name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 shrink-0">
                          <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                        </span>
                        <span className="font-semibold text-gray-900">
                          {m.municipio}
                        </span>
                      </div>
                    </td>

                    {/* UF badge */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 tracking-wider">
                        {m.uf}
                      </span>
                    </td>

                    {/* Created at */}
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(m.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {confirmDeleteId === m.id ? (
                        /* Inline confirmation */
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-gray-600 font-medium">
                            Confirmar exclusão?
                          </span>
                          <button
                            onClick={() => handleDelete(m.id)}
                            disabled={deletingId === m.id}
                            className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 px-2.5 py-1.5 text-xs font-semibold text-white transition disabled:opacity-60"
                          >
                            {deletingId === m.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            Sim
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition"
                          >
                            <X className="h-3 w-3" />
                            Não
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(m.id)}
                          disabled={deletingId !== null}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
