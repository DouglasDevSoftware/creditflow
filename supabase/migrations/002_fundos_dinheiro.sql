-- Fonte de patrimônio: Dinheiro (investimento próprio para empréstimos)

CREATE TYPE fundo_dinheiro_status AS ENUM ('ativo', 'bloqueado');
CREATE TYPE operacao_fonte AS ENUM ('cartao', 'dinheiro');

CREATE TABLE fundos_dinheiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor_investido NUMERIC(12, 2) NOT NULL DEFAULT 0,
  valor_disponivel NUMERIC(12, 2) NOT NULL DEFAULT 0,
  taxa_padrao NUMERIC(5, 2) NOT NULL DEFAULT 0,
  status fundo_dinheiro_status NOT NULL DEFAULT 'ativo',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fundos_dinheiro_user_id ON fundos_dinheiro(user_id);

ALTER TABLE fundos_dinheiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fundos_dinheiro_select_own" ON fundos_dinheiro FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fundos_dinheiro_insert_own" ON fundos_dinheiro FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fundos_dinheiro_update_own" ON fundos_dinheiro FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fundos_dinheiro_delete_own" ON fundos_dinheiro FOR DELETE USING (auth.uid() = user_id);

-- Operações: cartão OU dinheiro como fonte
ALTER TABLE operacoes ALTER COLUMN cartao_id DROP NOT NULL;
ALTER TABLE operacoes ADD COLUMN fundo_dinheiro_id UUID REFERENCES fundos_dinheiro(id) ON DELETE RESTRICT;
ALTER TABLE operacoes ADD COLUMN fonte operacao_fonte NOT NULL DEFAULT 'cartao';

ALTER TABLE operacoes ADD CONSTRAINT operacoes_fonte_check CHECK (
  (fonte = 'cartao' AND cartao_id IS NOT NULL AND fundo_dinheiro_id IS NULL) OR
  (fonte = 'dinheiro' AND fundo_dinheiro_id IS NOT NULL AND cartao_id IS NULL)
);

CREATE INDEX idx_operacoes_fundo_dinheiro_id ON operacoes(fundo_dinheiro_id);

-- Movimentações vinculadas ao fundo
ALTER TABLE movimentacoes ADD COLUMN fundo_dinheiro_id UUID REFERENCES fundos_dinheiro(id) ON DELETE SET NULL;
