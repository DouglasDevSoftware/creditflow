-- supabase/migrations/006_operacao_somente_juros.sql
-- Cobrança "Somente Juros" para operações de dinheiro: o cliente paga só os
-- juros a cada período, e o principal fica em aberto até ser quitado
-- separadamente (ver docs/superpowers/specs/2026-07-31-emprestimo-somente-juros-design.md).

CREATE TYPE tipo_cobranca_operacao AS ENUM ('total', 'somente_juros');

ALTER TABLE operacoes ADD COLUMN tipo_cobranca tipo_cobranca_operacao NOT NULL DEFAULT 'total';
ALTER TABLE operacoes ADD COLUMN principal_quitado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE operacoes ADD COLUMN data_quitacao_principal DATE;

-- Só operações com fonte = 'dinheiro' podem usar o modo "somente_juros"
ALTER TABLE operacoes ADD CONSTRAINT operacoes_tipo_cobranca_check CHECK (
  tipo_cobranca = 'total' OR fonte = 'dinheiro'
);
