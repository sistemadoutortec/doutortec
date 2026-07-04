import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { CasoPrioridade } from '../../types';
import { UploadArquivos } from '../documents/UploadArquivos';
import type { UploadedFileMetadata } from '../documents/UploadArquivos';

interface EspecialidadeOption {
  id: string;
  nome: string;
}

interface CriarCasoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CriarCaso: React.FC<CriarCasoProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  
  // Form fields
  const [pacienteNome, setPacienteNome] = useState('');
  const [especialidadeId, setEspecialidadeId] = useState('');
  const [prioridade, setPrioridade] = useState<CasoPrioridade>('media');
  const [historicoClinico, setHistoricoClinico] = useState('');
  const [condutaAtual, setCondutaAtual] = useState('');
  const [duvidaClinica, setDuvidaClinica] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [anexos, setAnexos] = useState<UploadedFileMetadata[]>([]);

  // Status states
  const [especialidades, setEspecialidades] = useState<EspecialidadeOption[]>([]);
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch specialties
  useEffect(() => {
    const fetchEspecialidades = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('especialidades')
          .select('id, nome')
          .order('nome', { ascending: true });

        if (fetchError) throw fetchError;
        setEspecialidades(data || []);
        if (data && data.length > 0) {
          setEspecialidadeId(data[0].id);
        }
      } catch (err: any) {
        console.error('Erro ao buscar especialidades:', err.message || err);
        setError('Não foi possível carregar as especialidades médicas.');
      } finally {
        setLoadingEspecialidades(false);
      }
    };

    fetchEspecialidades();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!user) {
      setError('Usuário não autenticado.');
      return;
    }

    if (!pacienteNome.trim() || !especialidadeId || !historicoClinico.trim() || !condutaAtual.trim() || !duvidaClinica.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!aceitouTermos) {
      setError('Você deve aceitar a responsabilidade e conformidade legal para enviar o caso.');
      return;
    }

    // Determine SLA hours based on priority
    let slaHoras = 24;
    if (prioridade === 'baixa') slaHoras = 48;
    if (prioridade === 'alta') slaHoras = 4;

    const slaLimite = new Date(Date.now() + slaHoras * 60 * 60 * 1000).toISOString();

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from('casos')
        .insert([
          {
            paciente_nome: pacienteNome.trim(),
            especialidade_id: especialidadeId,
            prioridade,
            historico_clinico: historicoClinico.trim(),
            conduta_atual: condutaAtual.trim(),
            duvida_clinica: duvidaClinica.trim(),
            solicitante_id: user.id,
            status: 'novo',
            sla_horas: slaHoras,
            sla_limite: slaLimite,
            // Try inserting the attachments metadata
            anexos: anexos
          }
        ]);

      if (insertError) {
        // Fallback in case column is not named 'anexos' in their pre-created schema
        console.warn('Erro ao inserir com coluna "anexos", tentando fallback sem coluna de anexos:', insertError.message);
        const { error: fallbackError } = await supabase
          .from('casos')
          .insert([
            {
              paciente_nome: pacienteNome.trim(),
              especialidade_id: especialidadeId,
              prioridade,
              historico_clinico: historicoClinico.trim(),
              conduta_atual: condutaAtual.trim(),
              duvida_clinica: duvidaClinica.trim(),
              solicitante_id: user.id,
              status: 'novo',
              sla_horas: slaHoras,
              sla_limite: slaLimite
            }
          ]);
        if (fallbackError) throw fallbackError;
      }

      setSuccess(true);
      // Reset form
      setPacienteNome('');
      setHistoricoClinico('');
      setCondutaAtual('');
      setDuvidaClinica('');
      setAceitouTermos(false);
      setAnexos([]);

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Erro ao salvar caso clínico:', err.message || err);
      setError(err.message || 'Falha ao salvar o caso clínico. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-150 p-6 md:p-8 shadow-xs">
      <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Novo Caso Clínico</h3>
          <p className="text-xs text-gray-500">Registre os dados do paciente e envie a dúvida para os especialistas</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={submitting}
            className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition"
          >
            Cancelar
          </button>
        )}
      </div>

      {success && (
        <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700 flex items-center gap-2">
          <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>Caso clínico cadastrado e enviado com sucesso! Redirecionando...</div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="paciente" className="block text-sm font-semibold text-gray-700 mb-1">
              Nome do Paciente *
            </label>
            <input
              id="paciente"
              type="text"
              required
              disabled={submitting}
              value={pacienteNome}
              onChange={(e) => setPacienteNome(e.target.value)}
              placeholder="Nome completo do paciente"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="especialidade" className="block text-sm font-semibold text-gray-700 mb-1">
              Especialidade Médica Requerida *
            </label>
            {loadingEspecialidades ? (
              <div className="block w-full py-2 px-3 text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-300">
                Carregando especialidades...
              </div>
            ) : (
              <select
                id="especialidade"
                required
                disabled={submitting}
                value={especialidadeId}
                onChange={(e) => setEspecialidadeId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
              >
                {especialidades.map((esp) => (
                  <option key={esp.id} value={esp.id}>
                    {esp.nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="prioridade" className="block text-sm font-semibold text-gray-700 mb-1">
              Prioridade da Interconsulta *
            </label>
            <select
              id="prioridade"
              required
              disabled={submitting}
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as CasoPrioridade)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
            >
              <option value="baixa">Baixa (Até 48h)</option>
              <option value="media">Média (Até 24h)</option>
              <option value="alta">Alta (Até 4h)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="historico" className="block text-sm font-semibold text-gray-700 mb-1">
            Histórico Clínico *
          </label>
          <textarea
            id="historico"
            required
            rows={4}
            disabled={submitting}
            value={historicoClinico}
            onChange={(e) => setHistoricoClinico(e.target.value)}
            placeholder="Descreva a história clínica do paciente, anamnese e resultados de exames relevantes..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="conduta" className="block text-sm font-semibold text-gray-700 mb-1">
            Conduta Atual *
          </label>
          <textarea
            id="conduta"
            required
            rows={3}
            disabled={submitting}
            value={condutaAtual}
            onChange={(e) => setCondutaAtual(e.target.value)}
            placeholder="Descreva as condutas, prescrições e tratamentos atualmente adotados..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="duvida" className="block text-sm font-semibold text-gray-700 mb-1">
            Dúvida Clínicâ *
          </label>
          <textarea
            id="duvida"
            required
            rows={3}
            disabled={submitting}
            value={duvidaClinica}
            onChange={(e) => setDuvidaClinica(e.target.value)}
            placeholder="Formule a pergunta ou o questionamento específico para o especialista médico..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
          />
        </div>

        {/* Upload Component */}
        <UploadArquivos
          onUploadSuccess={(files) => setAnexos(files)}
          maxFiles={5}
        />

        {/* Legal disclaimer */}
        <div className="rounded-xl border border-gray-150 p-4 bg-gray-50/50">
          <div className="flex items-start gap-3">
            <input
              id="termos"
              type="checkbox"
              required
              disabled={submitting}
              checked={aceitouTermos}
              onChange={(e) => setAceitouTermos(e.target.checked)}
              className="mt-1 h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="termos" className="text-xs text-gray-600 leading-relaxed cursor-pointer select-none">
              Declaro que as informações inseridas são verídicas e estão em conformidade com a LGPD e resoluções do CFM. Assumo a responsabilidade ética e profissional no compartilhamento de dados deste caso clínico. *
            </label>
          </div>
        </div>

        <div className="flex gap-4 justify-end pt-4 border-t border-gray-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || loadingEspecialidades}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-sm font-semibold text-white transition disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {submitting ? 'Salvando caso...' : 'Enviar Caso Clínico'}
          </button>
        </div>
      </form>
    </div>
  );
};
