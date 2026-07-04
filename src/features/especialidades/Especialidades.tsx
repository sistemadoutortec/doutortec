import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Stethoscope, Plus, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface Especialidade {
  id: string;
  nome: string;
  created_at: string;
}

export const Especialidades: React.FC = () => {
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [novoNome, setNovoNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchEspecialidades = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('especialidades')
        .select('id, nome, created_at')
        .order('nome', { ascending: true });

      if (fetchError) throw fetchError;
      setEspecialidades(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar especialidades:', err.message || err);
      setError('Não foi possível carregar as especialidades. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEspecialidades();
  }, []);

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeTrimmed = novoNome.trim();
    if (!nomeTrimmed) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const { data, error: insertError } = await supabase
        .from('especialidades')
        .insert([{ nome: nomeTrimmed }])
        .select('id, nome, created_at')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          setSaveError('Esta especialidade já está cadastrada no sistema.');
        } else {
          throw insertError;
        }
        return;
      }

      if (data) {
        // Update local state immediately without full page reload
        setEspecialidades(prev =>
          [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome))
        );
        setNovoNome('');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error('Erro ao cadastrar especialidade:', err.message || err);
      setSaveError('Falha ao cadastrar. Verifique sua conexão e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletar = async (id: string, nome: string) => {
    if (!window.confirm(`Deseja realmente excluir a especialidade "${nome}"? Esta ação não pode ser desfeita.`)) return;

    setDeletingId(id);
    setDeleteError(null);

    try {
      const { error: deleteError } = await supabase
        .from('especialidades')
        .delete()
        .eq('id', id);

      if (deleteError) {
        // Foreign key violation — specialty is linked to cases
        if (deleteError.code === '23503') {
          setDeleteError(`Não é possível excluir "${nome}" pois ela está vinculada a casos clínicos ativos.`);
        } else {
          throw deleteError;
        }
        return;
      }

      // Remove from local state immediately
      setEspecialidades(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      console.error('Erro ao deletar especialidade:', err.message || err);
      setDeleteError('Falha ao excluir a especialidade. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-xs">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-indigo-600" />
          Gerenciamento de Especialidades
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Cadastre e gerencie as especialidades médicas disponíveis para interconsulta na plataforma.
        </p>
      </div>

      {/* Cadastro Form */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-xs">
        <h4 className="text-sm font-bold text-gray-800 mb-4">Nova Especialidade</h4>
        <form onSubmit={handleCadastrar} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              placeholder="Ex: Cardiologia, Neurologia, Pediatria..."
              disabled={saving}
              className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !novoNome.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white transition disabled:bg-indigo-300 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cadastrando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Cadastrar Especialidade
              </>
            )}
          </button>
        </form>

        {/* Feedback messages */}
        {saveSuccess && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Especialidade cadastrada com sucesso!
          </div>
        )}
        {saveError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveError}
          </div>
        )}
        {deleteError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {deleteError}
          </div>
        )}
      </div>

      {/* Especialidades Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-6 w-6" />
            {error}
            <button
              onClick={fetchEspecialidades}
              className="mt-1 text-xs font-semibold text-indigo-600 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : especialidades.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-gray-400">
            <Stethoscope className="h-8 w-8 opacity-30" />
            <p>Nenhuma especialidade cadastrada ainda.</p>
            <p className="text-xs">Use o formulário acima para adicionar a primeira.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Nome da Especialidade</th>
                <th className="px-6 py-4">Data de Cadastro</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {especialidades.map((esp, index) => (
                <tr key={esp.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {esp.nome}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {formatDate(esp.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeletar(esp.id, esp.nome)}
                      disabled={deletingId === esp.id}
                      title="Excluir especialidade"
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === esp.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Count footer */}
      {!loading && !error && especialidades.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {especialidades.length} especialidade{especialidades.length !== 1 ? 's' : ''} cadastrada{especialidades.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};
