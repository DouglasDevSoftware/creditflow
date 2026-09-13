import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import AuthLayout from '../components/AuthLayout';

const INPUT_CLASS =
  'w-full pl-10 pr-10 py-2.5 rounded-[10px] border text-sm outline-none transition-colors focus:border-[rgba(0,213,196,0.5)] focus:ring-2 focus:ring-[rgba(0,213,196,0.15)]';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    showToast('Senha redefinida com sucesso!');
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-[400px]">
        {/* Mobile-only brand header */}
        <div className="flex lg:hidden flex-col items-center mb-6">
          <img src="/creditflow-icon.png" alt="" width={52} height={52} className="logo-badge mb-3" />
          <span className="brand-wordmark text-white text-[19px]">
            Credit<span className="brand-flow">Flow</span>
          </span>
        </div>

        <div
          className="auth-card w-full rounded-[20px] p-7 sm:p-8"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          }}
        >
          <div className="flex flex-col items-center mb-7 text-center">
            <div
              className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-3"
              style={{ background: 'rgba(0,213,196,0.10)', border: '1px solid rgba(0,213,196,0.25)', color: 'var(--accent)' }}
            >
              <KeyRound className="w-5 h-5" />
            </div>
            <h1 className="text-[20px] font-extrabold" style={{ color: 'var(--text-primary)' }}>Redefinir senha</h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Escolha uma nova senha para sua conta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nova senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={INPUT_CLASS}
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

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirmar nova senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={INPUT_CLASS}
                  style={{ borderColor: 'var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)' }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-[13px] px-3 py-2 rounded-[10px]" style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] font-semibold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #00d5c4, #00876e)' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 22px rgba(0,213,196,0.35)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Redefinir senha
            </button>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
