import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, CreditCard, Banknote, Users,
  HandCoins, Wallet, FileBarChart, X, Shield,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { path: '/',           icon: LayoutDashboard, label: 'Dashboard'  },
  { path: '/cartoes',    icon: CreditCard,       label: 'Cartões'    },
  { path: '/dinheiro',   icon: Banknote,         label: 'Dinheiro'   },
  { path: '/clientes',   icon: Users,            label: 'Clientes'   },
  { path: '/operacoes',  icon: HandCoins,        label: 'Operações'  },
  { path: '/financeiro', icon: Wallet,           label: 'Financeiro' },
  { path: '/relatorios', icon: FileBarChart,     label: 'Relatórios' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const adminActive = location.pathname === '/admin';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          sidebar-collapse
          fixed top-0 left-0 h-full z-50 flex flex-col
          lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'var(--glass-bg-md)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          borderRight: '1px solid rgba(0, 213, 196, 0.10)',
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.3s ease',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-[13px] py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <div
            className="shrink-0 flex items-center justify-center rounded-[10px]"
            style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #00d5c4, #00876e)',
              boxShadow: '0 0 16px rgba(0,213,196,0.45)',
            }}
          >
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="sidebar-logo-text font-extrabold tracking-tight text-white text-[15px]">
            Credit<span style={{ color: 'var(--accent)' }}>Flow</span>
          </span>
          <button
            onClick={onClose}
            className="lg:hidden ml-auto p-1 rounded"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all duration-200"
                style={isActive ? {
                  background: 'rgba(0,213,196,0.10)',
                  border: '1px solid rgba(0,213,196,0.25)',
                  color: 'var(--accent)',
                  boxShadow: 'var(--glow-accent-sm)',
                } : {
                  color: 'rgba(255,255,255,0.38)',
                  border: '1px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)';
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)';
                }}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                <span className="sidebar-label text-[13px] font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {isAdmin && (
          <div style={{ borderTop: '1px solid var(--glass-border)', padding: '8px' }}>
            <NavLink
              to="/admin"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all duration-200"
              style={adminActive ? {
                background: 'rgba(0,213,196,0.10)',
                border: '1px solid rgba(0,213,196,0.25)',
                color: 'var(--accent)',
                boxShadow: 'var(--glow-accent-sm)',
              } : {
                color: 'rgba(255,255,255,0.38)',
                border: '1px solid transparent',
              }}
              onMouseEnter={e => {
                if (!adminActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)';
              }}
              onMouseLeave={e => {
                if (!adminActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)';
              }}
            >
              <Shield className="w-[18px] h-[18px] shrink-0" />
              <span className="sidebar-label text-[13px] font-medium">Admin</span>
            </NavLink>
          </div>
        )}
      </aside>
    </>
  );
}
