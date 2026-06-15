# CreditFlow Frontend Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign CreditFlow's frontend with a Glassmorphism Dark + Glow aesthetic — teal neon accent, dark-only, slim hover-expand sidebar — matching premium fintech reference designs approved by the client.

**Architecture:** Design System First — rebuild `index.css` with dark tokens and glassmorphism utilities, then update shared components (Sidebar, Header, KPICard, StatusBadge), then Dashboard. The other 6 pages inherit ~80% automatically via CSS custom properties.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide React, Vite

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/index.css` | Modify | Dark-only design system tokens, glassmorphism utilities, sidebar CSS hover |
| `src/index.html` | Modify | Add Google Fonts import for Plus Jakarta Sans |
| `src/App.tsx` | Modify | Remove dark mode state/effect/props |
| `src/components/Sidebar.tsx` | Modify | Slim + hover-expand, glassmorphism, remove collapsed state |
| `src/components/Header.tsx` | Modify | Remove dark toggle, glassmorphism, bell dot pulse, teal avatar |
| `src/components/KPICard.tsx` | Modify | Glass card, glow blob, color-coded icon box, primary variant |
| `src/components/StatusBadge.tsx` | Modify | Pill badges with colored border + dot |
| `src/pages/Dashboard.tsx` | Modify | Glass chart cards, teal chart colors, dark tooltips, glass alerts |

---

## Task 1: Design System — `index.css` + Google Fonts

**Files:**
- Modify: `src/index.css`
- Modify: `index.html`

- [ ] **Step 1: Add Google Fonts link to `index.html`**

Open `index.html`. Inside `<head>`, add before the closing `</head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Replace `src/index.css` entirely**

```css
@import "tailwindcss";

@theme {
  --color-primary-50:  #ecfdf9;
  --color-primary-100: #d0faf4;
  --color-primary-200: #a5f3eb;
  --color-primary-300: #6ae8dd;
  --color-primary-400: #2dd4c8;
  --color-primary-500: #00d5c4;
  --color-primary-600: #00a896;
  --color-primary-700: #007d71;
  --color-primary-800: #065f56;
  --color-primary-900: #054d46;
  --color-primary-950: #022e2a;

  --color-success-50:  #ecfdf5;
  --color-success-100: #d1fae5;
  --color-success-500: #10b981;
  --color-success-600: #059669;
  --color-success-700: #047857;

  --color-warning-50:  #fffbeb;
  --color-warning-100: #fef3c7;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;

  --color-danger-50:  #fef2f2;
  --color-danger-100: #fee2e2;
  --color-danger-500: #ef4444;
  --color-danger-600: #dc2626;
  --color-danger-700: #b91c1c;

  --font-display: "Plus Jakarta Sans", sans-serif;
  --font-body:    "Plus Jakarta Sans", sans-serif;
}

:root {
  /* ── Backgrounds ─────────────────────── */
  --bg-deep:      #080d14;
  --bg-primary:   #0d1421;
  --bg-secondary: #111827;
  --bg-sidebar:   #080d14;

  /* ── Glassmorphism ───────────────────── */
  --glass-bg:      rgba(255, 255, 255, 0.04);
  --glass-bg-md:   rgba(255, 255, 255, 0.025);
  --glass-border:  rgba(255, 255, 255, 0.08);
  --glass-blur:    blur(16px);
  --glass-blur-sm: blur(8px);

  /* ── Accent (Teal Neon) ──────────────── */
  --accent:      #00d5c4;
  --accent-dark: #00a896;

  /* ── Semantic colors ─────────────────── */
  --success: #10b981;
  --danger:  #ef4444;
  --warning: #f59e0b;
  --purple:  #a78bfa;

  /* ── Glow effects ────────────────────── */
  --glow-accent:    0 0 20px rgba(0, 213, 196, 0.15);
  --glow-accent-sm: 0 0 12px rgba(0, 213, 196, 0.10);
  --glow-danger:    0 0 12px rgba(239, 68, 68, 0.20);
  --glow-success:   0 0 12px rgba(16, 185, 129, 0.20);

  /* ── Radius ──────────────────────────── */
  --radius-card: 16px;
  --radius-sm:   10px;

  /* ── Sidebar ─────────────────────────── */
  --sidebar-slim: 64px;
  --sidebar-full: 220px;

  /* ── Typography ──────────────────────── */
  --text-primary:   #f8fafc;
  --text-secondary: #94a3b8;
  --text-tertiary:  #475569;
  --text-muted:     #334155;

  /* ── Cards (used by existing pages) ─── */
  --card-bg:      rgba(255, 255, 255, 0.04);
  --card-shadow:  none;
  --border-color: rgba(255, 255, 255, 0.08);
  --bg-tertiary:  rgba(0, 213, 196, 0.03);
}

/* ── Animations ──────────────────────────────── */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

/* ── Base ────────────────────────────────────── */
body {
  margin: 0;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* { box-sizing: border-box; }

/* ── Sidebar hover-expand (desktop only) ─────── */
@media (min-width: 1024px) {
  .sidebar-collapse {
    width: var(--sidebar-slim);
    transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }
  .sidebar-collapse:hover {
    width: var(--sidebar-full);
  }
  .sidebar-collapse .sidebar-label,
  .sidebar-collapse .sidebar-logo-text {
    opacity: 0;
    max-width: 0;
    overflow: hidden;
    white-space: nowrap;
    display: inline-block;
    transition: opacity 0.15s ease 0.05s, max-width 0.2s ease;
  }
  .sidebar-collapse:hover .sidebar-label,
  .sidebar-collapse:hover .sidebar-logo-text {
    opacity: 1;
    max-width: 160px;
  }
}

/* ── Scrollbar ───────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(0, 213, 196, 0.3);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 213, 196, 0.5);
}

/* ── Print ───────────────────────────────────── */
@media print {
  body > * { display: none !important; }
  #print-area { display: block !important; }
  #print-area * { color: #000 !important; background: #fff !important; border-color: #ccc !important; }
  #print-area table { border-collapse: collapse; width: 100%; }
  #print-area th, #print-area td { border: 1px solid #ccc; padding: 6px 10px; font-size: 11px; }
  #print-area th { background: #f3f4f6 !important; font-weight: 600; }
  #print-area h1, #print-area h2, #print-area h3, #print-area h4 { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
}
```

