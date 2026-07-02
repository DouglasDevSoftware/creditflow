import { useState } from 'react';
import { CreditCard, Plus, Eye, Trash2, X, Loader2, Pencil } from 'lucide-react';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatDate } from '../utils/format';
import type { Cartao } from '../types';

export default function Cartoes() {
  const { cartoes, operacoes, loading, getClienteNome, createCartao, updateCartao, deleteCartao } = useData();
  const { showToast } = useToast();

  const [selectedCartao, setSelectedCartao] = useState<Cartao | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string } | null>(null);

  const emptyForm = { nome: '', banco: '', bandeira: 'Visa', ultimos4: '', limiteTotal: '', limiteDisponivel: '', vencimentoFatura: '10', melhorDiaCompra: '1' };
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState<Partial<Cartao>>({});

  const totalLimite = cartoes.reduce((s, c) => s + c.limiteTotal, 0);
  const totalDisponivel = cartoes.reduce((s, c) => s + c.limiteDisponivel, 0);
  const totalComprometido = totalLimite - totalDisponivel;
  const totalTransacoes = operacoes.length;

  const getCartaoOperacoes = (cartaoId: string) => operacoes.filter(o => o.fonte === 'cartao' && o.cartaoId === cartaoId);
  const getCartaoTotalEmprestado = (cartaoId: string) => getCartaoOperacoes(cartaoId).reduce((s, o) => s + o.valorEnviado, 0);
  const getCartaoTotalReceber = (cartaoId: string) => getCartaoOperacoes(cartaoId)
    .filter(o => o.status !== 'pago')
    .reduce((s, o) => {
      const pago = o.parcelas.filter(p => p.status === 'paga').reduce((sum, p) => sum + p.valor, 0);
      return s + (o.valorTotalReceber - pago);
    }, 0);

  const handleSaveCartao = async () => {
    setSaving(true);
    setFormError(null);
    const err = await createCartao({
      nome: form.nome, banco: form.banco, bandeira: form.bandeira, ultimos4: form.ultimos4,
      limiteTotal: Number(form.limiteTotal),
      limiteDisponivel: Number(form.limiteDisponivel || form.limiteTotal),
      vencimentoFatura: Number(form.vencimentoFatura),
      melhorDiaCompra: Number(form.melhorDiaCompra),
    });
    setSaving(false);
    if (err) { setFormError(err); return; }
    setShowForm(false);
    setForm(emptyForm);
    showToast('Cartão cadastrado com sucesso!');
  };

  const handleOpenEdit = (c: Cartao) => {
    setEditForm({ ...c });
    setShowEditForm(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCartao) return;
    setSaving(true);
    setFormError(null);
    const err = await updateCartao(selectedCartao.id, {
      nome: editForm.nome,
      banco: editForm.banco,
      bandeira: editForm.bandeira,
      ultimos4: editForm.ultimos4,
      limiteTotal: Number(editForm.limiteTotal),
      limiteDisponivel: Number(editForm.limiteDisponivel),
      vencimentoFatura: Number(editForm.vencimentoFatura),
      melhorDiaCompra: Number(editForm.melhorDiaCompra),
      status: editForm.status,
    });
    setSaving(false);
    if (err) { setFormError(err); return; }
    setShowEditForm(false);
    setSelectedCartao(null);
    showToast('Cartão atualizado!');
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const err = await deleteCartao(confirmDelete.id);
    setConfirmDelete(null);
    if (err) { showToast(err, 'error'); return; }
    setSelectedCartao(null);
    showToast('Cartão excluído.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm";
  const inputStyle = { borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Cartões</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Gerencie seus cartões de crédito</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Novo Cartão
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Limite Total" value={formatCurrency(totalLimite)} icon={<CreditCard className="w-5 h-5" />} color="blue" />
        <KPICard title="Limite Disponível" value={formatCurrency(totalDisponivel)} icon={<CreditCard className="w-5 h-5" />} color="green" />
        <KPICard title="Limite Comprometido" value={formatCurrency(totalComprometido)} icon={<CreditCard className="w-5 h-5" />} color="yellow" />
        <KPICard title="Total de Transações" value={totalTransacoes.toString()} icon={<CreditCard className="w-5 h-5" />} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cartoes.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 rounded-xl border text-center"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>
            <CreditCard className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhum cartão cadastrado.</p>
            <p className="text-xs mt-1">Adicione um cartão de crédito para começar.</p>
          </div>
        )}
        {cartoes.map(cartao => {
          const percentUsado = ((cartao.limiteTotal - cartao.limiteDisponivel) / cartao.limiteTotal) * 100;
          const ops = getCartaoOperacoes(cartao.id);
          return (
            <div key={cartao.id} className="rounded-xl border p-5 hover:shadow-lg transition-all"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{cartao.nome}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{cartao.banco} • {cartao.bandeira}</p>
                </div>
                <StatusBadge status={cartao.status} />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono tracking-widest px-2 py-1 rounded"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  •••• {cartao.ultimos4}
                </span>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-tertiary)' }}>Utilizado</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{percentUsado.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className={`h-2 rounded-full transition-all ${percentUsado > 80 ? 'bg-danger-500' : percentUsado > 50 ? 'bg-warning-500' : 'bg-primary-500'}`}
                    style={{ width: `${Math.min(percentUsado, 100)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Disponível</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(cartao.limiteDisponivel)}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Transações</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{ops.length}</p>
                </div>
              </div>
              <div className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                Vencimento: dia {cartao.vencimentoFatura} • Melhor compra: dia {cartao.melhorDiaCompra}
              </div>
              <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button onClick={() => setSelectedCartao(cartao)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  <Eye className="w-3.5 h-3.5" /> Detalhes
                </button>
                <button onClick={() => { setSelectedCartao(cartao); handleOpenEdit(cartao); }}
                  className="flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setConfirmDelete({ id: cartao.id, nome: cartao.nome })}
                  className="flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-danger-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedCartao && !showEditForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCartao(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--modal-bg)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedCartao.nome}</h2>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{selectedCartao.banco} • {selectedCartao.bandeira} • •••• {selectedCartao.ultimos4}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleOpenEdit(selectedCartao)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]" title="Editar">
                  <Pencil className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
                <button onClick={() => setSelectedCartao(null)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                  <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Limite Total</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(selectedCartao.limiteTotal)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Disponível</p>
                  <p className="text-sm font-bold text-success-600">{formatCurrency(selectedCartao.limiteDisponivel)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Comprometido</p>
                  <p className="text-sm font-bold text-warning-600">{formatCurrency(selectedCartao.limiteTotal - selectedCartao.limiteDisponivel)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total Emprestado</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(getCartaoTotalEmprestado(selectedCartao.id))}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>A Receber</p>
                  <p className="text-sm font-bold text-primary-600">{formatCurrency(getCartaoTotalReceber(selectedCartao.id))}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Transações</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{getCartaoOperacoes(selectedCartao.id).length}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Histórico de Operações</h4>
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Data</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Cliente</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Enviado</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Taxa</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Parcelas</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCartaoOperacoes(selectedCartao.id).map(op => (
                        <tr key={op.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{formatDate(op.dataTransacao)}</td>
                          <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{getClienteNome(op.clienteId)}</td>
                          <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(op.valorEnviado)}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{op.taxaAplicada}%</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{op.quantidadeParcelas}x</td>
                          <td className="px-3 py-2"><StatusBadge status={op.status} /></td>
                        </tr>
                      ))}
                      {getCartaoOperacoes(selectedCartao.id).length === 0 && (
                        <tr><td colSpan={6} className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Nenhuma operação registrada.</td></tr>
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
      {showEditForm && selectedCartao && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditForm(false)}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--modal-bg)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Editar Cartão</h2>
              <button onClick={() => setShowEditForm(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nome do Cartão</label>
                  <input value={editForm.nome ?? ''} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Banco/Emissor</label>
                  <input value={editForm.banco ?? ''} onChange={e => setEditForm(f => ({ ...f, banco: e.target.value }))} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Bandeira</label>
                  <select value={editForm.bandeira ?? 'Visa'} onChange={e => setEditForm(f => ({ ...f, bandeira: e.target.value }))} className={inputCls} style={inputStyle}>
                    <option>Visa</option><option>Mastercard</option><option>Elo</option><option>Amex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Últimos 4 Números</label>
                  <input value={editForm.ultimos4 ?? ''} onChange={e => setEditForm(f => ({ ...f, ultimos4: e.target.value }))} className={inputCls} style={inputStyle} maxLength={4} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Limite Total</label>
                  <input type="number" value={editForm.limiteTotal ?? ''} onChange={e => setEditForm(f => ({ ...f, limiteTotal: Number(e.target.value) }))} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Limite Disponível</label>
                  <input type="number" value={editForm.limiteDisponivel ?? ''} onChange={e => setEditForm(f => ({ ...f, limiteDisponivel: Number(e.target.value) }))} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vencimento Fatura (dia)</label>
                  <input type="number" value={editForm.vencimentoFatura ?? ''} onChange={e => setEditForm(f => ({ ...f, vencimentoFatura: Number(e.target.value) }))} className={inputCls} style={inputStyle} min={1} max={31} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Melhor Dia Compra</label>
                  <input type="number" value={editForm.melhorDiaCompra ?? ''} onChange={e => setEditForm(f => ({ ...f, melhorDiaCompra: Number(e.target.value) }))} className={inputCls} style={inputStyle} min={1} max={31} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
                  <select value={editForm.status ?? 'ativo'} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Cartao['status'] }))} className={inputCls} style={inputStyle}>
                    <option value="ativo">Ativo</option>
                    <option value="bloqueado">Bloqueado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
              {formError && <p className="text-sm text-danger-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button onClick={() => setShowEditForm(false)} className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-[var(--bg-tertiary)] transition-colors" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancelar</button>
                <button onClick={handleSaveEdit} disabled={saving || !editForm.nome || !editForm.banco}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Card Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--modal-bg)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Novo Cartão</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nome do Cartão</label>
                  <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Ex: Nubank Platinum" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Banco/Emissor</label>
                  <input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Ex: Nubank" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Bandeira</label>
                  <select value={form.bandeira} onChange={e => setForm(f => ({ ...f, bandeira: e.target.value }))} className={inputCls} style={inputStyle}>
                    <option>Visa</option><option>Mastercard</option><option>Elo</option><option>Amex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Últimos 4 Números</label>
                  <input value={form.ultimos4} onChange={e => setForm(f => ({ ...f, ultimos4: e.target.value }))} className={inputCls} style={inputStyle} placeholder="0000" maxLength={4} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Limite Total</label>
                  <input type="number" value={form.limiteTotal} onChange={e => setForm(f => ({ ...f, limiteTotal: e.target.value }))} className={inputCls} style={inputStyle} placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Limite Disponível</label>
                  <input type="number" value={form.limiteDisponivel} onChange={e => setForm(f => ({ ...f, limiteDisponivel: e.target.value }))} className={inputCls} style={inputStyle} placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vencimento Fatura (dia)</label>
                  <input type="number" value={form.vencimentoFatura} onChange={e => setForm(f => ({ ...f, vencimentoFatura: e.target.value }))} className={inputCls} style={inputStyle} placeholder="10" min={1} max={31} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Melhor Dia Compra</label>
                  <input type="number" value={form.melhorDiaCompra} onChange={e => setForm(f => ({ ...f, melhorDiaCompra: e.target.value }))} className={inputCls} style={inputStyle} placeholder="1" min={1} max={31} />
                </div>
              </div>
              {formError && <p className="text-sm text-danger-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-[var(--bg-tertiary)] transition-colors" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancelar</button>
                <button onClick={handleSaveCartao} disabled={saving || !form.nome || !form.banco}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar Cartão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Excluir cartão?"
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
