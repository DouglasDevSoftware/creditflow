import type { MovimentacaoFinanceira } from '../types';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function getMovimentacoesMensais(movimentacoes: MovimentacaoFinanceira[], months = 5) {
  const result: { mes: string; entradas: number; saidas: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1); // evita overflow de mês (ex: 31/mai -> setMonth(3) viraria 1/jul em vez de 30/abr)
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const mesLabel = MESES[d.getMonth()];

    const doMes = movimentacoes.filter(m => m.data.startsWith(key));
    result.push({
      mes: mesLabel,
      entradas: doMes.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0),
      saidas: doMes.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0),
    });
  }

  return result;
}

export function getInadimplenciaMensal(
  operacoes: { parcelas: { status: string; valor: number; vencimento: string }[] }[],
  months = 5,
) {
  const result: { mes: string; valor: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1); // evita overflow de mês (ex: 31/mai -> setMonth(3) viraria 1/jul em vez de 30/abr)
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const mesLabel = MESES[d.getMonth()];

    const valor = operacoes.reduce((sum, op) => {
      return sum + op.parcelas
        .filter(p => p.status === 'vencida' && p.vencimento.startsWith(key))
        .reduce((s, p) => s + p.valor, 0);
    }, 0);

    result.push({ mes: mesLabel, valor });
  }

  return result;
}
