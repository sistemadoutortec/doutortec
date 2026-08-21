import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RegisterProps {
  onSwitchToLogin?: () => void;
  onRegisterSuccess?: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin, onRegisterSuccess }) => {
  const { signUp } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [confirmarShowSenha, setConfirmarShowSenha] = useState(false);
  const [cpf, setCpf] = useState('');
  const [registroNumero, setRegistroNumero] = useState('');
  const [uf, setUf] = useState('');
  const [role, setRole] = useState<UserRole>('solicitante');
  const [rqe, setRqe] = useState('');
  const [especialidades, setEspecialidades] = useState<{ id: string; nome: string }[]>([]);
  const [selectedEspecialidade, setSelectedEspecialidade] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [instituicao, setInstituicao] = useState('');
  const [telefone, setTelefone] = useState('');

  // Format telephone number as (99) 99999-9999 or (99) 9999-9999
  const formatTelefone = (value: string) => {
    const clean = value.replace(/\D/g, '');
    const numbers = clean.slice(0, 11);
    if (numbers.length <= 2) {
      return numbers;
    }
    if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    }
    if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatTelefone(e.target.value));
  };

  // Fetch specialties for specialist role
  useEffect(() => {
    const fetchEspecialidades = async () => {
      try {
        const { data, error } = await supabase
          .from('especialidades')
          .select('id, nome')
          .order('nome');
        if (error) throw error;
        setEspecialidades(data || []);
      } catch (err) {
        console.error('Erro ao carregar especialidades:', err);
      }
    };
    fetchEspecialidades();
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!nome.trim() || !email.trim() || !senha || !confirmarSenha || !cpf.trim() || !municipio.trim() || !telefone.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios (*).');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um e-mail válido.');
      return false;
    }

    if (senha !== confirmarSenha) {
      setError('As senhas digitadas não coincidem.');
      return false;
    }

    if (senha.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return false;
    }

    // CPF validation
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setError('O CPF informado deve conter 11 dígitos.');
      return false;
    }

    if (/^(\d)\1{10}$/.test(cleanCpf)) {
      setError('O CPF informado é inválido.');
      return false;
    }

    let sum = 0;
    let rest;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(cleanCpf.substring(9, 10))) {
      setError('O CPF informado é inválido.');
      return false;
    }

    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(cleanCpf.substring(10, 11))) {
      setError('O CPF informado é inválido.');
      return false;
    }

    // Telephone validation (validates DDD and number - 10 or 11 digits)
    const cleanPhone = telefone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      setError('Por favor, insira um telefone de contato válido com DDD (10 ou 11 dígitos).');
      return false;
    }

    // Validate UF selection if registration number is filled
    if (registroNumero.trim() && !uf) {
      setError('Por favor, selecione a UF do seu registro profissional.');
      return false;
    }

    // Specialist validation
    if (role === 'especialista') {
      if (!rqe.trim()) {
        setError('Por favor, informe seu Registro de Qualificação de Especialista (RQE).');
        return false;
      }
      if (!selectedEspecialidade) {
        setError('Por favor, selecione sua Especialidade Médica.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) return;

    setLoading(true);
    try {
      // Find specialty name if specialist
      let categoriaProfissional: string | undefined = undefined;
      if (role === 'especialista' && selectedEspecialidade) {
        const found = especialidades.find(esp => esp.id === selectedEspecialidade);
        if (found) {
          categoriaProfissional = found.nome;
        }
      }

      // Format CRM / COREN with UF if provided
      const formattedCrmCoren = registroNumero.trim() 
        ? `${registroNumero.trim()} / ${uf}` 
        : undefined;

      const { error: signUpError } = await signUp(email, senha, {
        nome,
        cpf: cpf.replace(/\D/g, ''),
        role,
        crm_coren: formattedCrmCoren,
        municipio,
        instituicao: instituicao.trim() || 'Não especificado',
        telefone: telefone.trim(),
        rqe: role === 'especialista' ? rqe.trim() : undefined,
        categoria_profissional: categoriaProfissional,
      });

      if (signUpError) {
        setError(signUpError.message || 'Falha ao realizar cadastro. Tente novamente.');
      } else {
        setSuccess(true);
        if (onRegisterSuccess) {
          onRegisterSuccess();
        }
      }
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div 
        className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
        style={{ background: 'radial-gradient(circle, #28ffb2 0%, #0448af 100%)' }}
      >
        <div className="w-full max-w-lg space-y-6 bg-white shadow-2xl rounded-2xl p-8 text-center">
          <div className="text-center mb-4">
            <img 
              src="/Logo-Doutortec-Original.png" 
              alt="Doutortec" 
              className="mx-auto h-12 w-auto mb-3"
            />
          </div>
          
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Cadastro Recebido!</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Sua solicitação de cadastro foi enviada com sucesso e está <strong className="text-indigo-600">pendente de aprovação</strong> pelo administrador.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onSwitchToLogin}
              className="w-full text-white font-bold rounded-xl text-xs px-5 py-3.5 text-center shadow-md transition-all cursor-pointer"
              style={{ backgroundColor: '#091151' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#000530'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#091151'}
            >
              Voltar para o Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
      style={{ background: 'radial-gradient(circle, #28ffb2 0%, #0448af 100%)' }}
    >
      <div 
        className="w-full max-w-lg space-y-6 bg-white shadow-2xl rounded-2xl p-8"
      >
         <div className="text-center">
           <img 
             src="/Logo-Doutortec-Original.png" 
             alt="Doutortec" 
             className="w-60 md:w-64 max-w-[275px] h-auto object-contain mx-auto mb-8 contrast-125 brightness-95" 
           />
           <div>
             <h2 className="text-2xl font-black tracking-tight text-slate-900">
               Cadastro Doutortec
             </h2>
             <p className="mt-1.5 text-sm font-medium text-slate-500">
               Solicite acesso à plataforma de teleinterconsulta
             </p>
           </div>
         </div>
         <form className="space-y-4" onSubmit={handleSubmit}>
           {error && (
             <div className="rounded-md bg-red-50 p-4 border border-red-200">
               <div className="flex">
                 <div className="text-sm text-red-700">{error}</div>
               </div>
             </div>
           )}

           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
             <div className="sm:col-span-2">
               <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                 Nome Completo *
               </label>
               <input
                 id="name"
                 type="text"
                 required
                 disabled={loading}
                 value={nome}
                 onChange={(e) => setNome(e.target.value)}
                 className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
                 placeholder="Insira seu nome completo"
               />
             </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                E-mail Profissional *
              </label>
              <input
                id="reg-email"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="nome@email.com"
              />
            </div>

            <div>
              <label htmlFor="cpf" className="block text-sm font-semibold text-slate-700 mb-1.5">
                CPF *
              </label>
              <input
                id="cpf"
                type="text"
                required
                disabled={loading}
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
               <label htmlFor="role" className="block text-sm font-semibold text-slate-700 mb-1.5">
                 Perfil de Acesso *
               </label>
               <select
                 id="role"
                 disabled={loading}
                 value={role}
                 onChange={(e) => setRole(e.target.value as UserRole)}
                 className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
               >
                 <option value="solicitante" className="bg-white text-slate-900">Clínico(a)</option>
                 <option value="especialista" className="bg-white text-slate-900">Especialista (Médico de Referência)</option>
               </select>
             </div>

             <div className="sm:col-span-2">
               <div className="grid grid-cols-3 gap-4">
                 <div className="col-span-2">
                   <label htmlFor="registro_numero" className="block text-sm font-semibold text-slate-700 mb-1.5">
                     Número do Registro (CRM/COREN)
                   </label>
                   <input
                     id="registro_numero"
                     type="text"
                     disabled={loading}
                     value={registroNumero}
                     onChange={(e) => setRegistroNumero(e.target.value)}
                     className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
                     placeholder="Ex: 123456"
                   />
                 </div>
                 <div>
                   <label htmlFor="uf" className="block text-sm font-semibold text-slate-700 mb-1.5">
                     UF
                   </label>
                   <select
                     id="uf"
                     disabled={loading}
                     value={uf}
                     onChange={(e) => setUf(e.target.value)}
                     className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
                   >
                     <option value="" className="bg-white text-slate-450">UF</option>
                     {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(state => (
                       <option key={state} value={state} className="bg-white text-slate-900">{state}</option>
                     ))}
                   </select>
                 </div>
               </div>
             </div>

             {role === 'especialista' && (
               <>
                 <div>
                   <label htmlFor="rqe" className="block text-sm font-semibold text-slate-700 mb-1.5">
                     RQE (Registro de Qualificação de Especialista) *
                   </label>
                   <input
                     id="rqe"
                     type="text"
                     required
                     disabled={loading}
                     value={rqe}
                     onChange={(e) => setRqe(e.target.value)}
                     className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
                     placeholder="Ex: 12345"
                   />
                 </div>

                 <div>
                   <label htmlFor="especialidade" className="block text-sm font-semibold text-slate-700 mb-1.5">
                     Especialidade Médica *
                   </label>
                   <select
                     id="especialidade"
                     required
                     disabled={loading}
                     value={selectedEspecialidade}
                     onChange={(e) => setSelectedEspecialidade(e.target.value)}
                     className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
                   >
                     <option value="" className="bg-white text-slate-900">Selecione uma especialidade...</option>
                     {especialidades.map(esp => (
                       <option key={esp.id} value={esp.id} className="bg-white text-slate-900">
                         {esp.nome}
                       </option>
                     ))}
                   </select>
                 </div>
               </>
             )}

             <div>
               <label htmlFor="instituicao" className="block text-sm font-semibold text-slate-700 mb-1.5 whitespace-nowrap">
                 Instituição / Unidade de Saúde
               </label>
               <input
                 id="instituicao"
                 type="text"
                 disabled={loading}
                 value={instituicao}
                 onChange={(e) => setInstituicao(e.target.value)}
                 className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
                 placeholder="Hospital, UBS ou Clínica (Opcional)"
               />
             </div>

             <div>
               <label htmlFor="municipio" className="block text-sm font-semibold text-slate-700 mb-1.5">
                 Município *
               </label>
               <input
                 id="municipio"
                 type="text"
                 required
                 disabled={loading}
                 value={municipio}
                 onChange={(e) => setMunicipio(e.target.value)}
                 className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
                 placeholder="Sua cidade"
               />
             </div>

             <div className="sm:col-span-2">
               <label htmlFor="telefone" className="block text-sm font-semibold text-slate-700 mb-1.5">
                 Telefone de Contato *
               </label>
               <input
                 id="telefone"
                 type="text"
                 required
                 disabled={loading}
                 value={telefone}
                 onChange={handleTelefoneChange}
                 className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
                 placeholder="(00) 00000-0000"
               />
             </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Senha *
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showSenha ? "text" : "password"}
                  required
                  disabled={loading}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 pr-10 transition disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-800"
                  onClick={() => setShowSenha(!showSenha)}
                >
                  {showSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Confirmar Senha *
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={confirmarShowSenha ? "text" : "password"}
                  required
                  disabled={loading}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 pr-10 transition disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="Repita sua senha"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-800"
                  onClick={() => setConfirmarShowSenha(!confirmarShowSenha)}
                >
                  {confirmarShowSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 font-medium rounded-lg text-sm px-5 py-3 text-center shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processando cadastro...
                </span>
              ) : (
                'Solicitar Cadastro'
              )}
            </button>
          </div>
        </form>

        {onSwitchToLogin && (
          <div className="text-center mt-6 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onSwitchToLogin}
              disabled={loading}
              className="text-sm text-slate-500 transition disabled:opacity-50"
            >
              Já possui uma conta? <span className="text-blue-600 font-semibold hover:underline">Faça login</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