- [ ] **Step 3: Run dev server and verify**

```bash
npm run dev
```

Abra `http://localhost:5173`. O app vai ficar visualmente quebrado (fundo escuro, textos podem sumir) — isso é esperado. Confirme que o servidor roda sem erros de compilação no terminal.

- [ ] **Step 4: Commit**

```bash
git add src/index.css index.html
git commit -m "feat: implement dark glassmorphism design system tokens"
```

---

## Task 2: `App.tsx` — Remove Dark Mode

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import { DataProvider, useData } from './contexts/DataContext';
import Dashboard from './pages/Dashboard';
import Cartoes from './pages/Cartoes';
import Dinheiro from './pages/Dinheiro';
import Clientes from './pages/Clientes';
import Operacoes from './pages/Operacoes';
import Financeiro from './pages/Financeiro';
import Relatorios from './pages/Relatorios';
import Login from './pages/Login';

function DataErrorBanner() {
  const { error, refresh } = useData();
  if (!error) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 16px',
      background: 'rgba(239, 68, 68, 0.08)',
      borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
    }}>
      <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--danger)' }} />
      <span style={{ fontSize: '13px', color: '#f87171', flex: 1 }}>
        Erro ao carregar dados: {error}
      </span>
      <button
        onClick={refresh}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px', borderRadius: '8px', fontSize: '12px',
          fontWeight: 600, background: 'var(--danger)', color: '#fff',
          border: 'none', cursor: 'pointer',
        }}
      >
        <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
      </button>
    </div>
  );
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <DataProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <DataErrorBanner />
          <main
            className="flex-1 overflow-y-auto p-4 lg:p-6"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cartoes" element={<Cartoes />} />
              <Route path="/dinheiro" element={<Dinheiro />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/operacoes" element={<Operacoes />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/relatorios" element={<Relatorios />} />
            </Routes>
          </main>
        </div>
      </div>
    </DataProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
```

- [ ] **Step 2: Verify no TS errors**

```bash
npm run build 2>&1 | head -30
```

Esperado: sem erros relacionados a `darkMode` ou `onToggleDarkMode`. (Vai falhar no Header.tsx ainda — isso é esperado pois `Header` ainda tem as props antigas. Confirme que o único erro é sobre o Header props.)

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: remove dark mode toggle, app is dark-only"
```

---

## Task 3: `Sidebar.tsx` — Slim + Hover Expand

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Replace `src/components/Sidebar.tsx`**

```tsx
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, Banknote, Users,
  HandCoins, Wallet, FileBarChart, X,
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
          <span
            className="sidebar-logo-text font-extrabold tracking-tight text-white text-[15px]"
          >
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
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Verificar no navegador**

Com o dev server rodando, confirme:
- Desktop: sidebar aparece slim (64px) com apenas ícones
- Desktop hover: expande suavemente para 220px mostrando labels com animação
- Logo "CreditFlow" aparece apenas quando expandida
- Item Dashboard ativo em teal com borda e glow
- Itens inativos em branco translúcido, ficam mais brilhantes ao hover
- Mobile: sidebar some, botão hamburger abre drawer full-width

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: sidebar slim+hover-expand glassmorphism redesign"
```

---

## Task 4: `Header.tsx` — Glassmorphism, Sem Toggle

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Replace `src/components/Header.tsx`**

```tsx
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
            <p className="text-[12px] font-semibold leading-tight truncate max-w-[120px]"
               style={{ color: 'var(--text-primary)' }}>
              {user?.email?.split('@')[0] ?? 'Usuário'}
            </p>
            <p className="text-[10px] truncate max-w-[120px]"
               style={{ color: 'var(--text-muted)' }}>
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
```

- [ ] **Step 2: Verificar no navegador**

Confirme:
- Header tem fundo translúcido com blur (visível com conteúdo atrás)
- Borda inferior sutil em teal
- Campo de busca com fundo sutil
- Dot vermelho pulsando no sino
- Avatar com anel teal e glow sutil
- Botão sun/moon sumiu

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: header glassmorphism, remove dark mode toggle"
```

---

## Task 5: `KPICard.tsx` — Glass Card com Glow

**Files:**
- Modify: `src/components/KPICard.tsx`

- [ ] **Step 1: Replace `src/components/KPICard.tsx`**

```tsx
import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  primary?: boolean;
}

