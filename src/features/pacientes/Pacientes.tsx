import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  Users,
  Plus,
  Search,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  CalendarDays,
  CreditCard,
  MapPin,
  ChevronDown,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
type Sexo = 'M' | 'F';

interface Municipio {
  id: string;
  municipio: string;
  uf: string;
}

interface Paciente {
  id: string;
  nome: string;
  cpf: string;           // stored as digits-only (11 chars)
  data_nascimento: string; // ISO date yyyy-mm-dd
  sexo: Sexo;
  cartao_sus: string | null;
  municipio_id: string | null;
  created_at: string;
  // joined in-memory
  municipioLabel?: string;
}

// ─────────────────────────────────────────────────────────
// CPF utilities
// ─────────────────────────────────────────────────────────
const cpfOnlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 11);

const applyCpfMask = (raw: string): string => {
  const d = cpfOnlyDigits(raw);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
};

/** Validates CPF using the standard Brazilian mod-11 algorithm */
const isValidCpf = (raw: string): boolean => {
  const d = cpfOnlyDigits(raw);
  if (d.length !== 11) return false;
  if (/^(\d)\1+$/.test(d)) return false; // all same digits

  const calc = (digits: string, len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(digits[i]) * (len + 1 - i);
    const rem = (sum * 10) % 11;
    return rem === 10 || rem === 11 ? 0 : rem;
  };

  return calc(d, 9) === parseInt(d[9]) && calc(d, 10) === parseInt(d[10]);
};

/** Display mask: hides first 6 digits for privacy — •••.•••.XXX-XX */
const maskCpfDisplay = (raw: string): string => {
  const d = cpfOnlyDigits(raw);
  if (d.length < 11) return applyCpfMask(raw);
  return `•••.•••.${d.slice(6, 9)}-${d.slice(9, 11)}`;
};

// ─────────────────────────────────────────────────────────
// Age calculation
// ─────────────────────────────────────────────────────────
const calcAge = (dateStr: string): string => {
  const birth = new Date(dateStr);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;

  if (years < 0) return '—';
  if (years < 2) {
    // Show months for very young patients
    const months =
      (today.getFullYear() - birth.getFullYear()) * 12 +
      today.getMonth() -
      birth.getMonth();
    return `${months} mes${months !== 1 ? 'es' : ''}`;
  }
  return `${years} anos`;
};

// ─────────────────────────────────────────────────────────
// Skeleton row
// ─────────────────────────────────────────────────────────
const SkeletonRow: React.FC = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-3.5 rounded bg-gray-100" style={{ width: `${60 + (i % 3) * 20}%` }} />
      </td>
    ))}
  </tr>
);

// ─────────────────────────────────────────────────────────
// Form default state
// ─────────────────────────────────────────────────────────
const FORM_EMPTY = {
  nome: '',
  cpf: '',          // displayed with mask, stored as digits
  dataNascimento: '',
  sexo: '' as Sexo | '',
  cartaoSus: '',
  municipioId: '',
};

