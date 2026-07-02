-- Vincula movimentacoes à operacao de origem para cascade delete
-- Quando uma operacao é excluída, suas movimentacoes (saída inicial + entradas de parcelas) são deletadas automaticamente

ALTER TABLE movimentacoes
  ADD COLUMN operacao_id UUID REFERENCES operacoes(id) ON DELETE CASCADE;

CREATE INDEX idx_movimentacoes_operacao_id ON movimentacoes(operacao_id);
