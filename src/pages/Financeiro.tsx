import { useState } from 'react';
import { Wallet, Plus, ArrowUpCircle, ArrowDownCircle, TrendingUp, X, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import KPICard from '../components/KPICard';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils/format';
import { getMovimentacoesMensais } from '../utils/charts';

const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function labelMes(yyyymm: string) {
  const [y, m] = yyyymm.split('-');
  return `${NOMES_MES[parseInt(m) - 1]}/${y}`;
}

function yyyymmPrevio(yyyymm: string) {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return d.toISOString().slice(0, 7);
}

function trendVsAnterior(current: number, previous: number): { value: string; direction: 'up' | 'down' | 'neutral' } | undefined {
  if (previous === 0) return undefined;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '';
  return { value: `${sign}${pct.toFixed(0)}% vs mês anterior`, direction: pct >= 0 ? 'up' : 'down' };
}

export default function Financeiro() {
  const { movimentacoes, loading, createMovimentacao } = useData();
  const mesAtual = new Date().toISOString().slice(0, 7);
  const mesPrevio = yyyymmPrevio(mesAtual);

  const ultimos12Meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  const [showForm, setShowForm] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState(mesAtual);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo: 'saida' as 'entrada' | 'saida',
    categoria: 'Despesa',
    descricao: '',
    valor: '',
    formaPagamento: 'Pix',
  });

  const movFiltradas = movimentacoes.filter(m => {
    const matchTipo = filtroTipo === 'todos' || m.tipo === filtroTipo;
    const matchCategoria = filtroCategoria === 'todos' || m.categoria === filtroCategoria;
    const matchPeriodo = filtroPeriodo === 'todos' || m.data.startsWith(filtroPeriodo);
    return matchTipo && matchCategoria && matchPeriodo;
  }).sort((a, b) => b.data.localeCompare(a.data));

  const entradasPeriodo = movFiltradas.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0);
  const saidasPeriodo = movFiltradas.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0);
  const saldoPeriodo = entradasPeriodo - saidasPeriodo;

  const entradasMes = movimentacoes.filter(m => m.tipo === 'entrada' && m.data.startsWith(mesAtual)).reduce((s, m) => s + m.valor, 0);
  const saidasMes = movimentacoes.filter(m => m.tipo === 'saida' && m.data.startsWith(mesAtual)).reduce((s, m) => s + m.valor, 0);
  const entradasPrevio = movimentacoes.filter(m => m.tipo === 'entrada' && m.data.startsWith(mesPrevio)).reduce((s, m) => s + m.valor, 0);
  const saidasPrevio = movimentacoes.filter(m => m.tipo === 'saida' && m.data.startsWith(mesPrevio)).reduce((s, m) => s + m.valor, 0);
  const saldoAtual = movimentacoes.reduce((s, m) => m.tipo === 'entrada' ? s + m.valor : s - m.valor, 0);
  const lucroAcumulado = entradasMes - saidasMes;
  const resumoMensal = getMovimentacoesMensais(movimentacoes);

  let saldoAcumulado = 0;
  const evolucaoSaldo = resumoMensal.map(m => {
    saldoAcumulado += m.entradas - m.saidas;
    return { mes: m.mes, saldo: saldoAcumulado };
  });

  const categorias = [...new Set(movimentacoes.map(m => m.categoria))];

  const handleSaveMovimentacao = async () => {
    setSaving(true);
    setFormError(null);
    const err = await createMovimentacao({
      data: form.data,
      tipo: form.tipo,
      categoria: form.categoria,
      descricao: form.descricao,
      valor: Number(form.valor),
      origem: 'manual',
      formaPagamento: form.formaPagamento,
    });
    setSaving(false);
    if (err) {
      setFormError(err);
      return;
    }
    setShowForm(false);
    setForm({ data: new Date().toISOString().slice(0, 10), tipo: 'saida', categoria: 'Despesa', descricao: '', valor: '', formaPagamento: 'Pix' });
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Fluxo Financeiro</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Controle de entradas, saídas e saldo</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Novo Lançamento
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Entradas do Mês" value={formatCurrency(entradasMes)} icon={<ArrowDownCircle className="w-5 h-5" />} color="green" trend={trendVsAnterior(entradasMes, entradasPrevio)} />
        <KPICard title="Saídas do Mês" value={formatCurrency(saidasMes)} icon={<ArrowUpCircle className="w-5 h-5" />} color="red" trend={trendVsAnterior(saidasMes, saidasPrevio)} />
        <KPICard title="Saldo Atual" value={formatCurrency(saldoAtual)} icon={<Wallet className="w-5 h-5" />} color="blue" />
        <KPICard title="Resultado do Mês" value={formatCurrency(lucroAcumulado)} icon={<TrendingUp className="w-5 h-5" />} color={lucroAcumulado >= 0 ? 'green' : 'red'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Entradas x Saídas por Mês</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={resumoMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} name="Entradas" />
              <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saídas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Evolução do Saldo</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolucaoSaldo}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Saldo" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={filtroPeriodo}
          onChange={e => setFiltroPeriodo(e.target.value)}
          className="px-4 py-2.5 rounded-lg border text-sm"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          <option value="todos">Todos os Períodos</option>
          {ultimos12Meses.map(mm => (
            <option key={mm} value={mm}>{labelMes(mm)}</option>
          ))}
        </select>
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="px-4 py-2.5 rounded-lg border text-sm"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          <option value="todos">Todos os Tipos</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saídas</option>
        </select>
        <select
          value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value)}
          className="px-4 py-2.5 rounded-lg border text-sm"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          <option value="todos">Todas Categorias</option>
          {categorias.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Summary for filtered */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Entradas (filtro)</p>
          <p className="text-lg font-bold text-success-600">{formatCurrency(entradasPeriodo)}</p>
        </div>
        <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Saídas (filtro)</p>
          <p className="text-lg font-bold text-danger-600">{formatCurrency(saidasPeriodo)}</p>
        </div>
        <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Saldo (filtro)</p>
          <p className={`text-lg font-bold ${saldoPeriodo >= 0 ? 'text-success-600' : 'text-danger-600'}`}>{formatCurrency(saldoPeriodo)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Origem</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {movFiltradas.map(m => (
                <tr key={m.id} className="border-t hover:bg-[var(--bg-tertiary)] transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(m.data)}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.descricao}</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.formaPagamento}</div>
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--bg-tertiary)' }}>{m.categoria}</span>
                  </td>
                  <td className="px-4 py-3 text-sm hidden lg:table-cell" style={{ color: 'var(--text-tertiary)' }}>{m.origem}</td>
                  <td className={`px-4 py-3 text-sm font-semibold text-right ${m.tipo === 'entrada' ? 'text-success-600' : 'text-danger-600'}`}>
                    {m.tipo === 'entrada' ? '+' : '-'} {formatCurrency(m.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--modal-bg)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Novo Lançamento</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'entrada' | 'saida' }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Data</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Valor</label>
                  <input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option>Recebimento</option>
                    <option>Empréstimo</option>
                    <option>Despesa</option>
                    <option>Fatura</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Descrição</label>
                  <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Forma Pgto/Recebimento</label>
                  <select value={form.formaPagamento} onChange={e => setForm(f => ({ ...f, formaPagamento: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option>Pix</option>
                    <option>Transferência</option>
                    <option>Boleto</option>
                    <option>Débito</option>
                    <option>Dinheiro</option>
                  </select>
                </div>
              </div>
              {formError && <p className="text-sm text-danger-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-[var(--bg-tertiary)] transition-colors" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancelar</button>
                <button onClick={handleSaveMovimentacao} disabled={saving || !form.descricao || !form.valor} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar Lançamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
