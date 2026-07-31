import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { mapCartao, mapCliente, mapFundoDinheiro, mapMovimentacao, mapOperacao, mapParcela } from '../lib/mappers';
import type { Cartao, Cliente, FundoDinheiro, MovimentacaoFinanceira, Operacao } from '../types';
import { useAuth } from './AuthContext';

interface DataContextValue {
  cartoes: Cartao[];
  fundosDinheiro: FundoDinheiro[];
  clientes: Cliente[];
  operacoes: Operacao[];
  movimentacoes: MovimentacaoFinanceira[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getClienteNome: (id: string) => string;
  getCartaoNome: (id: string) => string;
  getFundoDinheiroNome: (id: string) => string;
  getFonteNome: (op: Operacao) => string;
  createCliente: (data: Omit<Cliente, 'id' | 'dataCadastro' | 'situacao'> & { situacao?: Cliente['situacao'] }) => Promise<string | null>;
  updateCliente: (id: string, data: Partial<Omit<Cliente, 'id' | 'dataCadastro'>>) => Promise<string | null>;
  deleteCliente: (id: string) => Promise<string | null>;
  createCartao: (data: Omit<Cartao, 'id' | 'status'> & { status?: Cartao['status'] }) => Promise<string | null>;
  updateCartao: (id: string, data: Partial<Omit<Cartao, 'id'>>) => Promise<string | null>;
  deleteCartao: (id: string) => Promise<string | null>;
  createFundoDinheiro: (data: Omit<FundoDinheiro, 'id' | 'status' | 'valorDisponivel'> & { status?: FundoDinheiro['status'] }) => Promise<string | null>;
  updateFundoDinheiro: (id: string, data: Pick<FundoDinheiro, 'nome' | 'taxaPadrao' | 'status' | 'observacoes'>) => Promise<string | null>;
  adicionarCapitalFundo: (id: string, valor: number) => Promise<string | null>;
  deleteFundoDinheiro: (id: string) => Promise<string | null>;
  createOperacao: (data: {
    clienteId: string;
    fonte: 'cartao' | 'dinheiro';
    cartaoId?: string;
    fundoDinheiroId?: string;
    valorEnviado: number;
    taxaAplicada: number;
    tipoCobranca?: 'total' | 'somente_juros';
    formaPagamento: 'avista' | 'parcelado';
    quantidadeParcelas: number;
    observacoes?: string;
  }) => Promise<string | null>;
  updateOperacao: (id: string, data: { observacoes?: string; status?: Operacao['status'] }) => Promise<string | null>;
  deleteOperacao: (id: string) => Promise<string | null>;
  pagarParcela: (parcelaId: string, operacaoId: string) => Promise<string | null>;
  createMovimentacao: (data: Omit<MovimentacaoFinanceira, 'id'>) => Promise<string | null>;
}

const DataContext = createContext<DataContextValue | null>(null);

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function calcularStatusOperacao(parcelas: { status: string }[]): Operacao['status'] {
  if (parcelas.length === 0) return 'em_aberto';
  const pagas = parcelas.filter(p => p.status === 'paga').length;
  const vencidas = parcelas.filter(p => p.status === 'vencida').length;
  if (pagas === parcelas.length) return 'pago';
  if (vencidas > 0) return 'atrasado';
  if (pagas > 0) return 'pago_parcialmente';
  return 'em_aberto';
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [fundosDinheiro, setFundosDinheiro] = useState<FundoDinheiro[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoFinanceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Internal helper — not exposed in context
  const recalcularStatusCliente = useCallback(async (clienteId: string) => {
    const { data: clienteRow } = await supabase
      .from('clientes')
      .select('situacao')
      .eq('id', clienteId)
      .single();

    if (clienteRow?.situacao === 'bloqueado') return;

    const { data: ops } = await supabase
      .from('operacoes')
      .select('id, status')
      .eq('cliente_id', clienteId)
      .neq('status', 'pago');

    if (!ops || ops.length === 0) {
      await supabase.from('clientes').update({ situacao: 'adimplente' }).eq('id', clienteId);
      return;
    }

    const opIds = ops.map(o => o.id as string);
    const { data: vencidas } = await supabase
      .from('parcelas')
      .select('id')
      .in('operacao_id', opIds)
      .eq('status', 'vencida')
      .limit(1);

    const temInadimplente = ops.some(o => o.status === 'inadimplente');
    const temVencida = (vencidas?.length ?? 0) > 0;

    let novaSituacao: Cliente['situacao'];
    if (temInadimplente) novaSituacao = 'inadimplente';
    else if (temVencida) novaSituacao = 'atrasado';
    else novaSituacao = 'adimplente';

    await supabase.from('clientes').update({ situacao: novaSituacao }).eq('id', clienteId);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setCartoes([]);
      setFundosDinheiro([]);
      setClientes([]);
      setOperacoes([]);
      setMovimentacoes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Auto-mark overdue parcelas as vencida
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: parcelasVencendo } = await supabase
      .from('parcelas')
      .select('id, operacao_id')
      .lt('vencimento', hoje)
      .eq('status', 'pendente');

    if (parcelasVencendo && parcelasVencendo.length > 0) {
      await supabase
        .from('parcelas')
        .update({ status: 'vencida' })
        .in('id', parcelasVencendo.map(p => p.id as string));

      // Update affected operations to 'atrasado'
      const affectedOpIds = [...new Set(parcelasVencendo.map(p => p.operacao_id as string))];
      await supabase
        .from('operacoes')
        .update({ status: 'atrasado' })
        .in('id', affectedOpIds)
        .not('status', 'in', '("pago","inadimplente")');
    }

    const [cartoesRes, fundosRes, clientesRes, operacoesRes, parcelasRes, movimentacoesRes] = await Promise.all([
      supabase.from('cartoes').select('*').order('nome'),
      supabase.from('fundos_dinheiro').select('*').order('nome'),
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('operacoes').select('*').order('data_transacao', { ascending: false }),
      supabase.from('parcelas').select('*').order('numero'),
      supabase.from('movimentacoes').select('*').order('data', { ascending: false }),
    ]);

    const firstError = cartoesRes.error ?? fundosRes.error ?? clientesRes.error ?? operacoesRes.error ?? parcelasRes.error ?? movimentacoesRes.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const parcelasByOp = new Map<string, ReturnType<typeof mapParcela>[]>();
    for (const row of parcelasRes.data ?? []) {
      const opId = row.operacao_id as string;
      const list = parcelasByOp.get(opId) ?? [];
      list.push(mapParcela(row));
      parcelasByOp.set(opId, list);
    }

    setCartoes((cartoesRes.data ?? []).map(mapCartao));
    setFundosDinheiro((fundosRes.data ?? []).map(mapFundoDinheiro));
    setClientes((clientesRes.data ?? []).map(mapCliente));
    setOperacoes((operacoesRes.data ?? []).map(row => mapOperacao(row, parcelasByOp.get(row.id as string) ?? [])));
    setMovimentacoes((movimentacoesRes.data ?? []).map(mapMovimentacao));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getClienteNome = useCallback((id: string) => clientes.find(c => c.id === id)?.nome ?? 'N/A', [clientes]);
  const getCartaoNome = useCallback((id: string) => cartoes.find(c => c.id === id)?.nome ?? 'N/A', [cartoes]);
  const getFundoDinheiroNome = useCallback((id: string) => fundosDinheiro.find(f => f.id === id)?.nome ?? 'N/A', [fundosDinheiro]);
  const getFonteNome = useCallback((op: Operacao) => {
    if (op.fonte === 'dinheiro' && op.fundoDinheiroId) {
      return `💵 ${getFundoDinheiroNome(op.fundoDinheiroId)}`;
    }
    if (op.cartaoId) return getCartaoNome(op.cartaoId);
    return 'N/A';
  }, [getCartaoNome, getFundoDinheiroNome]);

  // ── Clientes ──────────────────────────────────────────────────────────────

  const createCliente = async (data: Omit<Cliente, 'id' | 'dataCadastro' | 'situacao'> & { situacao?: Cliente['situacao'] }) => {
    const { error: insertError } = await supabase.from('clientes').insert({
      nome: data.nome,
      cpf: data.cpf,
      telefone: data.telefone,
      email: data.email,
      cidade: data.cidade,
      observacoes: data.observacoes,
      situacao: data.situacao ?? 'adimplente',
    });
    if (insertError) return insertError.message;
    await refresh();
    return null;
  };

  const updateCliente = async (id: string, data: Partial<Omit<Cliente, 'id' | 'dataCadastro'>>) => {
    const { error: updateError } = await supabase.from('clientes').update({
      ...(data.nome !== undefined && { nome: data.nome }),
      ...(data.cpf !== undefined && { cpf: data.cpf }),
      ...(data.telefone !== undefined && { telefone: data.telefone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.cidade !== undefined && { cidade: data.cidade }),
      ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
      ...(data.situacao !== undefined && { situacao: data.situacao }),
    }).eq('id', id);
    if (updateError) return updateError.message;
    await refresh();
    return null;
  };

  const deleteCliente = async (id: string) => {
    const hasOpenOps = operacoes.some(o => o.clienteId === id && o.status !== 'pago');
    if (hasOpenOps) return 'Cliente possui operações em aberto. Encerre todas as operações antes de excluir.';
    const { error: deleteError } = await supabase.from('clientes').delete().eq('id', id);
    if (deleteError) return deleteError.message;
    await refresh();
    return null;
  };

  // ── Cartões ───────────────────────────────────────────────────────────────

  const createCartao = async (data: Omit<Cartao, 'id' | 'status'> & { status?: Cartao['status'] }) => {
    const { error: insertError } = await supabase.from('cartoes').insert({
      nome: data.nome,
      banco: data.banco,
      bandeira: data.bandeira,
      ultimos4: data.ultimos4,
      limite_total: data.limiteTotal,
      limite_disponivel: data.limiteDisponivel,
      vencimento_fatura: data.vencimentoFatura,
      melhor_dia_compra: data.melhorDiaCompra,
      status: data.status ?? 'ativo',
    });
    if (insertError) return insertError.message;
    await refresh();
    return null;
  };

  const updateCartao = async (id: string, data: Partial<Omit<Cartao, 'id'>>) => {
    const { error: updateError } = await supabase.from('cartoes').update({
      ...(data.nome !== undefined && { nome: data.nome }),
      ...(data.banco !== undefined && { banco: data.banco }),
      ...(data.bandeira !== undefined && { bandeira: data.bandeira }),
      ...(data.ultimos4 !== undefined && { ultimos4: data.ultimos4 }),
      ...(data.limiteTotal !== undefined && { limite_total: data.limiteTotal }),
      ...(data.limiteDisponivel !== undefined && { limite_disponivel: data.limiteDisponivel }),
      ...(data.vencimentoFatura !== undefined && { vencimento_fatura: data.vencimentoFatura }),
      ...(data.melhorDiaCompra !== undefined && { melhor_dia_compra: data.melhorDiaCompra }),
      ...(data.status !== undefined && { status: data.status }),
    }).eq('id', id);
    if (updateError) return updateError.message;
    await refresh();
    return null;
  };

  const deleteCartao = async (id: string) => {
    const hasOps = operacoes.some(o => o.cartaoId === id);
    if (hasOps) return 'Cartão possui operações vinculadas. Remova as operações antes de excluir.';
    const { error: deleteError } = await supabase.from('cartoes').delete().eq('id', id);
    if (deleteError) return deleteError.message;
    await refresh();
    return null;
  };

  // ── Fundos de Dinheiro ────────────────────────────────────────────────────

  const createFundoDinheiro = async (data: Omit<FundoDinheiro, 'id' | 'status' | 'valorDisponivel'> & { status?: FundoDinheiro['status'] }) => {
    const { error: insertError } = await supabase.from('fundos_dinheiro').insert({
      nome: data.nome,
      valor_investido: data.valorInvestido,
      valor_disponivel: data.valorInvestido,
      taxa_padrao: data.taxaPadrao,
      status: data.status ?? 'ativo',
      observacoes: data.observacoes,
    });
    if (insertError) return insertError.message;
    await refresh();
    return null;
  };

  const updateFundoDinheiro = async (id: string, data: Pick<FundoDinheiro, 'nome' | 'taxaPadrao' | 'status' | 'observacoes'>) => {
    const { error: updateError } = await supabase.from('fundos_dinheiro').update({
      nome: data.nome,
      taxa_padrao: data.taxaPadrao,
      status: data.status,
      observacoes: data.observacoes,
    }).eq('id', id);
    if (updateError) return updateError.message;
    await refresh();
    return null;
  };

  const adicionarCapitalFundo = async (id: string, valor: number) => {
    if (valor <= 0) return 'O valor do aporte deve ser maior que zero.';
    // Read current values from DB to avoid stale local state
    const { data: cur, error: fetchError } = await supabase
      .from('fundos_dinheiro')
      .select('valor_investido, valor_disponivel')
      .eq('id', id)
      .single();
    if (fetchError || !cur) return 'Fundo não encontrado';
    const { error: updateError } = await supabase.from('fundos_dinheiro').update({
      valor_investido: Number(cur.valor_investido) + valor,
      valor_disponivel: Number(cur.valor_disponivel) + valor,
    }).eq('id', id);
    if (updateError) return updateError.message;
    await refresh();
    return null;
  };

  const deleteFundoDinheiro = async (id: string) => {
    const hasOps = operacoes.some(o => o.fundoDinheiroId === id);
    if (hasOps) return 'Fundo possui operações vinculadas. Remova as operações antes de excluir.';
    const { error: deleteError } = await supabase.from('fundos_dinheiro').delete().eq('id', id);
    if (deleteError) return deleteError.message;
    await refresh();
    return null;
  };

  // ── Operações ─────────────────────────────────────────────────────────────

  const createOperacao = async (data: {
    clienteId: string;
    fonte: 'cartao' | 'dinheiro';
    cartaoId?: string;
    fundoDinheiroId?: string;
    valorEnviado: number;
    taxaAplicada: number;
    tipoCobranca?: 'total' | 'somente_juros';
    formaPagamento: 'avista' | 'parcelado';
    quantidadeParcelas: number;
    observacoes?: string;
  }) => {
    // Bug 6: Validate available limit before creating
    if (data.fonte === 'cartao' && data.cartaoId) {
      const cartao = cartoes.find(c => c.id === data.cartaoId);
      if (!cartao) return 'Cartão não encontrado.';
      if (data.valorEnviado > cartao.limiteDisponivel) {
        return `Limite insuficiente. Disponível: R$ ${cartao.limiteDisponivel.toFixed(2).replace('.', ',')}`;
      }
    }
    if (data.fonte === 'dinheiro' && data.fundoDinheiroId) {
      const fundo = fundosDinheiro.find(f => f.id === data.fundoDinheiroId);
      if (!fundo) return 'Fundo não encontrado.';
      if (data.valorEnviado > fundo.valorDisponivel) {
        return `Saldo insuficiente no fundo. Disponível: R$ ${fundo.valorDisponivel.toFixed(2).replace('.', ',')}`;
      }
    }

    // "Somente Juros" só é válido para fonte = 'dinheiro' — força 'total' para cartão
    const tipoCobranca: 'total' | 'somente_juros' =
      data.fonte === 'dinheiro' ? (data.tipoCobranca ?? 'total') : 'total';
    const somenteJuros = tipoCobranca === 'somente_juros';

    // No modo somente_juros, cada parcela é só o juro do período (sem principal);
    // valorTotalReceber continua incluindo o principal para que "Lucro" (valorTotalReceber
    // - valorEnviado) permaneça correto em todo o app, igual ao modo 'total'.
    const jurosPeriodo = data.valorEnviado * (data.taxaAplicada / 100);
    const valorTotalReceber = somenteJuros
      ? data.valorEnviado + jurosPeriodo
      : data.valorEnviado * (1 + data.taxaAplicada / 100);
    const parcelas = somenteJuros ? 1 : (data.formaPagamento === 'avista' ? 1 : data.quantidadeParcelas);
    // Bug 4: Fix rounding — last parcela absorbs the cent difference
    const valorParcela = somenteJuros
      ? Math.round(jurosPeriodo * 100) / 100
      : Math.round((valorTotalReceber / parcelas) * 100) / 100;
    const valorUltimaParcela = somenteJuros
      ? valorParcela
      : Math.round((valorTotalReceber - valorParcela * (parcelas - 1)) * 100) / 100;
    const hoje = new Date().toISOString().slice(0, 10);

    const { data: opRow, error: opError } = await supabase.from('operacoes').insert({
      cliente_id: data.clienteId,
      fonte: data.fonte,
      cartao_id: data.fonte === 'cartao' ? data.cartaoId : null,
      fundo_dinheiro_id: data.fonte === 'dinheiro' ? data.fundoDinheiroId : null,
      data_transacao: hoje,
      valor_enviado: data.valorEnviado,
      taxa_aplicada: data.taxaAplicada,
      valor_total_receber: valorTotalReceber,
      tipo_cobranca: tipoCobranca,
      forma_pagamento: somenteJuros ? 'avista' : data.formaPagamento,
      quantidade_parcelas: parcelas,
      status: 'em_aberto',
      observacoes: data.observacoes ?? '',
    }).select('id').single();

    if (opError) return opError.message;

    const parcelasRows = Array.from({ length: parcelas }, (_, i) => ({
      operacao_id: opRow.id,
      numero: i + 1,
      valor: i === parcelas - 1 ? valorUltimaParcela : valorParcela,
      vencimento: addMonths(hoje, i + 1),
      status: 'pendente' as const,
    }));

    const { error: parcelasError } = await supabase.from('parcelas').insert(parcelasRows);
    if (parcelasError) return parcelasError.message;

    // Bug 5: Read current values from DB to avoid stale local state
    if (data.fonte === 'cartao' && data.cartaoId) {
      const { data: cur } = await supabase.from('cartoes').select('limite_disponivel').eq('id', data.cartaoId).single();
      if (cur) {
        await supabase.from('cartoes').update({
          limite_disponivel: Math.max(0, Number(cur.limite_disponivel) - data.valorEnviado),
        }).eq('id', data.cartaoId);
      }
    }

    if (data.fonte === 'dinheiro' && data.fundoDinheiroId) {
      const { data: cur } = await supabase.from('fundos_dinheiro').select('valor_disponivel').eq('id', data.fundoDinheiroId).single();
      if (cur) {
        await supabase.from('fundos_dinheiro').update({
          valor_disponivel: Math.max(0, Number(cur.valor_disponivel) - data.valorEnviado),
        }).eq('id', data.fundoDinheiroId);
      }
    }

    const cliente = clientes.find(c => c.id === data.clienteId);
    // Bug 3: Include operacao_id so cascade delete works (migration 004)
    await supabase.from('movimentacoes').insert({
      data: hoje,
      tipo: 'saida',
      categoria: 'Empréstimo',
      descricao: `Pix para ${cliente?.nome ?? 'cliente'} - Op. #${(opRow.id as string).slice(0, 8).toUpperCase()}`,
      valor: data.valorEnviado,
      origem: 'operacao',
      forma_pagamento: 'Pix',
      cliente_id: data.clienteId,
      cartao_id: data.fonte === 'cartao' ? data.cartaoId : null,
      fundo_dinheiro_id: data.fonte === 'dinheiro' ? data.fundoDinheiroId : null,
      operacao_id: opRow.id,
    });

    await refresh();
    return null;
  };

  const updateOperacao = async (id: string, data: { observacoes?: string; status?: Operacao['status'] }) => {
    const { error: updateError } = await supabase.from('operacoes').update({
      ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
      ...(data.status !== undefined && { status: data.status }),
    }).eq('id', id);
    if (updateError) return updateError.message;
    await refresh();
    return null;
  };

  const deleteOperacao = async (id: string) => {
    const op = operacoes.find(o => o.id === id);
    if (!op) return 'Operação não encontrada';
    if (op.parcelas.some(p => p.status === 'paga')) return 'Operação possui parcelas pagas e não pode ser excluída.';

    // Bug 5: Read current values from DB to avoid stale local state
    if (op.fonte === 'cartao' && op.cartaoId) {
      const { data: cur } = await supabase.from('cartoes').select('limite_disponivel').eq('id', op.cartaoId).single();
      if (cur) {
        await supabase.from('cartoes').update({
          limite_disponivel: Number(cur.limite_disponivel) + op.valorEnviado,
        }).eq('id', op.cartaoId);
      }
    }
    if (op.fonte === 'dinheiro' && op.fundoDinheiroId) {
      const { data: cur } = await supabase.from('fundos_dinheiro').select('valor_disponivel').eq('id', op.fundoDinheiroId).single();
      if (cur) {
        await supabase.from('fundos_dinheiro').update({
          valor_disponivel: Number(cur.valor_disponivel) + op.valorEnviado,
        }).eq('id', op.fundoDinheiroId);
      }
    }

    // Bug 3: Migration 004 adds ON DELETE CASCADE on movimentacoes.operacao_id
    // so deleting the operacao automatically removes its movimentacoes
    const { error: deleteError } = await supabase.from('operacoes').delete().eq('id', id);
    if (deleteError) return deleteError.message;
    await refresh();
    return null;
  };

  const pagarParcela = async (parcelaId: string, operacaoId: string) => {
    const hoje = new Date().toISOString().slice(0, 10);
    const op = operacoes.find(o => o.id === operacaoId);
    const parcela = op?.parcelas.find(p => p.id === parcelaId);
    if (!op || !parcela) return 'Parcela não encontrada';

    const { error: parcelaError } = await supabase
      .from('parcelas')
      .update({ status: 'paga', data_pagamento: hoje })
      .eq('id', parcelaId);
    if (parcelaError) return parcelaError.message;

    let novaParcelaValor = 0;
    let novoStatusOp: Operacao['status'];

    if (op.tipoCobranca === 'somente_juros') {
      // "Somente Juros": gera automaticamente a próxima parcela de juros,
      // a menos que o principal já tenha sido quitado (ver quitarPrincipal).
      if (!op.principalQuitado) {
        const proximoNumero = Math.max(...op.parcelas.map(p => p.numero)) + 1;
        novaParcelaValor = Math.round(op.valorEnviado * op.taxaAplicada) / 100;
        const { error: novaParcelaError } = await supabase.from('parcelas').insert({
          operacao_id: operacaoId,
          numero: proximoNumero,
          valor: novaParcelaValor,
          vencimento: addMonths(hoje, 1),
          status: 'pendente',
        });
        if (novaParcelaError) return novaParcelaError.message;
        novoStatusOp = 'em_aberto';
      } else {
        novoStatusOp = 'pago';
      }
    } else {
      // Compute new status from all parcelas (optimistic: treat this one as paga)
      const parcelasAtualizadas = op.parcelas.map(p =>
        p.id === parcelaId ? { ...p, status: 'paga' } : p
      );
      novoStatusOp = calcularStatusOperacao(parcelasAtualizadas);
    }

    const { error: opError } = await supabase
      .from('operacoes')
      .update({
        status: novoStatusOp,
        ...(novaParcelaValor > 0 && { valor_total_receber: op.valorTotalReceber + novaParcelaValor }),
      })
      .eq('id', operacaoId);
    if (opError) return opError.message;

    // Bug 5: Read current value from DB to avoid stale local state
    if (op.fonte === 'dinheiro' && op.fundoDinheiroId) {
      const { data: cur } = await supabase.from('fundos_dinheiro').select('valor_disponivel').eq('id', op.fundoDinheiroId).single();
      if (cur) {
        await supabase.from('fundos_dinheiro').update({
          valor_disponivel: Number(cur.valor_disponivel) + parcela.valor,
        }).eq('id', op.fundoDinheiroId);
      }
    }

    const cliente = clientes.find(c => c.id === op.clienteId);
    const descricaoParcela = op.tipoCobranca === 'somente_juros'
      ? `Juros #${parcela.numero} - ${cliente?.nome ?? 'cliente'}`
      : `Parcela ${parcela.numero}/${op.quantidadeParcelas} - ${cliente?.nome ?? 'cliente'}`;
    // Bug 3: Include operacao_id so cascade delete works (migration 004)
    await supabase.from('movimentacoes').insert({
      data: hoje,
      tipo: 'entrada',
      categoria: 'Recebimento',
      descricao: descricaoParcela,
      valor: parcela.valor,
      origem: 'operacao',
      forma_pagamento: 'Pix',
      cliente_id: op.clienteId,
      cartao_id: op.cartaoId ?? null,
      fundo_dinheiro_id: op.fundoDinheiroId ?? null,
      operacao_id: operacaoId,
    });

    await recalcularStatusCliente(op.clienteId);
    await refresh();
    return null;
  };

  // ── Movimentações ─────────────────────────────────────────────────────────

  const createMovimentacao = async (data: Omit<MovimentacaoFinanceira, 'id'>) => {
    const { error: insertError } = await supabase.from('movimentacoes').insert({
      data: data.data,
      tipo: data.tipo,
      categoria: data.categoria,
      descricao: data.descricao,
      valor: data.valor,
      origem: data.origem,
      forma_pagamento: data.formaPagamento,
      cliente_id: data.clienteId ?? null,
      cartao_id: data.cartaoId ?? null,
      fundo_dinheiro_id: data.fundoDinheiroId ?? null,
    });
    if (insertError) return insertError.message;
    await refresh();
    return null;
  };

  return (
    <DataContext.Provider value={{
      cartoes,
      fundosDinheiro,
      clientes,
      operacoes,
      movimentacoes,
      loading,
      error,
      refresh,
      getClienteNome,
      getCartaoNome,
      getFundoDinheiroNome,
      getFonteNome,
      createCliente,
      updateCliente,
      deleteCliente,
      createCartao,
      updateCartao,
      deleteCartao,
      createFundoDinheiro,
      updateFundoDinheiro,
      adicionarCapitalFundo,
      deleteFundoDinheiro,
      createOperacao,
      updateOperacao,
      deleteOperacao,
      pagarParcela,
      createMovimentacao,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider');
  return ctx;
}
