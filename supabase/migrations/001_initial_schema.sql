  -- CreditFlow: schema multi-tenant (cada usuário vê apenas seus dados)

  -- Enums
  CREATE TYPE cartao_status AS ENUM ('ativo', 'bloqueado', 'cancelado');
  CREATE TYPE cliente_situacao AS ENUM ('adimplente', 'atrasado', 'inadimplente', 'bloqueado');
  CREATE TYPE operacao_status AS ENUM ('em_aberto', 'pago_parcialmente', 'pago', 'atrasado', 'inadimplente');
  CREATE TYPE parcela_status AS ENUM ('paga', 'pendente', 'atrasada', 'vencida');
  CREATE TYPE forma_pagamento AS ENUM ('avista', 'parcelado');
  CREATE TYPE movimentacao_tipo AS ENUM ('entrada', 'saida');

  -- Cartões
  CREATE TABLE cartoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    banco TEXT NOT NULL,
    bandeira TEXT NOT NULL,
    ultimos4 TEXT NOT NULL,
    limite_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    limite_disponivel NUMERIC(12, 2) NOT NULL DEFAULT 0,
    vencimento_fatura SMALLINT NOT NULL CHECK (vencimento_fatura BETWEEN 1 AND 31),
    melhor_dia_compra SMALLINT NOT NULL CHECK (melhor_dia_compra BETWEEN 1 AND 31),
    status cartao_status NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Clientes
  CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    telefone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    cidade TEXT NOT NULL DEFAULT '',
    data_cadastro DATE NOT NULL DEFAULT CURRENT_DATE,
    observacoes TEXT NOT NULL DEFAULT '',
    situacao cliente_situacao NOT NULL DEFAULT 'adimplente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Operações
  CREATE TABLE operacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE RESTRICT,
    data_transacao DATE NOT NULL DEFAULT CURRENT_DATE,
    valor_enviado NUMERIC(12, 2) NOT NULL,
    taxa_aplicada NUMERIC(5, 2) NOT NULL DEFAULT 0,
    valor_total_receber NUMERIC(12, 2) NOT NULL,
    forma_pagamento forma_pagamento NOT NULL DEFAULT 'parcelado',
    quantidade_parcelas SMALLINT NOT NULL DEFAULT 1 CHECK (quantidade_parcelas >= 1),
    status operacao_status NOT NULL DEFAULT 'em_aberto',
    observacoes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Parcelas
  CREATE TABLE parcelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    operacao_id UUID NOT NULL REFERENCES operacoes(id) ON DELETE CASCADE,
    numero SMALLINT NOT NULL CHECK (numero >= 1),
    valor NUMERIC(12, 2) NOT NULL,
    vencimento DATE NOT NULL,
    data_pagamento DATE,
    status parcela_status NOT NULL DEFAULT 'pendente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (operacao_id, numero)
  );

  -- Movimentações financeiras
  CREATE TABLE movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo movimentacao_tipo NOT NULL,
    categoria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    origem TEXT NOT NULL DEFAULT 'manual',
    forma_pagamento TEXT NOT NULL DEFAULT '',
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    cartao_id UUID REFERENCES cartoes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Índices (user_id em todas as tabelas)
  CREATE INDEX idx_cartoes_user_id ON cartoes(user_id);
  CREATE INDEX idx_clientes_user_id ON clientes(user_id);
  CREATE INDEX idx_operacoes_user_id ON operacoes(user_id);
  CREATE INDEX idx_operacoes_cliente_id ON operacoes(cliente_id);
  CREATE INDEX idx_operacoes_cartao_id ON operacoes(cartao_id);
  CREATE INDEX idx_parcelas_user_id ON parcelas(user_id);
  CREATE INDEX idx_parcelas_operacao_id ON parcelas(operacao_id);
  CREATE INDEX idx_movimentacoes_user_id ON movimentacoes(user_id);
  CREATE INDEX idx_movimentacoes_data ON movimentacoes(data);

  -- RLS
  ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
  ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;

  -- Políticas multi-tenant: auth.uid() = user_id
  CREATE POLICY "cartoes_select_own" ON cartoes FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "cartoes_insert_own" ON cartoes FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "cartoes_update_own" ON cartoes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "cartoes_delete_own" ON cartoes FOR DELETE USING (auth.uid() = user_id);

  CREATE POLICY "clientes_select_own" ON clientes FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "clientes_insert_own" ON clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "clientes_update_own" ON clientes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "clientes_delete_own" ON clientes FOR DELETE USING (auth.uid() = user_id);

  CREATE POLICY "operacoes_select_own" ON operacoes FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "operacoes_insert_own" ON operacoes FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "operacoes_update_own" ON operacoes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "operacoes_delete_own" ON operacoes FOR DELETE USING (auth.uid() = user_id);

  CREATE POLICY "parcelas_select_own" ON parcelas FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "parcelas_insert_own" ON parcelas FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "parcelas_update_own" ON parcelas FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "parcelas_delete_own" ON parcelas FOR DELETE USING (auth.uid() = user_id);

  CREATE POLICY "movimentacoes_select_own" ON movimentacoes FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "movimentacoes_insert_own" ON movimentacoes FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "movimentacoes_update_own" ON movimentacoes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "movimentacoes_delete_own" ON movimentacoes FOR DELETE USING (auth.uid() = user_id);
