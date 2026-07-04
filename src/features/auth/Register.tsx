import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8 rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-gray-900">
            Cadastro Doutortec
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Solicite acesso à plataforma de teleinterconsulta
          </p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo *
              </label>
              <input
                id="name"
                type="text"
                required
                disabled={loading}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 sm:text-sm"
                placeholder="Insira seu nome completo"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail Profissional *
              </label>
              <input
                id="reg-email"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 sm:text-sm"
                placeholder="nome@email.com"
              />
            </div>

            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
                CPF *
              </label>
              <input
                id="cpf"
                type="text"
                required
                disabled={loading}
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 sm:text-sm"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Perfil de Acesso *
              </label>
              <select
                id="role"
                disabled={loading}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 sm:text-sm"
              >
                <option value="solicitante">Solicitante (Clínico/Enfermeiro/Generalista)</option>
                <option value="especialista">Especialista (Médico Especialista)</option>
              </select>
            </div>

            <div>
              <label htmlFor="crm_coren" className="block text-sm font-medium text-gray-700 mb-1">
                Registro Profissional (CRM/COREN)
              </label>
              <input
                id="crm_coren"
                type="text"
                disabled={loading}
                value={crmCoren}
                onChange={(e) => setCrmCoren(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 sm:text-sm"
                placeholder="Ex: CRM-SP 123456"
              />
            </div>

            <div>
              <label htmlFor="instituicao" className="block text-sm font-medium text-gray-700 mb-1">
                Instituição / Unidade de Saúde *
              </label>
              <input
                id="instituicao"
                type="text"
                required
                disabled={loading}
                value={instituicao}
                onChange={(e) => setInstituicao(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 sm:text-sm"
                placeholder="Hospital, UBS ou Clínica"
              />
            </div>

            <div>
              <label htmlFor="municipio" className="block text-sm font-medium text-gray-700 mb-1">
                Município *
              </label>
              <input
                id="municipio"
                type="text"
                required
                disabled={loading}
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 sm:text-sm"
                placeholder="Sua cidade"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                Telefone de Contato
              </label>
              <input
                id="telefone"
                type="text"
                disabled={loading}
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 sm:text-sm"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
                Senha *
              </label>
              <input
                id="reg-password"
                type="password"
                required
                disabled={loading}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 sm:text-sm"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Senha *
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                disabled={loading}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 sm:text-sm"
                placeholder="Repita sua senha"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 disabled:cursor-not-allowed"
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
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onSwitchToLogin}
              disabled={loading}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:text-indigo-400"
            >
              Já possui uma conta? Faça login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
