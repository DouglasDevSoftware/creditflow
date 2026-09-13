import { useState } from 'react';
import { Users, Plus, Search, Eye, X, Phone, Mail, MapPin, Loader2, Pencil, Trash2 } from 'lucide-react';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatDate } from '../utils/format';
import type { Cliente } from '../types';

export default function Clientes() {
  const { clientes, operacoes, loading, getFonteNome, createCliente, updateCliente, deleteCliente } = useData();
  const { showToast } = useToast();

  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string } | null>(null);

  const [form, setForm] = useState({ nome: '', cpf: '', telefone: '', email: '', cidade: '', observacoes: '' });
  const [editForm, setEditForm] = useState<Partial<Cliente>>({});

  const clientesFiltrados = clientes.filter(c => {
    const matchBusca = busca === '' ||
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.cpf.includes(busca) ||
      c.telefone.includes(busca);
    const matchStatus = filtroStatus === 'todos' || c.situacao === filtroStatus;
    return matchBusca && matchStatus;
  });

  const getClienteOperacoes = (clienteId: string) => operacoes.filter(o => o.clienteId === clienteId);
  const getClienteTotalRecebido = (clienteId: string) =>
    getClienteOperacoes(clienteId).reduce((sum, o) =>
      sum + o.parcelas.filter(p => p.status === 'paga').reduce((s, p) => s + p.valor, 0), 0);
  const getClienteTotalAberto = (clienteId: string) =>
    getClienteOperacoes(clienteId).reduce((sum, o) =>
      sum + o.parcelas.filter(p => p.status !== 'paga').reduce((s, p) => s + p.valor, 0), 0);
  const getClienteDiasAtraso = (clienteId: string) => {
    const parcelasVencidas = getClienteOperacoes(clienteId).flatMap(o => o.parcelas.filter(p => p.status === 'vencida'));
    if (parcelasVencidas.length === 0) return 0;
    const maisAntiga = parcelasVencidas.sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
    return Math.max(0, Math.floor((new Date().getTime() - new Date(maisAntiga.vencimento).getTime()) / 86400000));
  };

  const totalClientes = clientes.length;
  const adimplentes = clientes.filter(c => c.situacao === 'adimplente').length;
  const inadimplentes = clientes.filter(c => c.situacao === 'inadimplente').length;
  const atrasados = clientes.filter(c => c.situacao === 'atrasado').length;

  const handleSaveCliente = async () => {
    setSaving(true);
    setFormError(null);
    const err = await createCliente(form);
    setSaving(false);
    if (err) { setFormError(err); return; }
    setShowForm(false);
    setForm({ nome: '', cpf: '', telefone: '', email: '', cidade: '', observacoes: '' });
    showToast('Cliente cadastrado com sucesso!');
  };

  const handleOpenEdit = (c: Cliente) => {
    setEditForm({ nome: c.nome, cpf: c.cpf, telefone: c.telefone, email: c.email, cidade: c.cidade, observacoes: c.observacoes, situacao: c.situacao });
    setShowEditForm(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCliente) return;
    setSaving(true);
    setFormError(null);
    const err = await updateCliente(selectedCliente.id, editForm);
    setSaving(false);
    if (err) { setFormError(err); return; }
    setShowEditForm(false);
    setSelectedCliente(null);
    showToast('Cliente atualizado!');
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const err = await deleteCliente(confirmDelete.id);
    setConfirmDelete(null);
    if (err) { showToast(err, 'error'); return; }
    setSelectedCliente(null);
    showToast('Cliente excluído.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Clientes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Gerencie sua carteira de clientes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total de Clientes" value={totalClientes.toString()} icon={<Users className="w-5 h-5" />} color="blue" />
        <KPICard title="Adimplentes" value={adimplentes.toString()} icon={<Users className="w-5 h-5" />} color="green" />
        <KPICard title="Atrasados" value={atrasados.toString()} icon={<Users className="w-5 h-5" />} color="yellow" />
        <KPICard title="Inadimplentes" value={inadimplentes.toString()} icon={<Users className="w-5 h-5" />} color="red" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="w-full pl-10 pr-4 py-2.5 input-glass text-sm" />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="px-4 py-2.5 input-glass text-sm">
          <option value="todos">Todos os Status</option>
          <option value="adimplente">Adimplente</option>
          <option value="atrasado">Atrasado</option>
          <option value="inadimplente">Inadimplente</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
      </div>

      <div className="gc-card overflow-hidden">
        {clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 mb-3 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {busca || filtroStatus !== 'todos' ? 'Nenhum cliente encontrado com esses filtros.' : 'Nenhum cliente cadastrado.'}
            </p>
            {!busca && filtroStatus === 'todos' && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Adicione o primeiro cliente clicando em "Novo Cliente".</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Cidade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Situação</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Em Aberto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map(cliente => (
                  <tr key={cliente.id} className="hover:bg-white/5 transition-colors" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cliente.nome}</div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{cliente.telefone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>{cliente.cpf}</td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>{cliente.cidade}</td>
                    <td className="px-4 py-3"><StatusBadge status={cliente.situacao} /></td>
                    <td className="px-4 py-3 text-sm font-medium hidden sm:table-cell" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(getClienteTotalAberto(cliente.id))}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedCliente(cliente)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Ver detalhes">
                        <Eye className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCliente && !showEditForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCliente(null)}>
          <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col modal-shell" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedCliente.nome}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <StatusBadge status={selectedCliente.situacao} />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Desde {formatDate(selectedCliente.dataCadastro)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleOpenEdit(selectedCliente)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
                <button
                  onClick={() => setConfirmDelete({ id: selectedCliente.id, nome: selectedCliente.nome })}
                  className="btn-danger-ghost p-2" title="Excluir">
                  <Trash2 className="w-4 h-4 text-danger-500" />
                </button>
                <button onClick={() => setSelectedCliente(null)} className="p-2 rounded-lg hover:bg-white/5">
                  <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Phone className="w-4 h-4" /> {selectedCliente.telefone || '—'}
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Mail className="w-4 h-4" /> {selectedCliente.email || '—'}
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <MapPin className="w-4 h-4" /> {selectedCliente.cidade || '—'}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="chip p-3">
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total Recebido</p>
                  <p className="text-sm font-bold text-success-600">{formatCurrency(getClienteTotalRecebido(selectedCliente.id))}</p>
                </div>
                <div className="chip p-3">
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Em Aberto</p>
                  <p className="text-sm font-bold text-warning-600">{formatCurrency(getClienteTotalAberto(selectedCliente.id))}</p>
                </div>
                <div className="chip p-3">
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Operações</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{getClienteOperacoes(selectedCliente.id).length}</p>
                </div>
                <div className="chip p-3">
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Dias Atraso</p>
                  <p className={`text-sm font-bold ${getClienteDiasAtraso(selectedCliente.id) > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                    {getClienteDiasAtraso(selectedCliente.id)}
                  </p>
                </div>
              </div>
              {selectedCliente.observacoes && (
                <div className="chip p-3">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Observações</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedCliente.observacoes}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Histórico de Operações</h4>
                <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--glass-border)' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Data</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Fonte</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Valor</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Parcelas</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getClienteOperacoes(selectedCliente.id).length === 0 ? (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Nenhuma operação.</td></tr>
                      ) : getClienteOperacoes(selectedCliente.id).map(op => (
                        <tr key={op.id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{formatDate(op.dataTransacao)}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{getFonteNome(op)}</td>
                          <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(op.valorEnviado)}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{op.quantidadeParcelas}x</td>
                          <td className="px-3 py-2"><StatusBadge status={op.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {selectedCliente && showEditForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditForm(false)}>
          <div className="w-full max-w-lg overflow-hidden modal-shell" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Editar Cliente</h2>
              <button onClick={() => setShowEditForm(false)} className="p-2 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nome Completo</label>
                  <input value={editForm.nome ?? ''} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full px-3 py-2 input-glass text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>CPF</label>
                  <input value={editForm.cpf ?? ''} onChange={e => setEditForm(f => ({ ...f, cpf: e.target.value }))}
                    className="w-full px-3 py-2 input-glass text-sm" placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Telefone</label>
                  <input value={editForm.telefone ?? ''} onChange={e => setEditForm(f => ({ ...f, telefone: e.target.value }))}
                    className="w-full px-3 py-2 input-glass text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>E-mail</label>
                  <input type="email" value={editForm.email ?? ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 input-glass text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Cidade</label>
                  <input value={editForm.cidade ?? ''} onChange={e => setEditForm(f => ({ ...f, cidade: e.target.value }))}
                    className="w-full px-3 py-2 input-glass text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Situação</label>
                  <select value={editForm.situacao ?? 'adimplente'} onChange={e => setEditForm(f => ({ ...f, situacao: e.target.value as Cliente['situacao'] }))}
                    className="w-full px-3 py-2 input-glass text-sm">
                    <option value="adimplente">Adimplente</option>
                    <option value="atrasado">Atrasado</option>
                    <option value="inadimplente">Inadimplente</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Observações</label>
                  <textarea value={editForm.observacoes ?? ''} onChange={e => setEditForm(f => ({ ...f, observacoes: e.target.value }))}
                    rows={3} className="w-full px-3 py-2 input-glass text-sm resize-none" />
                </div>
              </div>
              {formError && <p className="text-sm text-danger-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                <button onClick={() => setShowEditForm(false)} className="btn-secondary px-4 py-2 text-sm">Cancelar</button>
                <button onClick={handleSaveEdit} disabled={saving || !editForm.nome || !editForm.cpf}
                  className="btn-primary px-4 py-2 text-sm">
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Client Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg overflow-hidden modal-shell" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Novo Cliente</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nome Completo</label>
                  <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full px-3 py-2 input-glass text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>CPF</label>
                  <input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))}
                    className="w-full px-3 py-2 input-glass text-sm" placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Telefone</label>
                  <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    className="w-full px-3 py-2 input-glass text-sm" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 input-glass text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Cidade</label>
                  <input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                    className="w-full px-3 py-2 input-glass text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Observações</label>
                  <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    rows={3} className="w-full px-3 py-2 input-glass text-sm resize-none" />
                </div>
              </div>
              {formError && <p className="text-sm text-danger-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2 text-sm">Cancelar</button>
                <button onClick={handleSaveCliente} disabled={saving || !form.nome || !form.cpf}
                  className="btn-primary px-4 py-2 text-sm">
                  {saving ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Excluir cliente?"
          message={`Tem certeza que deseja excluir "${confirmDelete.nome}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
