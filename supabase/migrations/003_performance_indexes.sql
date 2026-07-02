-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON parcelas(vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);
CREATE INDEX IF NOT EXISTS idx_clientes_situacao ON clientes(situacao);
CREATE INDEX IF NOT EXISTS idx_operacoes_status ON operacoes(status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes(tipo);
