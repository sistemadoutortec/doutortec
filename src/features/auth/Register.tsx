import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';
import { Eye, EyeOff } from 'lucide-react';

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
  const [crmCoren, setCrmCoren] = useState('');
  const [role, setRole] = useState<UserRole>('solicitante');
  const [municipio, setMunicipio] = useState('');
  const [instituicao, setInstituicao] = useState('');
  const [telefone, setTelefone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!nome.trim() || !email.trim() || !senha || !confirmarSenha || !cpf.trim() || !municipio.trim() || !instituicao.trim()) {
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

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setError('O CPF informado deve conter 11 dígitos.');
      return false;
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
      const { error: signUpError } = await signUp(email, senha, {
        nome,
        cpf: cpf.replace(/\D/g, ''),
        role,
        crm_coren: crmCoren.trim() || undefined,
        municipio,
        instituicao,
        telefone: telefone.trim() || undefined,
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg border border-gray-100 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">Cadastro Recebido!</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sua solicitação de cadastro foi enviada com sucesso e está **pendente de aprovação** pelo administrador.
          </p>
          <div className="mt-6">
            <button
              onClick={onSwitchToLogin}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Voltar para o Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-[#28ffb2] to-[#0448af] px-4 py-12 sm:px-6 lg:px-8">
      <div 
        className="w-full max-w-lg space-y-6 rounded-2xl p-8 shadow-2xl border border-white/10"
        style={{ backgroundColor: '#091151' }}
      >
        <div className="flex flex-col items-center gap-3">
          <img src="/Logo-Doutortec.png" alt="Doutortec" className="h-24 w-auto object-contain mb-1" />
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-tight text-white">
              Cadastro Doutortec
            </h2>
            <p className="mt-1.5 text-sm font-medium text-slate-300">
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
              <label htmlFor="name" className="block text-sm font-medium text-slate-200 mb-1">
                Nome Completo *
              </label>
              <input
                id="name"
                type="text"
                required
                disabled={loading}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-gray-400 focus:outline-none sm:text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
                placeholder="Insira seu nome completo"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-slate-200 mb-1">
                E-mail Profissional *
              </label>
              <input
                id="reg-email"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-gray-400 focus:outline-none sm:text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
                placeholder="nome@email.com"
              />
            </div>

            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-slate-200 mb-1">
                CPF *
              </label>
              <input
                id="cpf"
                type="text"
                required
                disabled={loading}
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-gray-400 focus:outline-none sm:text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-200 mb-1">
                Perfil de Acesso *
              </label>
              <select
                id="role"
                disabled={loading}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 pl-3 pr-10 py-2 text-white focus:outline-none sm:text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
              >
                <option value="solicitante" className="bg-[#091151] text-white">Solicitante (Clínico/Enfermeiro/Generalista)</option>
                <option value="especialista" className="bg-[#091151] text-white">Especialista (Médico Especialista)</option>
              </select>
            </div>

            <div>
              <label htmlFor="crm_coren" className="block text-sm font-medium text-slate-200 mb-1">
                Registro Profissional (CRM/COREN)
              </label>
              <input
                id="crm_coren"
                type="text"
                disabled={loading}
                value={crmCoren}
                onChange={(e) => setCrmCoren(e.target.value)}
                className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-gray-400 focus:outline-none sm:text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
                placeholder="Ex: CRM-SP 123456"
              />
            </div>

            <div>
              <label htmlFor="instituicao" className="block text-sm font-medium text-slate-200 mb-1 whitespace-nowrap">
                Instituição / Unidade de Saúde *
              </label>
              <input
                id="instituicao"
                type="text"
                required
                disabled={loading}
                value={instituicao}
                onChange={(e) => setInstituicao(e.target.value)}
                className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-gray-400 focus:outline-none sm:text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
                placeholder="Hospital, UBS ou Clínica"
              />
            </div>

            <div>
              <label htmlFor="municipio" className="block text-sm font-medium text-slate-200 mb-1">
                Município *
              </label>
              <input
                id="municipio"
                type="text"
                required
                disabled={loading}
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-gray-400 focus:outline-none sm:text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
                placeholder="Sua cidade"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="telefone" className="block text-sm font-medium text-slate-200 mb-1">
                Telefone de Contato
              </label>
              <input
                id="telefone"
                type="text"
                disabled={loading}
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-gray-400 focus:outline-none sm:text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-slate-200 mb-1">
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
                  className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 pl-3 pr-10 py-2 text-white placeholder-gray-400 focus:outline-none sm:text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
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
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-200 mb-1">
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
                  className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 pl-3 pr-10 py-2 text-white placeholder-gray-400 focus:outline-none sm:text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
                  placeholder="Repita sua senha"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
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
              className="group relative flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#0ea5e9' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#0284c7'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0ea5e9'; }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
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
          <div className="text-center mt-4 border-t border-slate-700/50 pt-4">
            <button
              type="button"
              onClick={onSwitchToLogin}
              disabled={loading}
              className="text-sm font-semibold transition disabled:opacity-50"
              style={{ color: '#94a3b8' }}
              onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
            >
              Já possui uma conta? Faça login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
