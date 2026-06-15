import {
  CreditCard, HandCoins, AlertTriangle,
  TrendingUp, Clock, DollarSign, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import { Loader2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils/format';
import { getInadimplenciaMensal, getMovimentacoesMensais } from '../utils/charts';

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

const CHART_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 'var(--radius-card)',
  padding: '20px',
};

const CHART_TITLE: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginBottom: '16px',
};

const AXIS_TICK = { fontSize: 11, fill: 'var(--text-muted)' };

function mesAnterior(yyyymm: string) {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return d.toISOString().slice(0, 7);
}

function calcTrend(current: number, previous: number): { value: string; direction: 'up' | 'down' | 'neutral' } | undefined {
  if (previous === 0) return undefined;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '';
  return { value: `${sign}${pct.toFixed(0)}% vs mês anterior`, direction: pct >= 0 ? 'up' : 'down' };
}

export default function Dashboard() {
  const { cartoes, fundosDinheiro, clientes, operacoes, movimentacoes, loading, getClienteNome } = useData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  const mesAtual = new Date().toISOString().slice(0, 7);
  const mesPrevio = mesAnterior(mesAtual);
  const recebimentosMensal = getMovimentacoesMensais(movimentacoes);
  const usoPorCartao = [
    ...cartoes.map(c => ({
      name: `💳 ${c.banco}`,
      usado: c.limiteTotal - c.limiteDisponivel,
      disponivel: c.limiteDisponivel,
    })),
    ...fundosDinheiro.map(f => ({
      name: `💵 ${f.nome}`,
      usado: f.valorInvestido - f.valorDisponivel,
      disponivel: f.valorDisponivel,
    })),
  ];
  const inadimplenciaPeriodo = getInadimplenciaMensal(operacoes);
  const totalLimiteCartoes = cartoes.reduce((sum, c) => sum + c.limiteTotal, 0);
  const totalDisponivelCartoes = cartoes.reduce((sum, c) => sum + c.limiteDisponivel, 0);
  const totalInvestidoDinheiro = fundosDinheiro.reduce((sum, f) => sum + f.valorInvestido, 0);
  const totalDisponivelDinheiro = fundosDinheiro.reduce((sum, f) => sum + f.valorDisponivel, 0);
  const totalLimite = totalLimiteCartoes + totalInvestidoDinheiro;
  const totalDisponivel = totalDisponivelCartoes + totalDisponivelDinheiro;
  const totalComprometido = totalLimite - totalDisponivel;
  const totalEmprestado = operacoes.reduce((sum, o) => sum + o.valorEnviado, 0);
  const totalReceber = operacoes
    .filter(o => o.status !== 'pago')
    .reduce((sum, o) => {
      const pago = o.parcelas.filter(p => p.status === 'paga').reduce((s, p) => s + p.valor, 0);
      return sum + (o.valorTotalReceber - pago);
    }, 0);
  const totalVencido = operacoes.reduce((sum, o) => {
    return sum + o.parcelas.filter(p => p.status === 'vencida').reduce((s, p) => s + p.valor, 0);
  }, 0);
  const clientesInadimplentes = clientes.filter(c => c.situacao === 'inadimplente').length;
  const entradasMes = movimentacoes.filter(m => m.tipo === 'entrada' && m.data.startsWith(mesAtual)).reduce((s, m) => s + m.valor, 0);
  const saidasMes = movimentacoes.filter(m => m.tipo === 'saida' && m.data.startsWith(mesAtual)).reduce((s, m) => s + m.valor, 0);
  const lucroEstimado = operacoes.reduce((sum, o) => sum + (o.valorTotalReceber - o.valorEnviado), 0);

  const opsAtual = operacoes.filter(o => o.dataTransacao.startsWith(mesAtual));
  const opsPrevio = operacoes.filter(o => o.dataTransacao.startsWith(mesPrevio));
  const receberAtual = opsAtual.reduce((s, o) => s + o.valorTotalReceber, 0);
  const receberPrevio = opsPrevio.reduce((s, o) => s + o.valorTotalReceber, 0);
  const lucroAtual = opsAtual.reduce((s, o) => s + (o.valorTotalReceber - o.valorEnviado), 0);
  const lucroPrevio = opsPrevio.reduce((s, o) => s + (o.valorTotalReceber - o.valorEnviado), 0);

  const operacoesRecentes = [...operacoes].sort((a, b) => b.dataTransacao.localeCompare(a.dataTransacao)).slice(0, 5);
  const proximosRecebimentos = operacoes
    .flatMap(o => o.parcelas.filter(p => p.status === 'pendente').map(p => ({ ...p, operacaoId: o.id, clienteId: o.clienteId })))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 5);

  const TH: React.CSSProperties = {
    padding: '8px 20px',
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'var(--text-muted)',
    background: 'rgba(255,255,255,0.02)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  };

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-[20px] font-extrabold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Visão geral do seu negócio</p>
      </div>

      {/* KPIs row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Patrimônio Disponível"
          value={formatCurrency(totalDisponivel)}
          icon={<CreditCard className="w-4 h-4" />}
          color="blue"
          primary
          trend={{ value: `${((totalDisponivel / totalLimite) * 100).toFixed(0)}% do total`, direction: 'neutral' }}
        />
        <KPICard
          title="Total a Receber"
          value={formatCurrency(totalReceber)}
          icon={<TrendingUp className="w-4 h-4" />}
          color="green"
          trend={calcTrend(receberAtual, receberPrevio)}
        />
        <KPICard
          title="Valor Vencido"
          value={formatCurrency(totalVencido)}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="red"
          trend={{ value: `${clientesInadimplentes} inadimplente(s)`, direction: 'down' }}
        />
        <KPICard
          title="Lucro Estimado"
          value={formatCurrency(lucroEstimado)}
          icon={<DollarSign className="w-4 h-4" />}
          color="purple"
          trend={calcTrend(lucroAtual, lucroPrevio)}
        />
      </div>

      {/* KPIs row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Limite Comprometido"
          value={formatCurrency(totalComprometido)}
          icon={<CreditCard className="w-4 h-4" />}
          color="yellow"
        />
        <KPICard
          title="Total Emprestado"
          value={formatCurrency(totalEmprestado)}
          icon={<HandCoins className="w-4 h-4" />}
          color="blue"
        />
        <KPICard
          title="Entradas do Mês"
          value={formatCurrency(entradasMes)}
          icon={<ArrowDownCircle className="w-4 h-4" />}
          color="green"
        />
        <KPICard
          title="Saídas do Mês"
          value={formatCurrency(saidasMes)}
          icon={<ArrowUpCircle className="w-4 h-4" />}
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Entradas x Saídas */}
        <div style={CHART_CARD}>
          <h3 style={CHART_TITLE}>Entradas × Saídas (Últimos 5 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={recebimentosMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="mes" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="entradas" fill="#00d5c4" radius={[4, 4, 0, 0]} name="Entradas" />
              <Bar dataKey="saidas"   fill="#ef4444" radius={[4, 4, 0, 0]} name="Saídas"   />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Uso por cartão */}
        <div style={CHART_CARD}>
          <h3 style={CHART_TITLE}>Uso do Patrimônio (Cartões + Dinheiro)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={usoPorCartao} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={80} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="usado"      stackId="a" fill="#00d5c4" name="Utilizado" />
              <Bar dataKey="disponivel" stackId="a" fill="rgba(255,255,255,0.08)" name="Disponível" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Inadimplência */}
        <div style={CHART_CARD}>
          <h3 style={CHART_TITLE}>Evolução da Inadimplência</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={inadimplenciaPeriodo}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="mes" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="valor" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Inadimplência" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Operações por status */}
        <div style={CHART_CARD}>
          <h3 style={CHART_TITLE}>Operações por Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Em Aberto',    value: operacoes.filter(o => o.status === 'em_aberto').length },
                  { name: 'Parc. Pago',   value: operacoes.filter(o => o.status === 'pago_parcialmente').length },
                  { name: 'Pago',         value: operacoes.filter(o => o.status === 'pago').length },
                  { name: 'Atrasado',     value: operacoes.filter(o => o.status === 'atrasado').length },
                  { name: 'Inadimplente', value: operacoes.filter(o => o.status === 'inadimplente').length },
                ]}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Operações recentes */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={CHART_TITLE}>Operações Recentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th style={TH}>Cliente</th>
                  <th style={TH}>Valor</th>
                  <th style={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {operacoesRecentes.map(op => (
                  <tr
                    key={op.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,213,196,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {getClienteNome(op.clienteId)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {formatDate(op.dataTransacao)}
                      </div>
                    </td>
                    <td style={{ padding: '11px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatCurrency(op.valorEnviado)}
                    </td>
                    <td style={{ padding: '11px 20px' }}>
                      <StatusBadge status={op.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Próximos recebimentos */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={CHART_TITLE}>Próximos Recebimentos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th style={TH}>Cliente</th>
                  <th style={TH}>Valor</th>
                  <th style={TH}>Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {proximosRecebimentos.map((p, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,213,196,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 20px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {getClienteNome(p.clienteId)}
                    </td>
                    <td style={{ padding: '11px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatCurrency(p.valor)}
                    </td>
                    <td style={{ padding: '11px 20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                        {formatDate(p.vencimento)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 'var(--radius-card)',
        padding: '18px 20px',
      }}>
        <h3 style={{ ...CHART_TITLE, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle className="w-3.5 h-3.5" />
          Alertas Financeiros
        </h3>
        <div className="space-y-2">
          {totalVencido > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', fontSize: '12px', color: '#f87171' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 6px var(--danger)', animation: 'pulse 2s infinite', flexShrink: 0, display: 'inline-block' }} />
              Valor vencido total: <strong style={{ margin: '0 4px' }}>{formatCurrency(totalVencido)}</strong> — {clientesInadimplentes} cliente(s) inadimplente(s)
            </div>
          )}
          {cartoes.filter(c => c.limiteDisponivel < c.limiteTotal * 0.2).map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', fontSize: '12px', color: '#fbbf24' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', flexShrink: 0, display: 'inline-block' }} />
              Cartão <strong style={{ margin: '0 4px' }}>{c.nome}</strong> com limite baixo: {formatCurrency(c.limiteDisponivel)} disponível de {formatCurrency(c.limiteTotal)}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,213,196,0.07)', border: '1px solid rgba(0,213,196,0.18)', fontSize: '12px', color: 'var(--accent)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', flexShrink: 0, display: 'inline-block' }} />
            {proximosRecebimentos.length} parcela(s) pendente(s) nos próximos 30 dias
          </div>
        </div>
      </div>
    </div>
  );
}
