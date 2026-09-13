import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import AuthLayout from '../components/AuthLayout';

const INPUT_CLASS =
  'w-full pl-10 pr-3 py-2.5 rounded-[10px] border text-sm outline-none transition-colors focus:border-[rgba(0,213,196,0.5)] focus:ring-2 focus:ring-[rgba(0,213,196,0.15)]';

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
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
    <AuthLayout>
      <div className="w-full max-w-[340px]">
        {/* Mobile-only brand header */}
        <div className="flex lg:hidden flex-col items-center mb-6">
          <img src="/creditflow-icon.png" alt="" width={48} height={48} className="logo-badge mb-3" />
          <span className="brand-wordmark text-white text-[18px]">
            Credit<span className="brand-flow">Flow</span>
          </span>
          <p className="text-[11px] font-medium uppercase tracking-[1px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Empréstimos &amp; Finanças Pessoais</p>
        </div>

        <div
          className="auth-card w-full rounded-[18px] p-6"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          }}
        >
          {/* Desktop-only brand mark — the mobile header above already covers small screens */}
          <div className="hidden lg:flex items-center gap-2 mb-5">
            <img src="/creditflow-icon.png" alt="" width={30} height={30} className="logo-badge shrink-0" />
            <span className="brand-wordmark text-white text-[14px]">
              Credit<span className="brand-flow">Flow</span>
            </span>
          </div>

          <div className="mb-5">
            <h1 className="text-[18px] font-extrabold" style={{ color: 'var(--text-primary)' }}>
              {mode === 'login' && 'Bem-vindo de volta'}
              {mode === 'signup' && 'Criar sua conta'}
              {mode === 'forgot' && 'Redefinir senha'}
            </h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {mode === 'login' && 'Entre para acompanhar suas operações e limites.'}
              {mode === 'signup' && 'Leva menos de um minuto para começar.'}
              {mode === 'forgot' && 'Informe seu e-mail e enviaremos um link de redefinição.'}
            </p>
          </div>

          {mode !== 'forgot' && (
            <div className="flex rounded-[12px] p-1 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="flex-1 py-2 text-sm font-medium rounded-[9px] transition-all duration-200"
                style={mode === 'login'
                  ? { background: 'rgba(0,213,196,0.12)', border: '1px solid rgba(0,213,196,0.28)', color: 'var(--accent)' }
                  : { border: '1px solid transparent', color: 'var(--text-secondary)' }}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="flex-1 py-2 text-sm font-medium rounded-[9px] transition-all duration-200"
                style={mode === 'signup'
                  ? { background: 'rgba(0,213,196,0.12)', border: '1px solid rgba(0,213,196,0.28)', color: 'var(--accent)' }
                  : { border: '1px solid transparent', color: 'var(--text-secondary)' }}
              >
                Criar conta
              </button>
            </div>
          )}

          {!isSupabaseConfigured && (
            <p
              className="text-[12px] px-3 py-2 rounded-[10px] mb-4"
              style={{ color: '#fbbf24', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              Supabase não configurado. Crie o arquivo <code>.env.local</code> com as chaves do projeto para usar o app.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={INPUT_CLASS}
                  style={{ borderColor: 'var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)' }}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`${INPUT_CLASS} pr-10`}
                    style={{ borderColor: 'var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)' }}
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
                    className="rounded accent-[var(--accent)]"
                  />
                  Manter conectado
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs font-medium hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {error && (
              <p className="text-[13px] px-3 py-2 rounded-[10px]" style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}
            {success && (
              <p className="text-[13px] px-3 py-2 rounded-[10px]" style={{ color: '#34d399', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] font-semibold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group"
              style={{
                background: 'linear-gradient(135deg, #00d5c4, #00876e)',
                boxShadow: '0 0 0 rgba(0,213,196,0)',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 22px rgba(0,213,196,0.35)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 rgba(0,213,196,0)'; }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {!loading && mode === 'login' && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
              {mode === 'login' && 'Entrar'}
              {mode === 'signup' && 'Criar conta'}
              {mode === 'forgot' && 'Enviar link de redefinição'}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full text-xs font-medium text-center hover:underline"
                style={{ color: 'var(--text-secondary)' }}
              >
                Voltar para o login
              </button>
            )}
          </form>

          {mode !== 'forgot' && (
            <p className="text-[11px] text-center mt-6" style={{ color: 'var(--text-muted)' }}>
              Cada conta possui dados isolados. Seus clientes e operações são privados.
            </p>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
