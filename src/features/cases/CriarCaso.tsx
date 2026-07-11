import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { CasoPrioridade } from '../../types';
import { UploadArquivos } from '../documents/UploadArquivos';
import type { UploadedFileMetadata } from '../documents/UploadArquivos';
import { AlertCircle, ChevronDown, UserPlus } from 'lucide-react';

interface EspecialidadeOption {
  id: string;
  nome: string;
}

interface PacienteOption {
  id: string;
  nome: string;
  cpf: string;
}

interface CriarCasoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onNavigateToPacientes?: () => void;
}

export const CriarCaso: React.FC<CriarCasoProps> = ({ onSuccess, onCancel, onNavigateToPacientes }) => {
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
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
  
  // Patients states
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [searchPatient, setSearchPatient] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
          const savedDraft = localStorage.getItem('criar_caso_draft');
          let draftSpecId = '';
          if (savedDraft) {
            try {
              const draft = JSON.parse(savedDraft);
              draftSpecId = draft.especialidadeId || '';
            } catch {}
          }
          setEspecialidadeId(draftSpecId || data[0].id);
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

  // Load draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('criar_caso_draft');
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.pacienteNome) setPacienteNome(draft.pacienteNome);
        if (draft.searchPatient) setSearchPatient(draft.searchPatient);
        if (draft.prioridade) setPrioridade(draft.prioridade);
        if (draft.historicoClinico) setHistoricoClinico(draft.historicoClinico);
        if (draft.condutaAtual) setCondutaAtual(draft.condutaAtual);
        if (draft.duvidaClinica) setDuvidaClinica(draft.duvidaClinica);
        if (draft.aceitouTermos !== undefined) setAceitouTermos(draft.aceitouTermos);
        if (draft.anexos) setAnexos(draft.anexos);
      }
    } catch (e) {
      console.error('Erro ao recuperar rascunho:', e);
    }
  }, []);

  // Auto-save draft on change
  useEffect(() => {
    const draft = {
      pacienteNome,
      searchPatient,
      especialidadeId,
      prioridade,
      historicoClinico,
      condutaAtual,
      duvidaClinica,
      aceitouTermos,
      anexos,
    };
    if (pacienteNome || searchPatient || historicoClinico || condutaAtual || duvidaClinica || aceitouTermos || (anexos && anexos.length > 0)) {
      localStorage.setItem('criar_caso_draft', JSON.stringify(draft));
    }
  }, [pacienteNome, searchPatient, especialidadeId, prioridade, historicoClinico, condutaAtual, duvidaClinica, aceitouTermos, anexos]);

  // Fetch patients
  useEffect(() => {
    const fetchPacientes = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('pacientes')
          .select('id, nome, cpf')
          .order('nome', { ascending: true });

        if (fetchError) throw fetchError;
        setPacientes(data || []);
      } catch (err: any) {
        console.error('Erro ao buscar pacientes:', err.message || err);
        setError('Não foi possível carregar os pacientes.');
      } finally {
        setLoadingPacientes(false);
      }
    };

    fetchPacientes();
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

    const patientExists = pacientes.some(p => p.nome.toLowerCase() === pacienteNome.toLowerCase());
    if (!patientExists) {
      setError('Por favor, selecione um paciente válido cadastrado no sistema.');
      return;
    }

    if (!aceitouTermos) {
      setError('Você deve aceitar a responsabilidade e conformidade legal para enviar o caso.');
      return;
    }

    // Check attachments (ready for future database column integration)
    if (anexos.length > 0) {
      console.log('Anexos selecionados para envio futuro:', anexos);
    }

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
            status: 'novo'
          }
        ]);

      if (insertError) throw insertError;

      localStorage.removeItem('criar_caso_draft');
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

  const filteredPacientes = pacientes.filter(p =>
    p.nome.toLowerCase().includes(searchPatient.toLowerCase()) ||
    (p.cpf && p.cpf.replace(/\D/g, '').includes(searchPatient.replace(/\D/g, '')))
  );

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
          <div className="relative" ref={dropdownRef}>
            <label htmlFor="paciente" className="block text-sm font-semibold text-gray-700 mb-1">
              Paciente *
            </label>
            {loadingPacientes ? (
              <div className="block w-full py-2.5 px-3 text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-300">
                Carregando pacientes...
              </div>
            ) : pacientes.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-700 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  Nenhum paciente cadastrado
                </div>
                <div>Você precisa cadastrar um paciente antes de solicitar uma interconsulta.</div>
                {onNavigateToPacientes && (
                  <button
                    type="button"
                    onClick={onNavigateToPacientes}
                    className="self-start mt-1 flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Cadastrar Paciente Agora
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <input
                    id="paciente"
                    type="text"
                    required
                    disabled={submitting}
                    value={searchPatient}
                    onChange={(e) => {
                      setSearchPatient(e.target.value);
                      setIsDropdownOpen(true);
                      const match = pacientes.find(p => p.nome.toLowerCase() === e.target.value.toLowerCase());
                      if (match) {
                        setPacienteNome(match.nome);
                      } else {
                        setPacienteNome('');
                      }
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Buscar ou selecionar paciente..."
                    className="block w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg text-sm">
                    {filteredPacientes.length === 0 ? (
                      <div className="px-4 py-2 text-gray-500 text-xs flex flex-col gap-2">
                        <span>Nenhum paciente encontrado.</span>
                        {onNavigateToPacientes && (
                          <button
                            type="button"
                            onClick={onNavigateToPacientes}
                            className="self-start flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 transition"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Cadastrar Novo Paciente
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredPacientes.map((pac) => (
                        <button
                          key={pac.id}
                          type="button"
                          onClick={() => {
                            setPacienteNome(pac.nome);
                            setSearchPatient(pac.nome);
                            setIsDropdownOpen(false);
                          }}
                          className="flex w-full flex-col px-4 py-2 text-left hover:bg-indigo-50 transition-colors"
                        >
                          <span className="font-semibold text-gray-900">{pac.nome}</span>
                          {pac.cpf && <span className="text-[10px] text-gray-500">CPF: {pac.cpf}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
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
              <option value="alta">Alta (Até 12h)</option>
              <option value="media">Média (Até 48h)</option>
              <option value="baixa">Baixa (Até 72h)</option>
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
          initialFiles={anexos}
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
