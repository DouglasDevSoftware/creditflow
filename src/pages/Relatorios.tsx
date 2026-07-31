import { useRef } from 'react';
import { FileBarChart, Download, Printer } from 'lucide-react';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils/format';
import { getMovimentacoesMensais } from '../utils/charts';

type ReportType = 'clientes' | 'cartoes' | 'operacoes' | 'inadimplencia' | 'fluxo' | 'lucro' | 'contas';

const reportOptions: { value: ReportType; label: string }[] = [
  { value: 'clientes', label: 'Por Cliente' },
  { value: 'cartoes', label: 'Por Cartão' },
  { value: 'operacoes', label: 'Operações' },
  { value: 'inadimplencia', label: 'Inadimplência' },
  { value: 'fluxo', label: 'Fluxo de Caixa' },
  { value: 'lucro', label: 'Lucro Mensal' },
  { value: 'contas', label: 'Contas a Receber' },
];

function escapeCsv(v: string | number) {
  let s = String(v);
  // Neutraliza gatilhos de fórmula (Excel/LibreOffice interpretam célula iniciada
  // por = + - @ como fórmula, mesmo dentro de aspas) — CSV formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r') ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(rows: (string | number)[][]): string {
  return rows.map(r => r.map(escapeCsv).join(',')).join('\n');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Relatorios() {
  const { operacoes, clientes, cartoes, movimentacoes, loading, getClienteNome, getFonteNome } = useData();
  const [selectedReport, setSelectedReport] = useState<ReportType>('clientes');
  const printRef = useRef<HTMLDivElement>(null);

  const lucroMensal = getMovimentacoesMensais(movimentacoes).map(m => ({
    mes: m.mes,
    lucro: m.entradas - m.saidas,
    entradas: m.entradas,
    saidas: m.saidas,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const handlePrint = () => {
    const area = printRef.current;
    if (!area) return;
    const prev = area.id;
    area.id = 'print-area';
    window.print();
    area.id = prev;
  };

  const handleDownloadCsv = () => {
    let csv = '';
    const label = reportOptions.find(r => r.value === selectedReport)?.label ?? selectedReport;
    const ts = new Date().toISOString().slice(0, 10);

    switch (selectedReport) {
      case 'clientes': {
        const rows: (string | number)[][] = [['Cliente', 'Situação', 'Telefone', 'Operações', 'Total Recebido', 'Em Aberto']];
        for (const c of clientes) {
          const ops = operacoes.filter(o => o.clienteId === c.id);
          const recebido = ops.reduce((s, o) => s + o.parcelas.filter(p => p.status === 'paga').reduce((sum, p) => sum + p.valor, 0), 0);
          const aberto = ops.reduce((s, o) => s + o.parcelas.filter(p => p.status !== 'paga').reduce((sum, p) => sum + p.valor, 0), 0);
          rows.push([c.nome, c.situacao, c.telefone ?? '', ops.length, recebido.toFixed(2), aberto.toFixed(2)]);
        }
        csv = buildCsv(rows);
        break;
      }
      case 'cartoes': {
        const rows: (string | number)[][] = [['Cartão', 'Banco', 'Bandeira', 'Últimos 4', 'Status', 'Limite Total', 'Disponível', 'Utilização %']];
        for (const c of cartoes) {
          const util = c.limiteTotal > 0 ? (((c.limiteTotal - c.limiteDisponivel) / c.limiteTotal) * 100).toFixed(0) + '%' : '0%';
          rows.push([c.nome, c.banco, c.bandeira, c.ultimos4, c.status, c.limiteTotal.toFixed(2), c.limiteDisponivel.toFixed(2), util]);
        }
        csv = buildCsv(rows);
        break;
      }
      case 'operacoes': {
        const rows: (string | number)[][] = [['Data', 'Cliente', 'Fonte', 'Valor Enviado', 'A Receber', 'Lucro', 'Taxa %', 'Parcelas', 'Status']];
        for (const o of operacoes) {
          rows.push([o.dataTransacao, getClienteNome(o.clienteId), getFonteNome(o), o.valorEnviado.toFixed(2), o.valorTotalReceber.toFixed(2), (o.valorTotalReceber - o.valorEnviado).toFixed(2), o.taxaAplicada, o.quantidadeParcelas, o.status]);
        }
        csv = buildCsv(rows);
        break;
      }
      case 'inadimplencia': {
        const opsIn = operacoes.filter(o => o.status === 'inadimplente' || o.status === 'atrasado');
        const rows: (string | number)[][] = [['Cliente', 'Status Op.', 'Valor Vencido', 'Parcelas Vencidas']];
        for (const o of opsIn) {
          const vencidas = o.parcelas.filter(p => p.status === 'vencida');
          rows.push([getClienteNome(o.clienteId), o.status, vencidas.reduce((s, p) => s + p.valor, 0).toFixed(2), vencidas.length]);
        }
        csv = buildCsv(rows);
        break;
      }
      case 'fluxo': {
        const rows: (string | number)[][] = [['Data', 'Descrição', 'Categoria', 'Origem', 'Tipo', 'Valor']];
        for (const m of [...movimentacoes].sort((a, b) => b.data.localeCompare(a.data))) {
          rows.push([m.data, m.descricao, m.categoria, m.origem, m.tipo, m.valor.toFixed(2)]);
        }
        csv = buildCsv(rows);
        break;
      }
      case 'lucro': {
        const rows: (string | number)[][] = [['Mês', 'Entradas', 'Saídas', 'Resultado']];
        for (const m of lucroMensal) {
          rows.push([m.mes, m.entradas.toFixed(2), m.saidas.toFixed(2), m.lucro.toFixed(2)]);
        }
        csv = buildCsv(rows);
        break;
      }
      case 'contas': {
        const rows: (string | number)[][] = [['Cliente', 'Vencimento', 'Valor', 'Status Parcela']];
        const contasR = operacoes
          .flatMap(o => o.parcelas.filter(p => p.status === 'pendente' || p.status === 'vencida').map(p => ({ ...p, clienteId: o.clienteId })))
          .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
        for (const p of contasR) {
          rows.push([getClienteNome(p.clienteId), p.vencimento, p.valor.toFixed(2), p.status]);
        }
        csv = buildCsv(rows);
        break;
      }
    }

    downloadCsv(csv, `creditflow-${label.toLowerCase().replace(/\s+/g, '-')}-${ts}.csv`);
  };

  const renderReport = () => {
    const thStyle = { color: 'var(--text-secondary)' };
    const trStyle = { borderColor: 'var(--border-color)' };
    const headerStyle = { backgroundColor: 'var(--bg-tertiary)' };

    switch (selectedReport) {
      case 'clientes':
        return (
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
            <table className="w-full">
              <thead>
                <tr style={headerStyle}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Situação</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Operações</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Total Recebido</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Em Aberto</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => {
                  const ops = operacoes.filter(o => o.clienteId === c.id);
                  const recebido = ops.reduce((s, o) => s + o.parcelas.filter(p => p.status === 'paga').reduce((sum, p) => sum + p.valor, 0), 0);
                  const aberto = ops.reduce((s, o) => s + o.parcelas.filter(p => p.status !== 'paga').reduce((sum, p) => sum + p.valor, 0), 0);
                  return (
                    <tr key={c.id} className="border-t" style={trStyle}>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.nome}</td>
                      <td className="px-4 py-3 text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{c.situacao}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{ops.length}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-success-600">{formatCurrency(recebido)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-warning-600">{formatCurrency(aberto)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      case 'cartoes':
        return (
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
            <table className="w-full">
              <thead>
                <tr style={headerStyle}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Cartão</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Limite Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Disponível</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Utilização</th>
                </tr>
              </thead>
              <tbody>
                {cartoes.map(c => (
                  <tr key={c.id} className="border-t" style={trStyle}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.nome}</div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{c.banco} • {c.bandeira}</div>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{c.status}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(c.limiteTotal)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-success-600">{formatCurrency(c.limiteDisponivel)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>
                      {c.limiteTotal > 0 ? (((c.limiteTotal - c.limiteDisponivel) / c.limiteTotal) * 100).toFixed(0) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'operacoes':
        return (
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
            <table className="w-full">
              <thead>
                <tr style={headerStyle}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Fonte</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Enviado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>A Receber</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Lucro</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {operacoes.map(o => (
                  <tr key={o.id} className="border-t" style={trStyle}>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(o.dataTransacao)}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{getClienteNome(o.clienteId)}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{getFonteNome(o)}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(o.valorEnviado)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-primary-600">{formatCurrency(o.valorTotalReceber)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-success-600">{formatCurrency(o.valorTotalReceber - o.valorEnviado)}</td>
                    <td className="px-4 py-3 text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{o.status.replace(/_/g, ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'inadimplencia': {
        const opsInadimplentes = operacoes.filter(o => o.status === 'inadimplente' || o.status === 'atrasado');
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Operações Inadimplentes</p>
                <p className="text-xl font-bold text-danger-600">{opsInadimplentes.length}</p>
              </div>
              <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Valor Total Vencido</p>
                <p className="text-xl font-bold text-danger-600">
                  {formatCurrency(opsInadimplentes.reduce((s, o) => s + o.parcelas.filter(p => p.status === 'vencida').reduce((sum, p) => sum + p.valor, 0), 0))}
                </p>
              </div>
              <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Clientes Afetados</p>
                <p className="text-xl font-bold text-warning-600">{new Set(opsInadimplentes.map(o => o.clienteId)).size}</p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
              <table className="w-full">
                <thead>
                  <tr style={headerStyle}>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Valor Vencido</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Parcelas Vencidas</th>
                  </tr>
                </thead>
                <tbody>
                  {opsInadimplentes.map(o => (
                    <tr key={o.id} className="border-t" style={trStyle}>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{getClienteNome(o.clienteId)}</td>
                      <td className="px-4 py-3 text-sm capitalize text-danger-600 font-medium">{o.status.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-danger-600">
                        {formatCurrency(o.parcelas.filter(p => p.status === 'vencida').reduce((s, p) => s + p.valor, 0))}
                      </td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-secondary)' }}>
                        {o.parcelas.filter(p => p.status === 'vencida').length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      case 'fluxo':
        return (
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
            <table className="w-full">
              <thead>
                <tr style={headerStyle}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Categoria</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {[...movimentacoes].sort((a, b) => b.data.localeCompare(a.data)).map(m => (
                  <tr key={m.id} className="border-t" style={trStyle}>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(m.data)}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{m.descricao}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{m.categoria}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${m.tipo === 'entrada' ? 'text-success-600' : 'text-danger-600'}`}>
                      {m.tipo === 'entrada' ? '+' : '-'} {formatCurrency(m.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'lucro':
        return (
          <div className="space-y-4">
            <div className="p-5 rounded-lg border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Resultado Mensal (Entradas - Saídas)</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={lucroMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="lucro" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Resultado" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
              <table className="w-full">
                <thead>
                  <tr style={headerStyle}>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Mês</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Entradas</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Saídas</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {lucroMensal.map(m => (
                    <tr key={m.mes} className="border-t" style={trStyle}>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.mes}</td>
                      <td className="px-4 py-3 text-sm text-right text-success-600">{formatCurrency(m.entradas)}</td>
                      <td className="px-4 py-3 text-sm text-right text-danger-600">{formatCurrency(m.saidas)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${m.lucro >= 0 ? 'text-success-600' : 'text-danger-600'}`}>{formatCurrency(m.lucro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'contas': {
        const contasReceber = operacoes
          .flatMap(o => o.parcelas.filter(p => p.status === 'pendente' || p.status === 'vencida').map(p => ({ ...p, clienteId: o.clienteId })))
          .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Contas a Receber ({contasReceber.length})</h4>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
              <table className="w-full">
                <thead>
                  <tr style={headerStyle}>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Vencimento</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={thStyle}>Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contasReceber.map((p, i) => (
                    <tr key={i} className="border-t" style={trStyle}>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{getClienteNome(p.clienteId)}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(p.vencimento)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.valor)}</td>
                      <td className={`px-4 py-3 text-sm capitalize font-medium ${p.status === 'vencida' ? 'text-danger-600' : ''}`} style={p.status !== 'vencida' ? { color: 'var(--text-secondary)' } : {}}>{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
    }
  };

  const currentLabel = reportOptions.find(r => r.value === selectedReport)?.label ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Relatórios</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Análises e visões detalhadas do negócio</p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {reportOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedReport(opt.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedReport === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'border hover:bg-[var(--bg-tertiary)]'
              }`}
              style={selectedReport !== opt.value ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' } : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <Printer className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      <div ref={printRef} className="rounded-xl border p-5" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 mb-4">
          <FileBarChart className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{currentLabel}</h3>
        </div>
        {renderReport()}
      </div>
    </div>
  );
}
