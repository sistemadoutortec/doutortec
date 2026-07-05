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
      className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
      style={{ background: 'linear-gradient(135deg, #0b1626 0%, #0b316d 70%, #002157 100%)' }}
    >
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-2xl border border-white/10">
        <div className="flex flex-col items-center gap-3">
          <img src="/LogoAzul.png" alt="Doutortec" className="h-16 w-auto object-contain" />
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-tight" style={{ color: '#002157' }}>
              Doutortec
            </h2>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 border border-red-200">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-bold text-gray-700 mb-1.5">
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
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                style={{ '--tw-ring-color': '#0b316d' } as React.CSSProperties}
                onFocus={e => { e.target.style.borderColor = '#0b316d'; e.target.style.boxShadow = '0 0 0 2px rgba(11,49,109,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                placeholder="exemplo@doutortec.com.br"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-1.5">
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
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                onFocus={e => { e.target.style.borderColor = '#0b316d'; e.target.style.boxShadow = '0 0 0 2px rgba(11,49,109,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                placeholder="Digite sua senha"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#002157' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#0b316d'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#002157'; }}
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
          <div className="text-center border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onSwitchToRegister}
              disabled={loading}
              className="text-sm font-semibold transition disabled:opacity-50"
              style={{ color: '#002157' }}
              onMouseEnter={e => e.currentTarget.style.color = '#0b316d'}
              onMouseLeave={e => e.currentTarget.style.color = '#002157'}
            >
              Ainda não tem conta? Cadastre-se
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

