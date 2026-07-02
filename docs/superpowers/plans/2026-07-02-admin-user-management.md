# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin user (`douglas_barcellos01@hotmail.com`) with an exclusive page to list all platform users, view their stats, and block/unblock or delete their accounts via server-side RPC functions.

**Architecture:** A new `profiles` table extends `auth.users` with a `role` column. Four `SECURITY DEFINER` Postgres RPC functions handle privileged operations server-side (no service role key exposed in the client). The frontend reads `isAdmin` from `AuthContext` (populated via `supabase.rpc('is_admin')` after login) and conditionally renders the Admin link in the Sidebar and the Admin page behind an `AdminRoute` guard.

**Tech Stack:** React 18, TypeScript, Vite, Supabase (Postgres RPC + `auth.users`), Tailwind CSS + glassmorphism CSS variables, lucide-react icons.

> **Note:** `Dashboard.tsx` trends are already implemented (lines 55–116 have `calcTrend`, `mesAnterior`, and month comparisons). No Dashboard task is needed.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/005_admin_system.sql` | Create | `profiles` table, trigger, 4 RPC functions, RLS policy |
| `supabase/seed_admin.sql` | Create | One-time manual script to set admin role |
| `src/contexts/AuthContext.tsx` | Modify | Add `isAdmin: boolean` state populated via `supabase.rpc('is_admin')` |
| `src/components/AdminRoute.tsx` | Create | Route guard — redirects non-admins to `/` |
| `src/pages/Admin.tsx` | Create | Full user management table with block/delete actions |
| `src/App.tsx` | Modify | Register `/admin` route inside `AppLayout` |
| `src/components/Sidebar.tsx` | Modify | Conditionally render admin link with `Shield` icon |

---

### Task 1: Database — profiles table, trigger and RPC functions

**Files:**
- Create: `supabase/migrations/005_admin_system.sql`

- [ ] **Step 1: Create the migration file with the full content below**

```sql
-- supabase/migrations/005_admin_system.sql

