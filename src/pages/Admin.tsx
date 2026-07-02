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
