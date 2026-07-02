import type { Cartao, Cliente, FundoDinheiro, MovimentacaoFinanceira, Operacao, Parcela } from '../types';

export function mapFundoDinheiro(row: Record<string, unknown>): FundoDinheiro {
  return {
    id: row.id as string,
    nome: row.nome as string,
    valorInvestido: Number(row.valor_investido),
    valorDisponivel: Number(row.valor_disponivel),
    taxaPadrao: Number(row.taxa_padrao),
    status: row.status as FundoDinheiro['status'],
    observacoes: row.observacoes as string,
  };
}

export function mapCartao(row: Record<string, unknown>): Cartao {
  return {
    id: row.id as string,
    nome: row.nome as string,
    banco: row.banco as string,
    bandeira: row.bandeira as string,
    ultimos4: row.ultimos4 as string,
    limiteTotal: Number(row.limite_total),
    limiteDisponivel: Number(row.limite_disponivel),
    vencimentoFatura: Number(row.vencimento_fatura),
    melhorDiaCompra: Number(row.melhor_dia_compra),
    status: row.status as Cartao['status'],
  };
}

export function mapCliente(row: Record<string, unknown>): Cliente {
  return {
    id: row.id as string,
    nome: row.nome as string,
    cpf: row.cpf as string,
    telefone: row.telefone as string,
    email: row.email as string,
    cidade: row.cidade as string,
    dataCadastro: row.data_cadastro as string,
    observacoes: row.observacoes as string,
    situacao: row.situacao as Cliente['situacao'],
  };
}

export function mapParcela(row: Record<string, unknown>): Parcela {
  return {
    id: row.id as string,
    numero: Number(row.numero),
    valor: Number(row.valor),
    vencimento: row.vencimento as string,
    dataPagamento: (row.data_pagamento as string | null) ?? null,
    status: row.status as Parcela['status'],
  };
}

export function mapOperacao(row: Record<string, unknown>, parcelas: Parcela[]): Operacao {
  return {
    id: row.id as string,
    clienteId: row.cliente_id as string,
    fonte: (row.fonte as Operacao['fonte']) ?? 'cartao',
    cartaoId: (row.cartao_id as string | null) ?? null,
    fundoDinheiroId: (row.fundo_dinheiro_id as string | null) ?? null,
    dataTransacao: row.data_transacao as string,
    valorEnviado: Number(row.valor_enviado),
    taxaAplicada: Number(row.taxa_aplicada),
    valorTotalReceber: Number(row.valor_total_receber),
    formaPagamento: row.forma_pagamento as Operacao['formaPagamento'],
    quantidadeParcelas: Number(row.quantidade_parcelas),
    parcelas: parcelas.sort((a, b) => a.numero - b.numero),
    status: row.status as Operacao['status'],
    observacoes: row.observacoes as string,
  };
}

export function mapMovimentacao(row: Record<string, unknown>): MovimentacaoFinanceira {
  return {
    id: row.id as string,
    data: row.data as string,
    tipo: row.tipo as MovimentacaoFinanceira['tipo'],
    categoria: row.categoria as string,
    descricao: row.descricao as string,
    valor: Number(row.valor),
    origem: row.origem as string,
    formaPagamento: row.forma_pagamento as string,
    clienteId: (row.cliente_id as string | null) ?? undefined,
    cartaoId: (row.cartao_id as string | null) ?? undefined,
    fundoDinheiroId: (row.fundo_dinheiro_id as string | null) ?? undefined,
  };
}
