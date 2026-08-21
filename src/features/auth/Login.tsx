import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onSwitchToRegister?: () => void;
  onLoginSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onLoginSuccess }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // States for password recovery
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!email.trim() || !password) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um e-mail válido.');
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setLoading(false);
        const rawMsg = typeof signInError === 'string'
          ? signInError
          : (signInError.message && typeof signInError.message === 'string')
            ? signInError.message
            : String(signInError.error_description || signInError.error || '');

        if (rawMsg.includes('Invalid login credentials')) {
          setError('E-mail ou senha incorretos. Por favor, tente novamente.');
        } else if (rawMsg.includes('Email not confirmed')) {
          setError('E-mail não confirmado no Supabase. Confirme o usuário no painel do Supabase.');
        } else if (!rawMsg || rawMsg === '{}' || rawMsg === '[object Object]') {
          setError('E-mail ou senha incorretos. Verifique suas credenciais.');
        } else {
          setError(rawMsg);
        }
      } else {
        if (password === 'Mudar@123') {
          localStorage.setItem('password_is_default', 'true');
        } else {
          localStorage.removeItem('password_is_default');
        }
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (err: any) {
      setLoading(false);
      console.error(err);
      const rawMsg = err?.message || String(err || '');
      if (rawMsg.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos. Por favor, tente novamente.');
      } else {
        setError('E-mail ou senha incorretos. Tente novamente mais tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setRecoveryError(null);
    setRecoverySuccess(null);

    try {
      if (!recoveryEmail.trim()) {
        throw new Error('Por favor, informe seu e-mail.');
      }
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
        redirectTo: `${window.location.origin}/atualizar-senha`,
      });

      if (recoveryError) throw recoveryError;

      setRecoverySuccess('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.');
      setRecoveryEmail('');
    } catch (err: any) {
      console.error(err);
      setRecoveryError(err.message || 'Erro ao enviar e-mail de recuperação. Verifique o endereço digitado.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center overflow-y-auto px-4 py-12 sm:px-6 lg:px-8"
      style={{ background: 'radial-gradient(circle, #28ffb2 0%, #0448af 100%)' }}
    >
      <div 
        className="w-full max-w-md space-y-6 bg-white shadow-2xl rounded-2xl p-8"
      >
        <div className="text-center">
          <img 
            src="/Logo-Doutortec-Original.png" 
            alt="Doutortec" 
            className="w-60 md:w-64 max-w-[275px] h-auto object-contain mx-auto mb-8 contrast-125 brightness-95" 
          />
        </div>

        {showRecovery ? (
          <form className="space-y-5" onSubmit={handleRecoverySubmit}>
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Recuperar Senha</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Digite seu e-mail cadastrado e enviaremos um link de recuperação.
              </p>
            </div>

            {recoveryError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {recoveryError}
              </div>
            )}
            {recoverySuccess && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-250 p-3 text-xs text-emerald-700">
                {recoverySuccess}
              </div>
            )}

            <div>
              <label htmlFor="recovery-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Endereço de e-mail
              </label>
              <input
                id="recovery-email"
                type="email"
                required
                disabled={recoveryLoading}
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="exemplo@doutortec.com.br"
              />
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={recoveryLoading || !!recoverySuccess}
                className="w-full text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 font-medium rounded-lg text-sm px-5 py-3 text-center shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {recoveryLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRecovery(false);
                  setRecoveryError(null);
                  setRecoverySuccess(null);
                }}
                className="flex w-full justify-center rounded-lg border border-slate-200 bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Voltar ao Login
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Endereço de e-mail
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 transition disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="exemplo@doutortec.com.br"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecovery(true);
                      setError(null);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 pr-10 transition disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder="Digite sua senha"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-800"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
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
                    Autenticando...
                  </span>
                ) : (
                  'Entrar no Sistema'
                )}
              </button>
            </div>
          </form>
        )}

        {onSwitchToRegister && (
          <div className="text-center border-t border-slate-100 pt-4 mt-6">
            <button
              type="button"
              onClick={onSwitchToRegister}
              disabled={loading}
              className="text-sm text-slate-500 transition disabled:opacity-50"
            >
              Ainda não tem conta? <span className="text-blue-600 font-semibold hover:underline">Cadastre-se</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

