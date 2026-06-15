import { Menu, Search, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header
      className="h-[60px] shrink-0 flex items-center justify-between px-4 lg:px-6 gap-4"
      style={{
        background: 'var(--glass-bg-md)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid rgba(0,213,196,0.08)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-[8px] transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-[8px] flex-1 max-w-xs"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar cliente, cartão, operação..."
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Bell */}
        <div className="relative">
          <button
            className="flex items-center justify-center w-[34px] h-[34px] rounded-[8px] transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
          >
            <Bell className="w-4 h-4" />
          </button>
          <span
            className="absolute top-[6px] right-[6px] w-2 h-2 rounded-full"
            style={{
              background: 'var(--danger)',
              boxShadow: '0 0 6px var(--danger)',
              animation: 'pulse 2s infinite',
            }}
          />
        </div>

        {/* User */}
        <div
          className="flex items-center gap-2 pl-3"
          style={{ borderLeft: '1px solid var(--glass-border)' }}
        >
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #00d5c4, #00876e)',
              border: '2px solid rgba(0,213,196,0.40)',
              boxShadow: '0 0 10px rgba(0,213,196,0.25)',
            }}
          >
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden md:block text-left">
            <p
              className="text-[12px] font-semibold leading-tight truncate max-w-[120px]"
              style={{ color: 'var(--text-primary)' }}
            >
              {user?.email?.split('@')[0] ?? 'Usuário'}
            </p>
            <p className="text-[10px] truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>
              {user?.email}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="p-2 rounded-[8px] transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
