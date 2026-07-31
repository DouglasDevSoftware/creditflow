import { useState } from 'react';
import { HandCoins, Plus, Search, Eye, X, Calendar, Loader2, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatDate } from '../utils/format';
import type { Operacao } from '../types';

export default function Operacoes() {
  const {
    operacoes, cartoes, fundosDinheiro, clientes, loading,
    getClienteNome, getFonteNome,
    createOperacao, updateOperacao, deleteOperacao, pagarParcela,
  } = useData();
  const { showToast } = useToast();

  const [selectedOp, setSelectedOp] = useState<Operacao | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [payingParcelaId, setPayingParcelaId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);

  const [form, setForm] = useState({
    clienteId: '', fonte: 'cartao' as 'cartao' | 'dinheiro', cartaoId: '', fundoDinheiroId: '',
    valorEnviado: '', taxaAplicada: '10', tipoCobranca: 'total' as 'total' | 'somente_juros',
    formaPagamento: 'parcelado' as 'avista' | 'parcelado', quantidadeParcelas: '3', observacoes: '',
  });
  const [editForm, setEditForm] = useState({ observacoes: '', status: '' as Operacao['status'] });

  const opsFiltradas = operacoes.filter(o => {
    const matchBusca = busca === '' || getClienteNome(o.clienteId).toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || o.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const totalEmprestado = operacoes.reduce((s, o) => s + o.valorEnviado, 0);
  const totalReceber = operacoes.filter(o => o.status !== 'pago').reduce((s, o) => {
    const pago = o.parcelas.filter(p => p.status === 'paga').reduce((sum, p) => sum + p.valor, 0);
    return s + (o.valorTotalReceber - pago);
  }, 0);
  const lucroTotal = operacoes.reduce((s, o) => s + (o.valorTotalReceber - o.valorEnviado), 0);
  const opsAtivas = operacoes.filter(o => o.status !== 'pago').length;

  const valorEnviadoNum = Number(form.valorEnviado) || 0;
  const taxaNum = Number(form.taxaAplicada) || 0;
  const parcelasNum = form.formaPagamento === 'avista' ? 1 : Number(form.quantidadeParcelas) || 1;
  const somenteJurosSelecionado = form.fonte === 'dinheiro' && form.tipoCobranca === 'somente_juros';
  const jurosPorPeriodo = valorEnviadoNum * (taxaNum / 100);
  const previewTotalReceber = valorEnviadoNum * (1 + taxaNum / 100);
  const lucro = previewTotalReceber - valorEnviadoNum;
  const valorParcela = parcelasNum > 0 ? previewTotalReceber / parcelasNum : 0;

  const resetForm = () => setForm({
    clienteId: '', fonte: 'cartao', cartaoId: '', fundoDinheiroId: '',
    valorEnviado: '', taxaAplicada: '10', tipoCobranca: 'total',
    formaPagamento: 'parcelado', quantidadeParcelas: '3', observacoes: '',
  });

  const handleSaveOperacao = async () => {
    setSaving(true);
    setFormError(null);
    const err = await createOperacao({
      clienteId: form.clienteId,
      fonte: form.fonte,
      cartaoId: form.fonte === 'cartao' ? form.cartaoId : undefined,
      fundoDinheiroId: form.fonte === 'dinheiro' ? form.fundoDinheiroId : undefined,
      valorEnviado: valorEnviadoNum,
      taxaAplicada: taxaNum,
      tipoCobranca: form.fonte === 'dinheiro' ? form.tipoCobranca : 'total',
      formaPagamento: form.formaPagamento,
      quantidadeParcelas: parcelasNum,
      observacoes: form.observacoes,
    });
    setSaving(false);
    if (err) { setFormError(err); return; }
    setShowForm(false);
    resetForm();
    showToast('Operação registrada com sucesso!');
  };

  const handleOpenEdit = (op: Operacao) => {
    setEditForm({ observacoes: op.observacoes, status: op.status });
    setShowEditForm(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedOp) return;
    setSaving(true);
    setFormError(null);
    const err = await updateOperacao(selectedOp.id, {
      observacoes: editForm.observacoes,
      status: editForm.status,
    });
    setSaving(false);
    if (err) { setFormError(err); return; }
    setShowEditForm(false);
    setSelectedOp(null);
    showToast('Operação atualizada!');
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const err = await deleteOperacao(confirmDelete.id);
    setConfirmDelete(null);
    if (err) { showToast(err, 'error'); return; }
    setSelectedOp(null);
    showToast('Operação excluída.');
  };

  const handlePagarParcela = async (parcelaId: string, operacaoId: string) => {
    setPayingParcelaId(parcelaId);
    const err = await pagarParcela(parcelaId, operacaoId);
    setPayingParcelaId(null);
    if (err) { showToast(err, 'error'); return; }
    // Refresh selectedOp from updated operacoes list happens via refresh()
    showToast('Parcela baixada com sucesso!');
    setSelectedOp(null);
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Operações</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Controle de empréstimos e negociações</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nova Operação
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Emprestado" value={formatCurrency(totalEmprestado)} icon={<HandCoins className="w-5 h-5" />} color="blue" />
        <KPICard title="Total a Receber" value={formatCurrency(totalReceber)} icon={<HandCoins className="w-5 h-5" />} color="green" />
        <KPICard title="Lucro Previsto" value={formatCurrency(lucroTotal)} icon={<HandCoins className="w-5 h-5" />} color="purple" />
        <KPICard title="Operações Ativas" value={opsAtivas.toString()} icon={<HandCoins className="w-5 h-5" />} color="yellow" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por cliente..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="px-4 py-2.5 rounded-lg border text-sm"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <option value="todos">Todos os Status</option>
          <option value="em_aberto">Em Aberto</option>
          <option value="pago_parcialmente">Parcialmente Pago</option>
          <option value="pago">Pago</option>
          <option value="atrasado">Atrasado</option>
          <option value="inadimplente">Inadimplente</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        {opsFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <HandCoins className="w-12 h-12 mb-3 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {busca || filtroStatus !== 'todos' ? 'Nenhuma operação encontrada com esses filtros.' : 'Nenhuma operação registrada.'}
            </p>
            {!busca && filtroStatus === 'todos' && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Crie a primeira operação clicando em "Nova Operação".</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Fonte</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Enviado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Taxa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>A Receber</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Parcelas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {opsFiltradas.map(op => (
                  <tr key={op.id} className="border-t hover:bg-[var(--bg-tertiary)] transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{getClienteNome(op.clienteId)}</div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(op.dataTransacao)}</div>
                    </td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>{getFonteNome(op)}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(op.valorEnviado)}</td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>{op.taxaAplicada}%</td>
                    <td className="px-4 py-3 text-sm font-medium hidden sm:table-cell" style={{ color: 'var(--text-primary)' }}>{formatCurrency(op.valorTotalReceber)}</td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>{op.quantidadeParcelas}x {formatCurrency(op.parcelas[0]?.valor || 0)}</td>
                    <td className="px-4 py-3"><StatusBadge status={op.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedOp(op)} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
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
      {selectedOp && !showEditForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedOp(null)}>
          <div className="w-full max-w-3xl max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--modal-bg)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Operação #{selectedOp.id.slice(0, 8).toUpperCase()}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {getClienteNome(selectedOp.clienteId)} • {formatDate(selectedOp.dataTransacao)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleOpenEdit(selectedOp)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
                {!selectedOp.parcelas.some(p => p.status === 'paga') && (
                  <button
                    onClick={() => setConfirmDelete({ id: selectedOp.id, label: `Op. #${selectedOp.id.slice(0, 8).toUpperCase()}` })}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title="Excluir">
                    <Trash2 className="w-4 h-4 text-danger-500" />
                  </button>
                )}
                <button onClick={() => setSelectedOp(null)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                  <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Valor Enviado</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(selectedOp.valorEnviado)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Taxa</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selectedOp.taxaAplicada}%</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total a Receber</p>
                  <p className="text-sm font-bold text-primary-600">{formatCurrency(selectedOp.valorTotalReceber)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Lucro</p>
                  <p className="text-sm font-bold text-success-600">{formatCurrency(selectedOp.valorTotalReceber - selectedOp.valorEnviado)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Fonte</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{getFonteNome(selectedOp)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Forma Pgto</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selectedOp.formaPagamento === 'avista' ? 'À vista' : `${selectedOp.quantidadeParcelas}x`}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Status</p>
                  <div className="mt-0.5"><StatusBadge status={selectedOp.status} /></div>
                </div>
              </div>
              {selectedOp.observacoes && (
                <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Observações</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedOp.observacoes}</p>
                </div>
              )}
              {/* Parcelas table */}
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Parcelas</h4>
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>#</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Valor</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Vencimento</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Pagamento</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOp.parcelas.map(p => (
                        <tr key={p.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                          <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.numero}/{selectedOp.quantidadeParcelas}</td>
                          <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.valor)}</td>
                          <td className="px-3 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(p.vencimento)}</div>
                          </td>
                          <td className="px-3 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {p.dataPagamento ? formatDate(p.dataPagamento) : '—'}
                          </td>
                          <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                          <td className="px-3 py-2">
                            {(p.status === 'pendente' || p.status === 'vencida') && (
                              <button
                                onClick={() => handlePagarParcela(p.id, selectedOp.id)}
                                disabled={payingParcelaId === p.id}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                              >
                                {payingParcelaId === p.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <CheckCircle2 className="w-3 h-3" />
                                }
                                Pagar
                              </button>
                            )}
                          </td>
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
      {selectedOp && showEditForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditForm(false)}>
          <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--modal-bg)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Editar Operação</h2>
              <button onClick={() => setShowEditForm(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Operacao['status'] }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  <option value="em_aberto">Em Aberto</option>
                  <option value="pago_parcialmente">Parcialmente Pago</option>
                  <option value="pago">Pago</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="inadimplente">Inadimplente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Observações</label>
                <textarea value={editForm.observacoes} onChange={e => setEditForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3} className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </div>
              {formError && <p className="text-sm text-danger-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button onClick={() => setShowEditForm(false)} className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-[var(--bg-tertiary)] transition-colors" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancelar</button>
                <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Operacao Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--modal-bg)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Nova Operação</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Cliente</label>
                  <select value={form.clienteId} onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option value="">Selecione um cliente</option>
                    {clientes.filter(c => c.situacao !== 'bloqueado').map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Fonte do Patrimônio</label>
                  <select value={form.fonte}
                    onChange={e => {
                      const fonte = e.target.value as 'cartao' | 'dinheiro';
                      setForm(f => ({ ...f, fonte, cartaoId: '', fundoDinheiroId: '', taxaAplicada: '10', tipoCobranca: 'total' }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="dinheiro">Dinheiro (capital próprio)</option>
                  </select>
                </div>
                {form.fonte === 'dinheiro' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tipo de Cobrança</label>
                    <select value={form.tipoCobranca}
                      onChange={e => setForm(f => ({ ...f, tipoCobranca: e.target.value as 'total' | 'somente_juros' }))}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                      <option value="total">Valor Total (principal + juros)</option>
                      <option value="somente_juros">Somente Juros (principal fica em aberto)</option>
                    </select>
                  </div>
                )}
                {form.fonte === 'cartao' ? (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Cartão</label>
                    <select value={form.cartaoId} onChange={e => setForm(f => ({ ...f, cartaoId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                      <option value="">Selecione um cartão</option>
                      {cartoes.filter(c => c.status === 'ativo').map(c => (
                        <option key={c.id} value={c.id}>{c.nome} (Disponível: {formatCurrency(c.limiteDisponivel)})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Fundo de Dinheiro</label>
                    <select value={form.fundoDinheiroId}
                      onChange={e => {
                        const fundo = fundosDinheiro.find(f => f.id === e.target.value);
                        setForm(f => ({ ...f, fundoDinheiroId: e.target.value, taxaAplicada: fundo ? String(fundo.taxaPadrao) : f.taxaAplicada }));
                      }}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                      <option value="">Selecione um fundo</option>
                      {fundosDinheiro.filter(f => f.status === 'ativo').map(f => (
                        <option key={f.id} value={f.id}>{f.nome} (Disponível: {formatCurrency(f.valorDisponivel)} | Taxa: {f.taxaPadrao}%)</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Valor Enviado (Pix)</label>
                  <input type="number" value={form.valorEnviado} onChange={e => setForm(f => ({ ...f, valorEnviado: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Taxa (%)</label>
                  <input type="number" value={form.taxaAplicada} onChange={e => setForm(f => ({ ...f, taxaAplicada: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} placeholder="10" />
                </div>
                {!somenteJurosSelecionado && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Forma de Pagamento</label>
                      <select value={form.formaPagamento} onChange={e => setForm(f => ({ ...f, formaPagamento: e.target.value as 'avista' | 'parcelado' }))}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        <option value="avista">À Vista</option>
                        <option value="parcelado">Parcelado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Parcelas</label>
                      <input type="number" value={form.quantidadeParcelas} onChange={e => setForm(f => ({ ...f, quantidadeParcelas: e.target.value }))}
                        disabled={form.formaPagamento === 'avista'}
                        className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        placeholder="1" min={1} max={24} />
                    </div>
                  </>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Observações</label>
                  <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    rows={2} className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>Resumo da Operação (prévia)</p>
                {somenteJurosSelecionado ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Juros por Período</p>
                        <p className="text-sm font-bold text-success-600">{valorEnviadoNum ? formatCurrency(jurosPorPeriodo) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Principal (fica em aberto)</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{valorEnviadoNum ? formatCurrency(valorEnviadoNum) : '—'}</p>
                      </div>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                      O cliente paga só os juros a cada período. O principal fica em aberto até você quitar manualmente.
                    </p>
                  </>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total a Receber</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{valorEnviadoNum ? formatCurrency(previewTotalReceber) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Lucro</p>
                      <p className="text-sm font-bold text-success-600">{valorEnviadoNum ? formatCurrency(lucro) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Valor Parcela</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{valorEnviadoNum ? formatCurrency(valorParcela) : '—'}</p>
                    </div>
                  </div>
                )}
              </div>
              {formError && <p className="text-sm text-danger-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-[var(--bg-tertiary)] transition-colors" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancelar</button>
                <button onClick={handleSaveOperacao}
                  disabled={saving || !form.clienteId || (form.fonte === 'cartao' ? !form.cartaoId : !form.fundoDinheiroId) || !valorEnviadoNum}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Registrar Operação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <ConfirmModal
          title="Excluir operação?"
          message={`Tem certeza que deseja excluir a ${confirmDelete.label}? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
