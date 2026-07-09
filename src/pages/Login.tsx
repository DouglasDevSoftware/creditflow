import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Wallet, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Login() {
  const { user, loading: authLoading, signIn, signUp, resetPasswordForEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const switchMode = (next: 'login' | 'signup' | 'forgot') => {
    setMode(next);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'forgot') {
      const result = await resetPasswordForEmail(email);
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess('Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha.');
      return;
    }

    const result = mode === 'login'
      ? await signIn(email, password, remember)
      : await signUp(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === 'signup') {
      setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro (se habilitado no Supabase).');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="w-full max-w-md rounded-2xl border p-8 shadow-xl" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mb-4">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>CreditFlow</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Gestão de empréstimos</p>
        </div>

        {mode !== 'forgot' && (
          <div className="flex rounded-lg p-1 mb-6" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'login' ? 'bg-primary-600 text-white' : ''}`}
              style={mode !== 'login' ? { color: 'var(--text-secondary)' } : undefined}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'signup' ? 'bg-primary-600 text-white' : ''}`}
              style={mode !== 'signup' ? { color: 'var(--text-secondary)' } : undefined}
            >
              Criar conta
            </button>
          </div>
        )}

        {!isSupabaseConfigured && (
          <p className="text-sm text-warning-600 bg-warning-50 dark:bg-warning-950/30 px-3 py-2 rounded-lg mb-4">
            Supabase não configurado. Crie o arquivo <code>.env.local</code> com as chaves do projeto para usar o app.
          </p>
        )}

        {mode === 'forgot' && (
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Informe seu e-mail e enviaremos um link para você redefinir a senha.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                placeholder="seu@email.com"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="rounded"
                />
                Manter conectado
              </label>
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-danger-600 bg-danger-50 dark:bg-danger-950/30 px-3 py-2 rounded-lg">{error}</p>
          )}
          {success && (
            <p className="text-sm text-success-600 bg-success-50 dark:bg-success-950/30 px-3 py-2 rounded-lg">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' && 'Entrar'}
            {mode === 'signup' && 'Criar conta'}
            {mode === 'forgot' && 'Enviar link de redefinição'}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-xs font-medium text-center"
              style={{ color: 'var(--text-secondary)' }}
            >
              Voltar para o login
            </button>
          )}
        </form>

        {mode !== 'forgot' && (
          <p className="text-xs text-center mt-6" style={{ color: 'var(--text-tertiary)' }}>
            Cada conta possui dados isolados. Seus clientes e operações são privados.
          </p>
        )}
      </div>
    </div>
  );
}