const colorMap = {
  blue:   { glow: 'rgba(0,213,196,0.18)',   icon: '#00d5c4', iconBg: 'rgba(0,213,196,0.12)',  iconBorder: 'rgba(0,213,196,0.25)',  trend: '#00d5c4'  },
  green:  { glow: 'rgba(16,185,129,0.18)',  icon: '#10b981', iconBg: 'rgba(16,185,129,0.10)', iconBorder: 'rgba(16,185,129,0.25)', trend: '#10b981'  },
  red:    { glow: 'rgba(239,68,68,0.18)',   icon: '#ef4444', iconBg: 'rgba(239,68,68,0.10)',  iconBorder: 'rgba(239,68,68,0.25)',  trend: '#ef4444'  },
  yellow: { glow: 'rgba(245,158,11,0.18)',  icon: '#f59e0b', iconBg: 'rgba(245,158,11,0.10)', iconBorder: 'rgba(245,158,11,0.25)', trend: '#f59e0b'  },
  purple: { glow: 'rgba(167,139,250,0.18)', icon: '#a78bfa', iconBg: 'rgba(139,92,246,0.10)', iconBorder: 'rgba(139,92,246,0.25)', trend: '#a78bfa'  },
};

const trendColorMap = {
  up:      '#10b981',
  down:    '#ef4444',
  neutral: 'var(--text-muted)',
};