const PAGE_SIZE = 20;

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────
export const Pacientes: React.FC = () => {
  const { user } = useAuth();

  // ── Reference data ──────────────────────────────────────
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [municipioMap, setMunicipioMap] = useState<Record<string, string>>({});

  // ── Patient list ────────────────────────────────────────
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Search ──────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Form state ──────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(FORM_EMPTY);
  const [cpfDisplay, setCpfDisplay] = useState(''); // masked input value
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [globalFormError, setGlobalFormError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────
  // Load reference data (municípios)
  // ─────────────────────────────────────────────────────────
  const fetchMunicipios = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fluxos_municipios')
        .select('id, municipio, uf')
        .order('uf', { ascending: true })
        .order('municipio', { ascending: true });

      if (error) throw error;
      const list = (data as Municipio[]) || [];
      setMunicipios(list);

      const map: Record<string, string> = {};
      list.forEach((m) => { map[m.id] = `${m.municipio} / ${m.uf}`; });
      setMunicipioMap(map);
    } catch (err: unknown) {
      console.error('Erro ao carregar municípios:', err);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // Load patients (paginated)
  // ─────────────────────────────────────────────────────────
  const fetchPacientes = useCallback(async (pageIndex = 0, append = false) => {
    if (!append) {
      setListLoading(true);
      setListError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('pacientes')
        .select('id, nome, cpf, data_nascimento, sexo, cartao_sus, municipio_id, created_at', {
          count: 'exact',
        })
        .order('nome', { ascending: true })
        .range(from, to);

      if (error) throw error;

      const list = (data as Paciente[]) || [];

      // Attach municipality label
      const enriched = list.map((p) => ({
        ...p,
        municipioLabel: p.municipio_id ? municipioMap[p.municipio_id] ?? '—' : '—',
      }));

      setPacientes((prev) => (append ? [...prev, ...enriched] : enriched));
      setPage(pageIndex);
      setHasMore(count !== null && from + list.length < count);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao carregar pacientes:', msg);
      setListError('Não foi possível carregar a lista de pacientes.');
    } finally {
      setListLoading(false);
      setLoadingMore(false);
    }
  }, [municipioMap]);

  // Load municipalities first, then patients
  useEffect(() => {
    fetchMunicipios();
  }, [fetchMunicipios]);

  // Reload patients whenever municipioMap is ready (populated)
  useEffect(() => {
    if (Object.keys(municipioMap).length > 0 || municipios.length === 0) {
      fetchPacientes(0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipioMap]);

  // ─────────────────────────────────────────────────────────
  // Form helpers
  // ─────────────────────────────────────────────────────────
  const openForm = () => {
    setForm(FORM_EMPTY);
    setCpfDisplay('');
    setFormErrors({});
    setFormSuccess(null);
    setGlobalFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCpfMask(e.target.value);
    setCpfDisplay(masked);
    setForm((prev) => ({ ...prev, cpf: cpfOnlyDigits(e.target.value) }));
    if (formErrors.cpf) setFormErrors((prev) => ({ ...prev, cpf: '' }));
  };

  const handleSusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 15);
    setForm((prev) => ({ ...prev, cartaoSus: digits }));
  };

  // ─────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.nome.trim()) errors.nome = 'Informe o nome completo.';
    if (!form.cpf || form.cpf.length !== 11) {
      errors.cpf = 'CPF deve ter 11 dígitos.';
    } else if (!isValidCpf(form.cpf)) {
      errors.cpf = 'CPF inválido. Verifique os dígitos.';
    }
    if (!form.dataNascimento) errors.dataNascimento = 'Informe a data de nascimento.';
    else {
      const birth = new Date(form.dataNascimento);
      if (birth > new Date()) errors.dataNascimento = 'Data de nascimento não pode ser no futuro.';
    }
    if (!form.sexo) errors.sexo = 'Selecione o sexo.';
    if (form.cartaoSus && form.cartaoSus.length !== 15) {
      errors.cartaoSus = 'Cartão SUS deve ter exatamente 15 dígitos.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─────────────────────────────────────────────────────────
  // Save patient
  // ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalFormError(null);
    setFormSuccess(null);

    if (!validate()) return;
    if (!user) return;

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        nome: form.nome.trim(),
        cpf: form.cpf,
        data_nascimento: form.dataNascimento,
        sexo: form.sexo,
        municipio_id: form.municipioId || null,
        cartao_sus: form.cartaoSus || null,
      };

      const { data, error } = await supabase
        .from('pacientes')
        .insert([payload])
        .select('id, nome, cpf, data_nascimento, sexo, cartao_sus, municipio_id, created_at')
        .single();

      if (error) {
        // Postgres unique constraint violation
        if (error.code === '23505') {
          const detail = error.message.toLowerCase();
          if (detail.includes('cpf')) {
            setFormErrors((prev) => ({ ...prev, cpf: 'Este CPF já está cadastrado no sistema.' }));
          } else if (detail.includes('cartao_sus') || detail.includes('sus')) {
            setFormErrors((prev) => ({
              ...prev,
              cartaoSus: 'Este Cartão SUS já está vinculado a outro paciente.',
            }));
          } else {
            setGlobalFormError('Registro duplicado. Verifique CPF e Cartão SUS.');
          }
          return;
        }
        throw error;
      }

      if (data) {
        const novo: Paciente = {
          ...(data as Paciente),
          municipioLabel: data.municipio_id ? municipioMap[data.municipio_id] ?? '—' : '—',
        };
        // Optimistic update — add to top (maintaining alpha order would require a sort)
        setPacientes((prev) =>
          [novo, ...prev].sort((a, b) => a.nome.localeCompare(b.nome)),
        );
      }

      setFormSuccess(`Paciente "${form.nome.trim()}" cadastrado com sucesso!`);
      setTimeout(() => {
        setFormSuccess(null);
        closeForm();
      }, 1800);
    } catch (err: any) {
      const errMsg = err?.message || err?.details || 'Erro de rede ou permissão.';
      console.error('Erro ao cadastrar paciente:', err);
      setGlobalFormError(
        `Não foi possível cadastrar o paciente. Detalhe: ${errMsg}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Client-side search filter (nome or CPF digits)
  // ─────────────────────────────────────────────────────────
  const filtered = pacientes.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().replace(/\D/g, '');
    const termRaw = searchTerm.toLowerCase();
    return (
      p.nome.toLowerCase().includes(termRaw) ||
      p.cpf.includes(term)
    );
  });

  // ─────────────────────────────────────────────────────────
  // Input field helper (reusable inline)
  // ─────────────────────────────────────────────────────────
  const fieldClass = (err?: string) =>
    `block w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400
     focus:outline-hidden focus:ring-1 transition
     ${err
       ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500'
       : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
     }`;

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Gestão de Pacientes
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Cadastre e gerencie os pacientes vinculados às interconsultas da rede de Telessaúde.
          </p>
        </div>
        <button
          onClick={openForm}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Novo Paciente
        </button>
      </div>

      {/* ── Search + Table ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        {/* Search bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">Pacientes Cadastrados</span>
            {!listLoading && (
              <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                {filtered.length}
                {searchTerm && pacientes.length !== filtered.length
                  ? ` / ${pacientes.length}`
                  : ''}
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 block w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); searchRef.current?.focus(); }}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Table states */}
        {listLoading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  {['Nome', 'CPF', 'Idade', 'Sexo', 'Cartão SUS', 'Município'].map((h) => (
                    <th key={h} className="px-6 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : listError ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-600">{listError}</p>
            <button
              onClick={() => fetchPacientes(0, false)}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center px-6">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-semibold text-gray-900">
              {searchTerm ? 'Nenhum paciente encontrado para essa busca.' : 'Nenhum paciente cadastrado ainda.'}
            </p>
            {!searchTerm && (
              <p className="text-xs text-gray-500">
                Clique em "Novo Paciente" para cadastrar o primeiro.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Nome</th>
                    <th className="px-6 py-3.5">CPF</th>
                    <th className="px-6 py-3.5">Idade</th>
                    <th className="px-6 py-3.5">Sexo</th>
                    <th className="px-6 py-3.5">Cartão SUS</th>
                    <th className="px-6 py-3.5">Município</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Nome */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 shrink-0 text-xs font-bold text-indigo-600">
                            {p.nome.trim().charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{p.nome}</div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                              #{p.id.substring(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* CPF mascarado */}
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">
                        {maskCpfDisplay(p.cpf)}
                      </td>

                      {/* Idade */}
                      <td className="px-6 py-4 text-xs text-gray-700 font-semibold">
                        {calcAge(p.data_nascimento)}
                      </td>

                      {/* Sexo */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                            p.sexo === 'M'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-pink-50 text-pink-700 border-pink-200'
                          }`}
                        >
                          {p.sexo === 'M' ? 'Masculino' : 'Feminino'}
                        </span>
                      </td>

                      {/* Cartão SUS */}
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">
                        {p.cartao_sus ?? (
                          <span className="italic text-gray-400">Não informado</span>
                        )}
                      </td>

                      {/* Município */}
                      <td className="px-6 py-4">
                        {p.municipioLabel && p.municipioLabel !== '—' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-700">
                            <MapPin className="h-3 w-3 text-indigo-400 shrink-0" />
                            {p.municipioLabel}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load more */}
            {hasMore && !searchTerm && (
              <div className="flex justify-center py-4 border-t border-gray-100">
                <button
                  onClick={() => fetchPacientes(page + 1, true)}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 transition disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  Carregar mais pacientes
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal: Novo Paciente ──────────────────────────── */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between bg-indigo-50/70 border-b border-indigo-100 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-indigo-900">Cadastrar Novo Paciente</h4>
              </div>
              <button
                onClick={closeForm}
                disabled={submitting}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* ── Nome ──────────────────────────────────── */}
              <div>
                <label htmlFor="pac-nome" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  id="pac-nome"
                  type="text"
                  placeholder="Ex: Maria da Silva Santos"
                  value={form.nome}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, nome: e.target.value }));
                    if (formErrors.nome) setFormErrors((prev) => ({ ...prev, nome: '' }));
                  }}
                  disabled={submitting}
                  className={fieldClass(formErrors.nome)}
                />
                {formErrors.nome && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {formErrors.nome}
                  </p>
                )}
              </div>

              {/* ── CPF + Data Nascimento (row) ─────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pac-cpf" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    CPF <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      id="pac-cpf"
                      type="text"
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={cpfDisplay}
                      onChange={handleCpfChange}
                      disabled={submitting}
                      maxLength={14}
                      className={`pl-9 ${fieldClass(formErrors.cpf)}`}
                    />
                  </div>
                  {formErrors.cpf && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> {formErrors.cpf}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="pac-nasc" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Data de Nascimento <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      id="pac-nasc"
                      type="date"
                      value={form.dataNascimento}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, dataNascimento: e.target.value }));
                        if (formErrors.dataNascimento) setFormErrors((prev) => ({ ...prev, dataNascimento: '' }));
                      }}
                      disabled={submitting}
                      className={`pl-9 ${fieldClass(formErrors.dataNascimento)}`}
                    />
                  </div>
                  {formErrors.dataNascimento && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> {formErrors.dataNascimento}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Sexo ──────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Sexo <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  {([['M', 'Masculino', 'blue'], ['F', 'Feminino', 'pink']] as const).map(
                    ([val, label, color]) => (
                      <label
                        key={val}
                        className={`flex items-center gap-2.5 cursor-pointer rounded-xl border-2 px-4 py-3 flex-1 transition ${
                          form.sexo === val
                            ? color === 'blue'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        } ${submitting ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        <input
                          type="radio"
                          name="sexo"
                          value={val}
                          checked={form.sexo === val}
                          onChange={() => {
                            setForm((prev) => ({ ...prev, sexo: val }));
                            if (formErrors.sexo) setFormErrors((prev) => ({ ...prev, sexo: '' }));
                          }}
                          className={`accent-${color}-600`}
                        />
                        <span
                          className={`text-sm font-bold ${
                            form.sexo === val
                              ? color === 'blue' ? 'text-blue-700' : 'text-pink-700'
                              : 'text-gray-700'
                          }`}
                        >
                          {label}
                        </span>
                      </label>
                    ),
                  )}
                </div>
                {formErrors.sexo && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {formErrors.sexo}
                  </p>
                )}
              </div>

              {/* ── Cartão SUS + Município (row) ─────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pac-sus" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Cartão SUS{' '}
                    <span className="normal-case font-normal text-gray-400">(opcional)</span>
                  </label>
                  <input
                    id="pac-sus"
                    type="text"
                    inputMode="numeric"
                    placeholder="15 dígitos"
                    value={form.cartaoSus}
                    onChange={handleSusChange}
                    disabled={submitting}
                    maxLength={15}
                    className={fieldClass(formErrors.cartaoSus)}
                  />
                  {form.cartaoSus.length > 0 && (
                    <p className={`mt-1 text-[10px] ${form.cartaoSus.length === 15 ? 'text-green-600' : 'text-gray-400'}`}>
                      {form.cartaoSus.length}/15 dígitos
                    </p>
                  )}
                  {formErrors.cartaoSus && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> {formErrors.cartaoSus}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="pac-municipio" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Município{' '}
                    <span className="normal-case font-normal text-gray-400">(opcional)</span>
                  </label>
                  <select
                    id="pac-municipio"
                    value={form.municipioId}
                    onChange={(e) => setForm((prev) => ({ ...prev, municipioId: e.target.value }))}
                    disabled={submitting || municipios.length === 0}
                    className={fieldClass()}
                  >
                    <option value="">— Selecionar município —</option>
                    {municipios.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.municipio} / {m.uf}
                      </option>
                    ))}
                  </select>
                  {municipios.length === 0 && (
                    <p className="mt-1 text-[10px] text-amber-600">
                      Nenhum município cadastrado na rede ainda.
                    </p>
                  )}
                </div>
              </div>

              {/* Feedback */}
              {globalFormError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {globalFormError}
                </div>
              )}
              {formSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-xs text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {formSuccess}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
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
                      Cadastrar Paciente
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