-- ── 1. profiles table ─────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Each user can only read their own row
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- ── 2. Auto-create profile on every new signup ────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 3. is_admin() — used by AuthContext and as gate inside other RPC functions ─
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── 4. admin_list_users() — returns all users with aggregated stats ────────────
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
  id               UUID,
  email            TEXT,
  created_at       TIMESTAMPTZ,
  banned_until     TIMESTAMPTZ,
  clientes_count   BIGINT,
  operacoes_count  BIGINT,
  total_emprestado NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    u.created_at,
    u.banned_until,
    COALESCE((SELECT COUNT(*) FROM clientes  c WHERE c.user_id = u.id), 0)              AS clientes_count,
    COALESCE((SELECT COUNT(*) FROM operacoes o WHERE o.user_id = u.id), 0)              AS operacoes_count,
    COALESCE((SELECT SUM(o.valor_enviado) FROM operacoes o WHERE o.user_id = u.id), 0)  AS total_emprestado
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- ── 5. admin_set_user_ban(target_id, ban) ────────────────────────────────────
-- Sets banned_until to far-future date (block) or NULL (unblock).
-- Supabase Auth will reject login attempts for banned users automatically.
CREATE OR REPLACE FUNCTION admin_set_user_ban(target_id UUID, ban BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível bloquear sua própria conta';
  END IF;

  UPDATE auth.users
  SET banned_until = CASE WHEN ban THEN '2099-12-31 00:00:00+00'::TIMESTAMPTZ ELSE NULL END
  WHERE id = target_id;
END;
$$;

-- ── 6. admin_delete_user(target_id) ──────────────────────────────────────────
-- Deletes auth.users row. ON DELETE CASCADE removes all user data across all tables.
CREATE OR REPLACE FUNCTION admin_delete_user(target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível deletar sua própria conta';
  END IF;

  DELETE FROM auth.users WHERE id = target_id;
END;
$$;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/005_admin_system.sql
git commit -m "feat: add profiles table, trigger and admin RPC functions (migration 005)"
```

---

### Task 2: Seed admin script

**Files:**
- Create: `supabase/seed_admin.sql`

- [ ] **Step 1: Create the file**

```sql
-- supabase/seed_admin.sql
-- Run ONCE manually in the Supabase SQL Editor AFTER the account
-- douglas_barcellos01@hotmail.com has been created via the app's signup flow.

INSERT INTO profiles (id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'douglas_barcellos01@hotmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/seed_admin.sql
git commit -m "feat: add one-time seed script for admin role"
```

---

### Task 3: AuthContext — add isAdmin

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

- [ ] **Step 1: Replace the full file content**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = async (currentUser: User | null) => {
    if (!currentUser) { setIsAdmin(false); return; }
    const { data } = await supabase.rpc('is_admin');
    setIsAdmin(data === true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setUser(current?.user ?? null);
      checkAdmin(current?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, current) => {
      setSession(current);
      setUser(current?.user ?? null);
      checkAdmin(current?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    setIsAdmin(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat: add isAdmin to AuthContext via is_admin() RPC"
```

---

### Task 4: AdminRoute guard component

**Files:**
- Create: `src/components/AdminRoute.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminRoute.tsx
git commit -m "feat: add AdminRoute guard component"
```

---

### Task 5: Admin page

**Files:**
- Create: `src/pages/Admin.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState } from 'react';
import { Shield, RefreshCw, Ban, Trash2, UserCheck, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { formatCurrency } from '../utils/format';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  banned_until: string | null;
  clientes_count: number;
  operacoes_count: number;
  total_emprestado: number;
}

function formatMonthYear(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

const TH: React.CSSProperties = {
  padding: '8px 16px',
  textAlign: 'left',
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: 'var(--text-muted)',
  background: 'rgba(255,255,255,0.02)',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
};

export default function Admin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('admin_list_users');
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setUsers((data as AdminUser[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleBan = async (u: AdminUser) => {
    const ban = !u.banned_until;
    setActionLoading(u.id);
    const { error: rpcError } = await supabase.rpc('admin_set_user_ban', {
      target_id: u.id,
      ban,
    });
    setActionLoading(null);
    if (rpcError) {
      showToast(rpcError.message, 'error');
    } else {
      showToast(ban ? 'Usuário bloqueado com sucesso.' : 'Usuário desbloqueado com sucesso.', 'success');
      fetchUsers();
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete.id);
    const { error: rpcError } = await supabase.rpc('admin_delete_user', {
      target_id: confirmDelete.id,
    });
    setActionLoading(null);
    setConfirmDelete(null);
    if (rpcError) {
      showToast(rpcError.message, 'error');
    } else {
      showToast('Usuário deletado com sucesso.', 'success');
      fetchUsers();
    }
  };

  const isSelf = (u: AdminUser) => u.id === user?.id;
  const isBanned = (u: AdminUser) => Boolean(u.banned_until);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h1 className="text-[20px] font-extrabold" style={{ color: 'var(--text-primary)' }}>
              Gerenciamento de Usuários
            </h1>
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {loading
              ? 'Carregando...'
              : `${users.length} usuário${users.length !== 1 ? 's' : ''} cadastrado${users.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: 'rgba(0,213,196,0.08)',
            border: '1px solid rgba(0,213,196,0.20)',
            color: 'var(--accent)',
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.20)',
            color: '#f87171',
          }}
        >
          <span className="flex-1">Erro ao carregar usuários: {error}</span>
          <button onClick={fetchUsers} className="text-xs font-semibold underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Users table */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th style={TH}>Usuário</th>
                  <th style={TH}>Cadastro</th>
                  <th style={TH}>Status</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Clientes</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Operações</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Total Emprestado</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      opacity: actionLoading === u.id ? 0.5 : 1,
                      transition: 'opacity 0.2s, background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,213,196,0.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    {/* Email */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.email}
                      </div>
                      {isSelf(u) && (
                        <span style={{
                          fontSize: '10px', fontWeight: 700, color: 'var(--accent)',
                          background: 'rgba(0,213,196,0.12)',
                          border: '1px solid rgba(0,213,196,0.25)',
                          borderRadius: '4px', padding: '1px 6px',
                          marginTop: '3px', display: 'inline-block',
                        }}>
                          você
                        </span>
                      )}
                    </td>

                    {/* Cadastro */}
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatMonthYear(u.created_at)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px' }}>
                      {isSelf(u) ? (
                        <span style={{
                          fontSize: '11px', fontWeight: 600, color: 'var(--accent)',
                          background: 'rgba(0,213,196,0.10)',
                          border: '1px solid rgba(0,213,196,0.25)',
                          borderRadius: '6px', padding: '2px 8px',
                        }}>
                          👑 Admin
                        </span>
                      ) : isBanned(u) ? (
                        <span style={{
                          fontSize: '11px', fontWeight: 600, color: '#f87171',
                          background: 'rgba(239,68,68,0.10)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: '6px', padding: '2px 8px',
                        }}>
                          🚫 Bloqueado
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '11px', fontWeight: 600, color: '#34d399',
                          background: 'rgba(52,211,153,0.10)',
                          border: '1px solid rgba(52,211,153,0.25)',
                          borderRadius: '6px', padding: '2px 8px',
                        }}>
                          ✅ Ativo
                        </span>
                      )}
                    </td>

                    {/* Clientes */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {isSelf(u) ? '—' : u.clientes_count}
                    </td>

                    {/* Operações */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {isSelf(u) ? '—' : u.operacoes_count}
                    </td>

                    {/* Total Emprestado */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {isSelf(u) ? '—' : formatCurrency(u.total_emprestado)}
                    </td>

                    {/* Ações */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {!isSelf(u) && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleBan(u)}
                            disabled={actionLoading === u.id}
                            title={isBanned(u) ? 'Desbloquear usuário' : 'Bloquear usuário'}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            style={isBanned(u) ? {
                              background: 'rgba(52,211,153,0.10)',
                              border: '1px solid rgba(52,211,153,0.25)',
                              color: '#34d399',
                            } : {
                              background: 'rgba(245,158,11,0.10)',
                              border: '1px solid rgba(245,158,11,0.25)',
                              color: '#fbbf24',
                            }}
                          >
                            {isBanned(u)
                              ? <><UserCheck className="w-3 h-3" /> Ativar</>
                              : <><Ban className="w-3 h-3" /> Bloquear</>
                            }
                          </button>
                          <button
                            onClick={() => setConfirmDelete(u)}
                            disabled={actionLoading === u.id}
                            title="Deletar usuário"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            style={{
                              background: 'rgba(239,68,68,0.10)',
                              border: '1px solid rgba(239,68,68,0.25)',
                              color: '#f87171',
                            }}
                          >
                            <Trash2 className="w-3 h-3" /> Deletar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Deletar usuário"
          message={`Tem certeza que deseja deletar a conta de "${confirmDelete.email}"? Todos os dados (clientes, operações, histórico) serão removidos permanentemente.`}
          confirmLabel="Deletar permanentemente"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Admin.tsx
git commit -m "feat: add Admin user management page"
```

---

### Task 6: Register /admin route in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/App.tsx`, add these two imports after the existing page imports:

```tsx
import Admin from './pages/Admin';
import AdminRoute from './components/AdminRoute';
```

- [ ] **Step 2: Add the route**

Inside the `<Routes>` block in `AppLayout`, after the `/relatorios` route, add:

```tsx
<Route path="/admin" element={
  <AdminRoute>
    <Admin />
  </AdminRoute>
} />
```

The complete `<Routes>` block should be:

```tsx
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/cartoes" element={<Cartoes />} />
  <Route path="/dinheiro" element={<Dinheiro />} />
  <Route path="/clientes" element={<Clientes />} />
  <Route path="/operacoes" element={<Operacoes />} />
  <Route path="/financeiro" element={<Financeiro />} />
  <Route path="/relatorios" element={<Relatorios />} />
  <Route path="/admin" element={
    <AdminRoute>
      <Admin />
    </AdminRoute>
  } />
</Routes>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register /admin route in App"
```

---

### Task 7: Sidebar admin link

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add Shield to lucide-react import**

Change the existing import line from:

```tsx
import {
  LayoutDashboard, CreditCard, Banknote, Users,
  HandCoins, Wallet, FileBarChart, X,
} from 'lucide-react';
```

To:

```tsx
import {
  LayoutDashboard, CreditCard, Banknote, Users,
  HandCoins, Wallet, FileBarChart, X, Shield,
} from 'lucide-react';
```

- [ ] **Step 2: Add useAuth import**

Add this import after the existing react-router-dom import:

```tsx
import { useAuth } from '../contexts/AuthContext';
```

- [ ] **Step 3: Read isAdmin inside the Sidebar component**

Inside the `Sidebar` function body, before the `return`, add:

```tsx
const { isAdmin } = useAuth();
const adminActive = location.pathname === '/admin';
```

- [ ] **Step 4: Add admin section below `</nav>` and before `</aside>`**

Find the closing `</nav>` tag and add the following block immediately after it (still inside `<aside>`):

```tsx
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
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit and push**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add conditional admin link in Sidebar"
git push origin main
```

---

## Post-setup checklist (after Supabase is configured)

Run these steps in order once the Supabase project is created and `.env.local` has the correct keys:

1. Run migrations 001 through 005 in the Supabase SQL Editor (or `supabase db push`)
2. Open the app and sign up with `douglas_barcellos01@hotmail.com`
3. Open the Supabase SQL Editor and run the contents of `supabase/seed_admin.sql`
4. Log out and log back in as the admin account
5. Verify the **Shield "Admin"** link appears at the bottom of the Sidebar
6. Navigate to `/admin` — confirm the user list loads with stats columns
7. Test block: create a second test account, block it from the admin panel, log out, attempt to log in as that account — Supabase should return a "User is banned" error
8. Test delete: delete the test account and confirm it disappears from the list