export default function KPICard({ title, value, icon, trend, color = 'blue', primary = false }: KPICardProps) {
  const c = colorMap[color];

  return (
    <div
      className="relative overflow-hidden rounded-[16px] p-[18px] transition-all duration-200 cursor-default"
      style={{
        background: primary ? `rgba(0,213,196,0.06)` : 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: primary
          ? '1px solid rgba(0,213,196,0.22)'
          : '1px solid var(--glass-border)',
        boxShadow: primary ? 'var(--glow-accent)' : 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,213,196,0.25)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = primary
          ? 'rgba(0,213,196,0.22)'
          : 'var(--glass-border)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute top-[-20px] right-[-20px] w-[80px] h-[80px] rounded-full pointer-events-none"
        style={{ background: c.glow, filter: 'blur(28px)' }}
      />

      {/* Icon */}
      <div
        className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center mb-[14px]"
        style={{
          background: c.iconBg,
          border: `1px solid ${c.iconBorder}`,
          color: c.icon,
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <p
        className="text-[10px] font-semibold uppercase tracking-[1px] mb-[5px]"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {title}
      </p>

      {/* Value */}
      <p
        className="text-[20px] font-extrabold leading-none truncate"
        style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}
      >
        {value}
      </p>

      {/* Trend */}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend.direction === 'up'      && <TrendingUp   className="w-3 h-3" style={{ color: trendColorMap.up }} />}
          {trend.direction === 'down'    && <TrendingDown  className="w-3 h-3" style={{ color: trendColorMap.down }} />}
          {trend.direction === 'neutral' && <Minus         className="w-3 h-3" style={{ color: trendColorMap.neutral }} />}
          <span
            className="text-[11px] font-medium"
            style={{ color: trendColorMap[trend.direction] }}
          >
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Atualizar Dashboard.tsx para usar `primary` no primeiro KPI**

No `src/pages/Dashboard.tsx`, no primeiro `<KPICard>` (Patrimônio Disponível), adicionar a prop `primary`:

```tsx
<KPICard
  title="Patrimônio Disponível"
  value={formatCurrency(totalDisponivel)}
  icon={<CreditCard className="w-4 h-4" />}
  color="blue"
  primary
  trend={{ value: `${((totalDisponivel / totalLimite) * 100).toFixed(0)}% do total`, direction: 'neutral' }}
/>
```

- [ ] **Step 3: Verificar no navegador**

Confirme:
- Cards têm fundo translúcido com blur
- Primeiro card (Patrimônio Disponível) tem borda teal e glow accent
- Cada card tem o blob de glow no canto superior direito na cor do tipo
- Hover levanta o card 1px e escurece a borda
- Ícones em boxes coloridos por tipo (teal, verde, vermelho, roxo, amarelo)

- [ ] **Step 4: Commit**

```bash
git add src/components/KPICard.tsx src/pages/Dashboard.tsx
git commit -m "feat: KPICard glassmorphism with color glow and primary variant"
```

---

## Task 6: `StatusBadge.tsx` — Pills com Borda Colorida

**Files:**
- Modify: `src/components/StatusBadge.tsx`

- [ ] **Step 1: Replace `src/components/StatusBadge.tsx`**

```tsx
interface StatusBadgeProps {
  status: string;
  type?: 'operation' | 'client' | 'parcela' | 'card';
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  // Operation
  em_aberto:          { label: 'Em Aberto',        color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.28)'  },
  pago_parcialmente:  { label: 'Parcialmente Pago', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)'  },
  pago:               { label: 'Pago',              color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.28)'  },
  atrasado:           { label: 'Atrasado',          color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.28)'  },
  inadimplente:       { label: 'Inadimplente',      color: '#f87171', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)'   },
  // Client
  adimplente:         { label: 'Adimplente',        color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.28)'  },
  bloqueado:          { label: 'Bloqueado',         color: '#94a3b8', bg: 'rgba(100,116,139,0.12)',border: 'rgba(100,116,139,0.28)' },
  // Parcela
  paga:               { label: 'Paga',              color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.28)'  },
  pendente:           { label: 'Pendente',          color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.28)'  },
  vencida:            { label: 'Vencida',           color: '#f87171', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)'   },
  // Card
  ativo:              { label: 'Ativo',             color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.28)'  },
  cancelado:          { label: 'Cancelado',         color: '#94a3b8', bg: 'rgba(100,116,139,0.12)',border: 'rgba(100,116,139,0.28)' },
};

const fallback = { label: '', color: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.28)' };

export default function StatusBadge({ status }: StatusBadgeProps) {
  const c = statusConfig[status] ?? { ...fallback, label: status };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '10px',
        fontWeight: 600,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: '8px' }}>●</span>
      {c.label}
    </span>
  );
}
```

- [ ] **Step 2: Verificar no navegador**

Navegue para `/operacoes` e `/clientes`. Confirme:
- Badges têm fundo colorido semitransparente + borda colorida sutil
- Dot colorido antes do texto
- Pill format (border-radius 20px)
- Cores semânticas corretas por status

- [ ] **Step 3: Commit**

```bash
git add src/components/StatusBadge.tsx
git commit -m "feat: StatusBadge pill redesign with colored borders"
```

---

## Task 7: `Dashboard.tsx` — Glass Charts, Alertas e Tabelas

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Atualizar constante de cores dos gráficos**

Na linha 16 de `src/pages/Dashboard.tsx`, substituir:

```tsx
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
```

por:

```tsx
const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#00d5c4'];

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#111827',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '12px',
  },
  cursor: { fill: 'rgba(0,213,196,0.05)' },
};
```

- [ ] **Step 2: Atualizar estilos dos cards de gráficos**

Nos 4 cards de gráfico (linhas 164, 181, 198, 214), substituir o padrão:

```tsx
<div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
```

por:

```tsx
<div style={{
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 'var(--radius-card)',
  padding: '20px',
}}>
```

- [ ] **Step 3: Atualizar título de cada card de gráfico**

Nos 4 cards, substituir:

```tsx
<h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
```

por:

```tsx
<h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
```

- [ ] **Step 4: Atualizar cores dos BarChart e LineChart**

No primeiro `<BarChart>` (Entradas x Saídas):

```tsx
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
<XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
<YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
<Tooltip {...TOOLTIP_STYLE} formatter={(value) => formatCurrency(Number(value))} />
<Bar dataKey="entradas" fill="#00d5c4" radius={[4, 4, 0, 0]} name="Entradas" />
<Bar dataKey="saidas"   fill="#ef4444" radius={[4, 4, 0, 0]} name="Saídas"   />
```

No `<BarChart layout="vertical">` (Uso do Patrimônio):

```tsx
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
<XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
<YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={80} axisLine={false} tickLine={false} />
<Tooltip {...TOOLTIP_STYLE} formatter={(value) => formatCurrency(Number(value))} />
<Bar dataKey="usado"     stackId="a" fill="#00d5c4" name="Utilizado" />
<Bar dataKey="disponivel" stackId="a" fill="rgba(255,255,255,0.08)" name="Disponível" radius={[0, 4, 4, 0]} />
```

No `<LineChart>` (Inadimplência):

```tsx
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
<XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
<YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
<Tooltip {...TOOLTIP_STYLE} formatter={(value) => formatCurrency(Number(value))} />
<Line type="monotone" dataKey="valor" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Inadimplência" />
```

No `<PieChart>` (Operações por Status), adicionar `<Tooltip>`:

```tsx
<Tooltip {...TOOLTIP_STYLE} />
<Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
```

- [ ] **Step 5: Atualizar cards das tabelas**

Nos 2 cards de tabela (linhas 249 e 283), substituir:

```tsx
<div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
  <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
```

por:

```tsx
<div style={{
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 'var(--radius-card)',
  overflow: 'hidden',
}}>
  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
```

- [ ] **Step 6: Atualizar cabeçalho e linhas das tabelas**

Nos `<thead>` das duas tabelas, substituir:

```tsx
<tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
```

por:

```tsx
<tr style={{ background: 'rgba(255,255,255,0.02)' }}>
  <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
```

Nas `<tr>` do `<tbody>`, substituir:

```tsx
<tr key={...} className="border-t hover:bg-[var(--bg-tertiary)] transition-colors" style={{ borderColor: 'var(--border-color)' }}>
```

por:

```tsx
<tr key={...} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,213,196,0.03)'}
    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
```

E nas células `<td>`, substituir `style={{ color: 'var(--text-primary)' }}` por `style={{ color: 'var(--text-secondary)', padding: '10px 20px', fontSize: '12px' }}` ajustando conforme o tipo de dado (nome: `--text-primary`, valor: `--text-primary font-weight:700`, data: `--text-tertiary`).

- [ ] **Step 7: Atualizar seção de Alertas Financeiros**

Substituir o bloco inteiro de alertas (linhas 320–349):

```tsx
{/* Alerts */}
<div style={{
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 'var(--radius-card)',
  padding: '18px 20px',
}}>
  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
    <AlertTriangle className="w-3.5 h-3.5" />
    Alertas Financeiros
  </h3>
  <div className="space-y-2">
    {totalVencido > 0 && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', fontSize: '12px', color: '#f87171' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 6px var(--danger)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
        Valor vencido total: <strong style={{ margin: '0 4px' }}>{formatCurrency(totalVencido)}</strong> — {clientesInadimplentes} cliente(s) inadimplente(s)
      </div>
    )}
    {cartoes.filter(c => c.limiteDisponivel < c.limiteTotal * 0.2).map(c => (
      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', fontSize: '12px', color: '#fbbf24' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', flexShrink: 0 }} />
        Cartão <strong style={{ margin: '0 4px' }}>{c.nome}</strong> com limite baixo: {formatCurrency(c.limiteDisponivel)} disponível de {formatCurrency(c.limiteTotal)}
      </div>
    ))}
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,213,196,0.07)', border: '1px solid rgba(0,213,196,0.18)', fontSize: '12px', color: 'var(--accent)' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', flexShrink: 0 }} />
      {proximosRecebimentos.length} parcela(s) pendente(s) nos próximos 30 dias
    </div>
  </div>
</div>
```

- [ ] **Step 8: Verificar Dashboard completo no navegador**

Confirme:
- Cards dos gráficos têm fundo glass com blur
- Barras do gráfico em teal (entradas) e vermelho (saídas)
- Tooltip dos gráficos com fundo `#111827` dark
- Linhas das tabelas com hover teal sutil
- Alertas com fundos semitransparentes coloridos
- Dot danger pulsando
- Grid lines dos gráficos sutis (branco 4%)

- [ ] **Step 9: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: dashboard glass charts, dark tooltips, redesigned alerts and tables"
```

---

## Task 8: Build Final e Verificação

**Files:** nenhum (verificação)

- [ ] **Step 1: Build de produção**

```bash
npm run build
```

Esperado: zero erros de TypeScript. Avisos de Tailwind sobre classes desconhecidas são aceitáveis.

- [ ] **Step 2: Verificar cada página herdando o novo design**

Com `npm run dev`, navegue por todas as páginas e confirme herança:
- `/cartoes` — cards com `var(--card-bg)` agora são glass, tabelas com dark theme
- `/dinheiro` — mesmo padrão
- `/clientes` — StatusBadge com pill design, tabelas dark
- `/operacoes` — StatusBadge, tabelas dark
- `/financeiro` — design herdado
- `/relatorios` — design herdado
- `/login` — verificar se a página de login precisa de ajuste manual (fora do escopo do spec, mas checar visualmente)

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat: CreditFlow glassmorphism dark redesign complete"
```

---

## Self-Review

**Spec coverage:**
- ✅ `index.css` — tokens dark, glassmorphism, sidebar CSS, pulse animation, scrollbar teal
- ✅ `App.tsx` — darkMode removido, Header sem props de toggle
- ✅ `Sidebar.tsx` — slim+hover, glassmorphism, logo text hidden, glow no ativo
- ✅ `Header.tsx` — props removidas, blur, bell dot pulse, avatar teal
- ✅ `KPICard.tsx` — glass, glow blob, icon box colorido, primary variant, hover translateY
- ✅ `StatusBadge.tsx` — pill, borda colorida, dot colorido, todos os status cobertos
- ✅ `Dashboard.tsx` — charts teal, dark tooltip, glass chart cards, alertas glass, table hover teal
- ✅ `HeaderProps` — `darkMode` e `onToggleDarkMode` removidos da interface
- ✅ Recharts Tooltip com `contentStyle` dark

**Nenhum placeholder ou TBD encontrado.**

**Consistência de tipos:** `TOOLTIP_STYLE` definido na Task 7 Step 1 e usado nos Steps 4–5 na mesma task. `primary?: boolean` definido e usado corretamente.
