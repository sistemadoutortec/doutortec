import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface LoginProps {
  onSwitchToRegister?: () => void;
  onLoginSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onLoginSuccess }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message || 'Falha ao realizar login. Verifique suas credenciais.');
      } else {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro inesperado. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-[#28ffb2] to-[#0448af]"
    >
      <div 
        className="w-full max-w-md space-y-6 rounded-2xl p-8 shadow-2xl border border-white/10"
        style={{ backgroundColor: '#091151' }}
      >
        <div className="flex flex-col items-center gap-3">
          <img src="/Logo-Doutortec.png" alt="Doutortec" className="h-24 w-auto object-contain mb-1" />
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 border border-red-200">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-bold text-slate-200 mb-1.5">
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
                className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-gray-400 focus:outline-none sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                style={{ '--tw-ring-color': '#0ea5e9' } as React.CSSProperties}
                onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 2px rgba(14,165,233,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = '#475569'; e.target.style.boxShadow = 'none'; }}
                placeholder="exemplo@doutortec.com.br"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-200 mb-1.5">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-gray-400 focus:outline-none sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                style={{ '--tw-ring-color': '#0ea5e9' } as React.CSSProperties}
                onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 2px rgba(14,165,233,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = '#475569'; e.target.style.boxShadow = 'none'; }}
                placeholder="Digite sua senha"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
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
                  Autenticando...
                </span>
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </div>
        </form>

        {onSwitchToRegister && (
          <div className="text-center border-t border-slate-700/50 pt-4">
            <button
              type="button"
              onClick={onSwitchToRegister}
              disabled={loading}
              className="text-sm font-semibold transition disabled:opacity-50"
              style={{ color: '#94a3b8' }}
              onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
            >
              Ainda não tem conta? Cadastre-se
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

