export interface FundoDinheiro {
  id: string;
  nome: string;
  valorInvestido: number;
  valorDisponivel: number;
  taxaPadrao: number;
  status: 'ativo' | 'bloqueado';
  observacoes: string;
}

export interface Cartao {
  id: string;
  nome: string;
  banco: string;
  bandeira: string;
  ultimos4: string;
  limiteTotal: number;
  limiteDisponivel: number;
  vencimentoFatura: number;
  melhorDiaCompra: number;
  status: 'ativo' | 'bloqueado' | 'cancelado';
}

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  cidade: string;
  dataCadastro: string;
  observacoes: string;
  situacao: 'adimplente' | 'atrasado' | 'inadimplente' | 'bloqueado';
}

export interface Parcela {
  id: string;
  numero: number;
  valor: number;
  vencimento: string;
  dataPagamento: string | null;
  status: 'paga' | 'pendente' | 'atrasada' | 'vencida';
}

export interface Operacao {
  id: string;
  clienteId: string;
  fonte: 'cartao' | 'dinheiro';
  cartaoId: string | null;
  fundoDinheiroId: string | null;
  dataTransacao: string;
  valorEnviado: number;
  taxaAplicada: number;
  valorTotalReceber: number;
  formaPagamento: 'avista' | 'parcelado';
  quantidadeParcelas: number;
  parcelas: Parcela[];
  status: 'em_aberto' | 'pago_parcialmente' | 'pago' | 'atrasado' | 'inadimplente';
  observacoes: string;
}

export interface MovimentacaoFinanceira {
  id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: number;
  origem: string;
  formaPagamento: string;
  clienteId?: string;
  cartaoId?: string;
  fundoDinheiroId?: string;
}
