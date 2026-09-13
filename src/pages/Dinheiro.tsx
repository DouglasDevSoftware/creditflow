import { useState } from 'react';
import { Banknote, Plus, Eye, Trash2, X, Loader2, TrendingUp, Pencil } from 'lucide-react';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatDate } from '../utils/format';
import type { FundoDinheiro } from '../types';

export default function Dinheiro() {
  const { fundosDinheiro, operacoes, loading, getClienteNome, createFundoDinheiro, adicionarCapitalFundo, updateFundoDinheiro, deleteFundoDinheiro } = useData();
  const { showToast } = useToast();

  const [selectedFundo, setSelectedFundo] = useState<FundoDinheiro | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAporte, setShowAporte] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [valorAporte, setValorAporte] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string } | null>(null);
  const [editForm, setEditForm] = useState<Partial<FundoDinheiro>>({});
  const [form, setForm] = useState({ nome: '', valorInvestido: '', taxaPadrao: '10', observacoes: '' });

  const totalInvestido = fundosDinheiro.reduce((s, f) => s + f.valorInvestido, 0);
  const totalDisponivel = fundosDinheiro.reduce((s, f) => s + f.valorDisponivel, 0);
  const totalEmprestado = totalInvestido - totalDisponivel;

  const getFundoOperacoes = (fundoId: string) => operacoes.filter(o => o.fundoDinheiroId === fundoId);
  const getFundoTotalReceber = (fundoId: string) => getFundoOperacoes(fundoId)
    .filter(o => o.status !== 'pago')
    .reduce((s, o) => {
      const pago = o.parcelas.filter(p => p.status === 'paga').reduce((sum, p) => sum + p.valor, 0);
      const principalJaDevolvido = o.principalQuitado ? o.valorEnviado : 0;
      return s + (o.valorTotalReceber - pago - principalJaDevolvido);
    }, 0);

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    const err = await createFundoDinheiro({
      nome: form.nome,
      valorInvestido: Number(form.valorInvestido),
      taxaPadrao: Number(form.taxaPadrao),
      observacoes: form.observacoes,
    });
    setSaving(false);
    if (err) { setFormError(err); return; }
    setShowForm(false);
    setForm({ nome: '', valorInvestido: '', taxaPadrao: '10', observacoes: '' });
    showToast('Fundo criado com sucesso!');
  };

  const handleOpenEdit = (f: FundoDinheiro) => {
    setEditForm({ ...f });
    setShowEditForm(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedFundo) return;
    setSaving(true);
    setFormError(null);
    const err = await updateFundoDinheiro(selectedFundo.id, {
      nome: editForm.nome ?? '',
      taxaPadrao: Number(editForm.taxaPadrao),
      status: (editForm.status ?? 'ativo') as 'ativo' | 'bloqueado',
      observacoes: editForm.observacoes ?? '',
    });
    setSaving(false);
    if (err) { setFormError(err); return; }
    setShowEditForm(false);
    setSelectedFundo(null);
    showToast('Fundo atualizado!');
  };

  const handleAporte = async () => {
    if (!selectedFundo) return;
    setSaving(true);
    setFormError(null);
    const err = await adicionarCapitalFundo(selectedFundo.id, Number(valorAporte));
    setSaving(false);
    if (err) { setFormError(err); return; }
    setShowAporte(false);
    setValorAporte('');
    showToast('Capital adicionado com sucesso!');
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const err = await deleteFundoDinheiro(confirmDelete.id);
    setConfirmDelete(null);
    if (err) { showToast(err, 'error'); return; }
    setSelectedFundo(null);
    showToast('Fundo excluído.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 input-glass text-sm";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dinheiro</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Capital próprio para empréstimos com juros definidos por você</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" /> Novo Fundo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Investido" value={formatCurrency(totalInvestido)} icon={<Banknote className="w-5 h-5" />} color="green" />
        <KPICard title="Disponível p/ Empréstimo" value={formatCurrency(totalDisponivel)} icon={<Banknote className="w-5 h-5" />} color="blue" />
        <KPICard title="Emprestado" value={formatCurrency(totalEmprestado)} icon={<TrendingUp className="w-5 h-5" />} color="yellow" />
        <KPICard title="Fundos Ativos" value={fundosDinheiro.filter(f => f.status === 'ativo').length.toString()} icon={<Banknote className="w-5 h-5" />} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {fundosDinheiro.length === 0 && (
          <div className="gc-card col-span-full flex flex-col items-center justify-center py-16 text-center"
            style={{ color: 'var(--text-tertiary)' }}>
            <Banknote className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhum fundo de dinheiro cadastrado.</p>
            <p className="text-xs mt-1">Adicione capital próprio para emprestar com a taxa de juros que você definir.</p>
          </div>
        )}
        {fundosDinheiro.map(fundo => {
          const percentUsado = fundo.valorInvestido > 0
            ? ((fundo.valorInvestido - fundo.valorDisponivel) / fundo.valorInvestido) * 100
            : 0;
          const ops = getFundoOperacoes(fundo.id);
          return (
            <div key={fundo.id} className="gc-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{fundo.nome}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Taxa padrão: {fundo.taxaPadrao}%</p>
                </div>
                <StatusBadge status={fundo.status} />
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-tertiary)' }}>Utilizado</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{percentUsado.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <div className={`h-2 rounded-full transition-all ${percentUsado > 80 ? 'bg-danger-500' : percentUsado > 50 ? 'bg-warning-500' : 'bg-success-500'}`}
                    style={{ width: `${Math.min(percentUsado, 100)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="chip p-2">
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Disponível</p>
                  <p className="text-sm font-bold text-success-600">{formatCurrency(fundo.valorDisponivel)}</p>
                </div>
                <div className="chip p-2">
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Operações</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{ops.length}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                <button onClick={() => setSelectedFundo(fundo)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  <Eye className="w-3.5 h-3.5" /> Detalhes
                </button>
                <button onClick={() => { setSelectedFundo(fundo); handleOpenEdit(fundo); }}
                  className="flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setConfirmDelete({ id: fundo.id, nome: fundo.nome })}
                  className="btn-danger-ghost flex items-center justify-center px-3 py-1.5 text-xs font-medium">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedFundo && !showEditForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setSelectedFundo(null); setShowAporte(false); }}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col modal-shell" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedFundo.nome}</h2>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Taxa padrão: {selectedFundo.taxaPadrao}%</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleOpenEdit(selectedFundo)} className="p-2 rounded-lg hover:bg-white/5" title="Editar">
                  <Pencil className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
                <button onClick={() => { setSelectedFundo(null); setShowAporte(false); }} className="p-2 rounded-lg hover:bg-white/5">
                  <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="chip p-3">
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Investido</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(selectedFundo.valorInvestido)}</p>
                </div>
                <div className="chip p-3">
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Disponível</p>
                  <p className="text-sm font-bold text-success-600">{formatCurrency(selectedFundo.valorDisponivel)}</p>
                </div>
                <div className="chip p-3">
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>A Receber</p>
                  <p className="text-sm font-bold text-primary-600">{formatCurrency(getFundoTotalReceber(selectedFundo.id))}</p>
                </div>
              </div>
              <button onClick={() => setShowAporte(!showAporte)}
                className="btn-secondary w-full py-2 text-sm">
                + Aportar mais capital
              </button>
              {showAporte && (
                <div className="flex gap-2">
                  <input type="number" value={valorAporte} onChange={e => setValorAporte(e.target.value)}
                    placeholder="Valor do aporte" className="flex-1 px-3 py-2 input-glass text-sm" />
                  <button onClick={handleAporte} disabled={saving || !valorAporte}
                    className="btn-primary px-4 py-2 text-sm">
                    {saving ? 'Aguarde...' : 'Confirmar'}
                  </button>
                </div>
              )}
              {formError && <p className="text-sm text-danger-600">{formError}</p>}
              {selectedFundo.observacoes && (
                <p className="chip text-sm p-3" style={{ color: 'var(--text-primary)' }}>{selectedFundo.observacoes}</p>
              )}
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Operações com este fundo</h4>
                <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--glass-border)' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Data</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Cliente</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Valor</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Taxa</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFundoOperacoes(selectedFundo.id).map(op => (
                        <tr key={op.id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{formatDate(op.dataTransacao)}</td>
                          <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{getClienteNome(op.clienteId)}</td>
                          <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(op.valorEnviado)}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {op.taxaAplicada}%
                            {op.tipoCobranca === 'somente_juros' && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>Juros</span>
                            )}
                          </td>
                          <td className="px-3 py-2"><StatusBadge status={op.status} /></td>
                        </tr>
                      ))}
                      {getFundoOperacoes(selectedFundo.id).length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Nenhuma operação registrada.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditForm && selectedFundo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditForm(false)}>
          <div className="w-full max-w-lg overflow-hidden modal-shell" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Editar Fundo</h2>
              <button onClick={() => setShowEditForm(false)} className="p-2 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nome do Fundo</label>
                <input value={editForm.nome ?? ''} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Taxa Padrão (%)</label>
                <input type="number" value={editForm.taxaPadrao ?? ''} onChange={e => setEditForm(f => ({ ...f, taxaPadrao: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
                <select value={editForm.status ?? 'ativo'} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as FundoDinheiro['status'] }))} className={inputCls}>
                  <option value="ativo">Ativo</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Observações</label>
                <textarea value={editForm.observacoes ?? ''} onChange={e => setEditForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Para adicionar capital ao fundo, use o botão "Aportar mais capital" nos detalhes.
              </p>
              {formError && <p className="text-sm text-danger-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                <button onClick={() => setShowEditForm(false)} className="btn-secondary px-4 py-2 text-sm">Cancelar</button>
                <button onClick={handleSaveEdit} disabled={saving || !editForm.nome}
                  className="btn-primary px-4 py-2 text-sm">
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Fund Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg overflow-hidden modal-shell" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Novo Fundo de Dinheiro</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nome do Fundo</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={inputCls} placeholder="Ex: Caixa Principal, Reserva" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Valor Investido (R$)</label>
                  <input type="number" value={form.valorInvestido} onChange={e => setForm(f => ({ ...f, valorInvestido: e.target.value }))} className={inputCls} placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Taxa Padrão (%)</label>
                  <input type="number" value={form.taxaPadrao} onChange={e => setForm(f => ({ ...f, taxaPadrao: e.target.value }))} className={inputCls} placeholder="10" />
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                A taxa padrão é sugerida ao criar operações. Você pode alterar a taxa em cada empréstimo.
              </p>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
              </div>
              {formError && <p className="text-sm text-danger-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2 text-sm">Cancelar</button>
                <button onClick={handleSave} disabled={saving || !form.nome || !form.valorInvestido}
                  className="btn-primary px-4 py-2 text-sm">
                  {saving ? 'Salvando...' : 'Salvar Fundo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Excluir fundo?"
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
