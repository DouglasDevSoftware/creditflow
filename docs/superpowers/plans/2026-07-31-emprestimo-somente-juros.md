# Empréstimo em Dinheiro "Somente Juros" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user choose, when creating a `dinheiro`-funded loan (`Operacoes.tsx`), between the existing "Valor Total" model and a new "Somente Juros" model where the client pays only recurring interest and the principal stays open until explicitly settled via a dedicated "Quitar Principal" action.

**Architecture:** Extend the existing `Operacao` model with a `tipoCobranca: 'total' | 'somente_juros'` field (only selectable when `fonte = 'dinheiro'`) plus `principalQuitado`/`dataQuitacaoPrincipal`. Reuse the existing `parcelas` table and "Pagar" flow — in `somente_juros` mode each parcela represents one interest period, generated one at a time by `pagarParcela` itself. A new `quitarPrincipal` function ends the cycle. `valorTotalReceber` keeps its current meaning ("principal + juros acumulados até agora") in both modes so every existing "Lucro" calculation (`valorTotalReceber - valorEnviado`) stays correct without special-casing.

**Tech Stack:** React 19, TypeScript, Vite, Supabase (Postgres + JS client), Tailwind CSS v4 (CSS-variable-based theme), lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-07-31-emprestimo-somente-juros-design.md`

## Global Constraints

- No automated test framework exists in this project (no vitest/jest, confirmed via `package.json`). Verification for every task is `npx tsc --noEmit` (must pass with zero errors — `noUnusedLocals`/`noUnusedParameters` are enabled in `tsconfig.app.json`, so unused imports/vars are compile errors) plus the manual QA checklist at the end of this plan.
- `tsconfig.app.json` has `noUnusedLocals: true` — never import an icon or declare a variable in a task before it's actually used in that same task.
- Supabase migrations in this project are applied manually via the Supabase SQL Editor (see `supabase/SETUP.md`) — there is no local `supabase db push` in this environment. Do not attempt to run the migration automatically; it's part of the manual checklist at the end.
- All UI copy is in Brazilian Portuguese, matching existing strings exactly in tone (e.g. "Fundo não encontrado.", "Saldo insuficiente no fundo.").
- Follow the existing style conventions in each file exactly: inline `style={{ ... }}` objects using CSS custom properties (`var(--text-primary)` etc.) for theme-aware colors, Tailwind utility classes for layout/spacing, and raw Tailwind color classes (e.g. `bg-green-600 hover:bg-green-700`) for the specific button colors already used in `Operacoes.tsx` (don't switch to the `success-*` custom tokens used in `Dinheiro.tsx` — match the file you're editing).
- This feature applies **only** to `fonte = 'dinheiro'`. `fonte = 'cartao'` operations must be provably unaffected — every task that touches shared code must preserve current behavior for `tipoCobranca = 'total'` / `fonte = 'cartao'` exactly.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/006_operacao_somente_juros.sql` | Create | Adds `tipo_cobranca`, `principal_quitado`, `data_quitacao_principal` columns + CHECK constraint |
| `src/types/index.ts` | Modify | `Operacao` interface gains `tipoCobranca`, `principalQuitado`, `dataQuitacaoPrincipal` |
| `src/lib/mappers.ts` | Modify | `mapOperacao` reads the 3 new columns |
| `src/contexts/DataContext.tsx` | Modify | `createOperacao` accepts `tipoCobranca`; `pagarParcela` generates the next interest parcela automatically; new `quitarPrincipal` function; `deleteOperacao` blocks when principal already settled |
| `src/pages/Operacoes.tsx` | Modify | "Nova Operação" form gets the "Tipo de Cobrança" field; list table and detail modal display the new mode and the "Quitar Principal" action |
| `src/pages/Dinheiro.tsx` | Modify | Fundo detail table shows a "Juros" badge next to the taxa for `somente_juros` operations |

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/006_operacao_somente_juros.sql`

**Interfaces:**
- Produces: columns `operacoes.tipo_cobranca` (`'total' | 'somente_juros'`, default `'total'`), `operacoes.principal_quitado` (`boolean`, default `false`), `operacoes.data_quitacao_principal` (`date | null`). All later tasks read/write these via the exact column names above.

- [ ] **Step 1: Create the migration file with the full content below**

```sql
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
```

- [ ] **Step 2: Note for later — do not apply yet**

This migration is applied manually via the Supabase SQL Editor as the first step of the "Post-implementation manual checklist" at the end of this plan, after all code tasks are done and reviewed. Don't run it against a live database as part of this task.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_operacao_somente_juros.sql
git commit -m "feat: add tipo_cobranca/principal_quitado columns (migration 006)"
```

---

### Task 2: Types and mapper for the new fields

**Files:**
- Modify: `src/types/index.ts:45-60` (the `Operacao` interface)
- Modify: `src/lib/mappers.ts:55-72` (the `mapOperacao` function)

**Interfaces:**
- Consumes: nothing new (purely additive typing over existing `Operacao`/DB row shapes).
- Produces: `Operacao.tipoCobranca: 'total' | 'somente_juros'`, `Operacao.principalQuitado: boolean`, `Operacao.dataQuitacaoPrincipal: string | null`. Every later task that reads/writes an `Operacao` object relies on these exact property names.

- [ ] **Step 1: Add the 3 fields to the `Operacao` interface**

In `src/types/index.ts`, find:

```ts
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
```

Replace with:

```ts
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
  tipoCobranca: 'total' | 'somente_juros';
  principalQuitado: boolean;
  dataQuitacaoPrincipal: string | null;
  formaPagamento: 'avista' | 'parcelado';
  quantidadeParcelas: number;
  parcelas: Parcela[];
  status: 'em_aberto' | 'pago_parcialmente' | 'pago' | 'atrasado' | 'inadimplente';
  observacoes: string;
}
```

- [ ] **Step 2: Map the new columns in `mapOperacao`**

In `src/lib/mappers.ts`, find:

```ts
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
```

Replace with:

```ts
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
    tipoCobranca: (row.tipo_cobranca as Operacao['tipoCobranca']) ?? 'total',
    principalQuitado: Boolean(row.principal_quitado),
    dataQuitacaoPrincipal: (row.data_quitacao_principal as string | null) ?? null,
    formaPagamento: row.forma_pagamento as Operacao['formaPagamento'],
    quantidadeParcelas: Number(row.quantidade_parcelas),
    parcelas: parcelas.sort((a, b) => a.numero - b.numero),
    status: row.status as Operacao['status'],
    observacoes: row.observacoes as string,
  };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (these are the only two places in the codebase that construct a full `Operacao` object, so this addition is safe on its own).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/mappers.ts
git commit -m "feat: add tipoCobranca/principalQuitado to Operacao type and mapper"
```

---

### Task 3: `createOperacao` supports `tipoCobranca`

**Files:**
- Modify: `src/contexts/DataContext.tsx:30-40` (the `createOperacao` entry in `DataContextValue`)
- Modify: `src/contexts/DataContext.tsx:342-441` (the `createOperacao` function body)

**Interfaces:**
- Consumes: `Operacao` type from Task 2 (via the `tipo_cobranca` column now available on the `operacoes` table from Task 1).
- Produces: `createOperacao(data: { ...; tipoCobranca?: 'total' | 'somente_juros'; ... }) => Promise<string | null>`. When `tipoCobranca === 'somente_juros'`, creates exactly 1 parcela whose `valor` is pure interest (`valorEnviado * taxaAplicada / 100`), while `valorTotalReceber` is stored as `valorEnviado + thatInterest` (principal included, so `valorTotalReceber - valorEnviado` still equals accumulated interest — relied on by every KPI/lucro calculation elsewhere). Task 6 (`Operacoes.tsx` form) calls this with the new field.

- [ ] **Step 1: Add `tipoCobranca` to the `createOperacao` type in `DataContextValue`**

In `src/contexts/DataContext.tsx`, find:

```ts
  createOperacao: (data: {
    clienteId: string;
    fonte: 'cartao' | 'dinheiro';
    cartaoId?: string;
    fundoDinheiroId?: string;
    valorEnviado: number;
    taxaAplicada: number;
    formaPagamento: 'avista' | 'parcelado';
    quantidadeParcelas: number;
    observacoes?: string;
  }) => Promise<string | null>;
```

Replace with:

```ts
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
```

- [ ] **Step 2: Replace the `createOperacao` function body**

In `src/contexts/DataContext.tsx`, find the whole `createOperacao` function (from `const createOperacao = async (data: {` down to its closing `};`, currently lines 342-441):

```ts
  const createOperacao = async (data: {
    clienteId: string;
    fonte: 'cartao' | 'dinheiro';
    cartaoId?: string;
    fundoDinheiroId?: string;
    valorEnviado: number;
    taxaAplicada: number;
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

    const valorTotalReceber = data.valorEnviado * (1 + data.taxaAplicada / 100);
    const parcelas = data.formaPagamento === 'avista' ? 1 : data.quantidadeParcelas;
    // Bug 4: Fix rounding — last parcela absorbs the cent difference
    const valorParcela = Math.round((valorTotalReceber / parcelas) * 100) / 100;
    const valorUltimaParcela = Math.round((valorTotalReceber - valorParcela * (parcelas - 1)) * 100) / 100;
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
      forma_pagamento: data.formaPagamento,
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
```

Replace it with:

```ts
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/DataContext.tsx
git commit -m "feat: createOperacao supports tipoCobranca somente_juros"
```

---

### Task 4: `pagarParcela` generates the next interest parcela automatically

**Files:**
- Modify: `src/contexts/DataContext.tsx:484-537` (the `pagarParcela` function body)

**Interfaces:**
- Consumes: `Operacao.tipoCobranca`, `Operacao.principalQuitado` (Task 2), `calcularStatusOperacao` (existing module-level helper, unchanged), `addMonths` (existing module-level helper, unchanged).
- Produces: `pagarParcela` behavior unchanged for `tipoCobranca === 'total'`. For `tipoCobranca === 'somente_juros'` and `principalQuitado === false`, automatically inserts the next `parcelas` row (`numero + 1`, `valor = valorEnviado * taxaAplicada / 100` rounded to cents, `vencimento = hoje + 1 month`, `status: 'pendente'`) and increments `operacoes.valor_total_receber` by that same amount. Task 5's `quitarPrincipal` relies on this being the only place new parcelas get created after the first one.

- [ ] **Step 1: Replace the `pagarParcela` function body**

In `src/contexts/DataContext.tsx`, find the whole `pagarParcela` function (currently lines 484-537):

```ts
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

    // Compute new status from all parcelas (optimistic: treat this one as paga)
    const parcelasAtualizadas = op.parcelas.map(p =>
      p.id === parcelaId ? { ...p, status: 'paga' } : p
    );
    const novoStatusOp = calcularStatusOperacao(parcelasAtualizadas);

    const { error: opError } = await supabase
      .from('operacoes')
      .update({ status: novoStatusOp })
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
    // Bug 3: Include operacao_id so cascade delete works (migration 004)
    await supabase.from('movimentacoes').insert({
      data: hoje,
      tipo: 'entrada',
      categoria: 'Recebimento',
      descricao: `Parcela ${parcela.numero}/${op.quantidadeParcelas} - ${cliente?.nome ?? 'cliente'}`,
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
```

Replace it with:

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/DataContext.tsx
git commit -m "feat: pagarParcela auto-generates next interest parcela for somente_juros"
```

---

### Task 5: `quitarPrincipal` function and `deleteOperacao` guard

**Files:**
- Modify: `src/contexts/DataContext.tsx:41-44` (add `quitarPrincipal` to `DataContextValue`, right after `pagarParcela`)
- Modify: `src/contexts/DataContext.tsx:453-482` (the `deleteOperacao` function body — add one guard line)
- Modify: `src/contexts/DataContext.tsx` — insert the new `quitarPrincipal` function immediately after `pagarParcela` (before the `// ── Movimentações ─────` comment)
- Modify: `src/contexts/DataContext.tsx:559-591` (the `DataContext.Provider` value object — add `quitarPrincipal`)

**Interfaces:**
- Consumes: `Operacao.tipoCobranca`, `Operacao.principalQuitado` (Task 2); `recalcularStatusCliente`, `refresh` (existing module-internal helpers).
- Produces: `quitarPrincipal: (operacaoId: string) => Promise<string | null>` — exposed on `useData()`. Task 7 (`Operacoes.tsx` detail modal) calls this from the new "Quitar Principal" button.

- [ ] **Step 1: Add `quitarPrincipal` to the `DataContextValue` interface**

In `src/contexts/DataContext.tsx`, find:

```ts
  pagarParcela: (parcelaId: string, operacaoId: string) => Promise<string | null>;
  createMovimentacao: (data: Omit<MovimentacaoFinanceira, 'id'>) => Promise<string | null>;
```

Replace with:

```ts
  pagarParcela: (parcelaId: string, operacaoId: string) => Promise<string | null>;
  quitarPrincipal: (operacaoId: string) => Promise<string | null>;
  createMovimentacao: (data: Omit<MovimentacaoFinanceira, 'id'>) => Promise<string | null>;
```

- [ ] **Step 2: Add the `principalQuitado` guard to `deleteOperacao`**

In `src/contexts/DataContext.tsx`, find:

```ts
  const deleteOperacao = async (id: string) => {
    const op = operacoes.find(o => o.id === id);
    if (!op) return 'Operação não encontrada';
    if (op.parcelas.some(p => p.status === 'paga')) return 'Operação possui parcelas pagas e não pode ser excluída.';
```

Replace with:

```ts
  const deleteOperacao = async (id: string) => {
    const op = operacoes.find(o => o.id === id);
    if (!op) return 'Operação não encontrada';
    if (op.parcelas.some(p => p.status === 'paga')) return 'Operação possui parcelas pagas e não pode ser excluída.';
    if (op.principalQuitado) return 'Operação com principal quitado não pode ser excluída.';
```

- [ ] **Step 3: Add the `quitarPrincipal` function after `pagarParcela`**

In `src/contexts/DataContext.tsx`, find the end of `pagarParcela` and the start of the movimentações section:

```ts
    await recalcularStatusCliente(op.clienteId);
    await refresh();
    return null;
  };

  // ── Movimentações ─────────────────────────────────────────────────────────
```

Replace with:

```ts
    await recalcularStatusCliente(op.clienteId);
    await refresh();
    return null;
  };

  const quitarPrincipal = async (operacaoId: string) => {
    const op = operacoes.find(o => o.id === operacaoId);
    if (!op) return 'Operação não encontrada';
    if (op.tipoCobranca !== 'somente_juros') return 'Esta operação não está no modo Somente Juros.';
    if (op.principalQuitado) return 'O principal já foi quitado.';

    const hoje = new Date().toISOString().slice(0, 10);
    const temParcelaPendente = op.parcelas.some(p => p.status === 'pendente' || p.status === 'vencida');
    const novoStatusOp: Operacao['status'] = temParcelaPendente ? 'em_aberto' : 'pago';

    const { error: opError } = await supabase
      .from('operacoes')
      .update({
        principal_quitado: true,
        data_quitacao_principal: hoje,
        status: novoStatusOp,
      })
      .eq('id', operacaoId);
    if (opError) return opError.message;

    if (op.fundoDinheiroId) {
      const { data: cur } = await supabase.from('fundos_dinheiro').select('valor_disponivel').eq('id', op.fundoDinheiroId).single();
      if (cur) {
        await supabase.from('fundos_dinheiro').update({
          valor_disponivel: Number(cur.valor_disponivel) + op.valorEnviado,
        }).eq('id', op.fundoDinheiroId);
      }
    }

    const cliente = clientes.find(c => c.id === op.clienteId);
    await supabase.from('movimentacoes').insert({
      data: hoje,
      tipo: 'entrada',
      categoria: 'Devolução de Principal',
      descricao: `Devolução do principal - ${cliente?.nome ?? 'cliente'} - Op. #${operacaoId.slice(0, 8).toUpperCase()}`,
      valor: op.valorEnviado,
      origem: 'operacao',
      forma_pagamento: 'Pix',
      cliente_id: op.clienteId,
      fundo_dinheiro_id: op.fundoDinheiroId,
      operacao_id: operacaoId,
    });

    await recalcularStatusCliente(op.clienteId);
    await refresh();
    return null;
  };

  // ── Movimentações ─────────────────────────────────────────────────────────
```

- [ ] **Step 4: Expose `quitarPrincipal` on the provider**

In `src/contexts/DataContext.tsx`, find:

```ts
      createOperacao,
      updateOperacao,
      deleteOperacao,
      pagarParcela,
      createMovimentacao,
```

Replace with:

```ts
      createOperacao,
      updateOperacao,
      deleteOperacao,
      pagarParcela,
      quitarPrincipal,
      createMovimentacao,
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/contexts/DataContext.tsx
git commit -m "feat: add quitarPrincipal function and block deletion after payoff"
```

---

### Task 6: "Nova Operação" form — Tipo de Cobrança field

**Files:**
- Modify: `src/pages/Operacoes.tsx:29-33` (form state)
- Modify: `src/pages/Operacoes.tsx:50-60` (preview calculations + `resetForm`)
- Modify: `src/pages/Operacoes.tsx:62-81` (`handleSaveOperacao`)
- Modify: `src/pages/Operacoes.tsx:413-425` (Fonte do Patrimônio select — reset `tipoCobranca` on change; add the new field right after)
- Modify: `src/pages/Operacoes.tsx:461-483` (Forma de Pagamento / Parcelas fields — hide when Somente Juros)
- Modify: `src/pages/Operacoes.tsx:491-507` (preview summary panel)

**Interfaces:**
- Consumes: `createOperacao` with the new `tipoCobranca` field (Task 3).
- Produces: no new exports — this is leaf UI. Task 7 in this same file shares the `useData()` destructure but touches different lines.

- [ ] **Step 1: Add `tipoCobranca` to form state**

Find:

```tsx
  const [form, setForm] = useState({
    clienteId: '', fonte: 'cartao' as 'cartao' | 'dinheiro', cartaoId: '', fundoDinheiroId: '',
    valorEnviado: '', taxaAplicada: '10',
    formaPagamento: 'parcelado' as 'avista' | 'parcelado', quantidadeParcelas: '3', observacoes: '',
  });
```

Replace with:

```tsx
  const [form, setForm] = useState({
    clienteId: '', fonte: 'cartao' as 'cartao' | 'dinheiro', cartaoId: '', fundoDinheiroId: '',
    valorEnviado: '', taxaAplicada: '10', tipoCobranca: 'total' as 'total' | 'somente_juros',
    formaPagamento: 'parcelado' as 'avista' | 'parcelado', quantidadeParcelas: '3', observacoes: '',
  });
```

- [ ] **Step 2: Add the `somenteJurosSelecionado`/`jurosPorPeriodo` preview variables and update `resetForm`**

Find:

```tsx
  const valorEnviadoNum = Number(form.valorEnviado) || 0;
  const taxaNum = Number(form.taxaAplicada) || 0;
  const parcelasNum = form.formaPagamento === 'avista' ? 1 : Number(form.quantidadeParcelas) || 1;
  const previewTotalReceber = valorEnviadoNum * (1 + taxaNum / 100);
  const lucro = previewTotalReceber - valorEnviadoNum;
  const valorParcela = parcelasNum > 0 ? previewTotalReceber / parcelasNum : 0;

  const resetForm = () => setForm({
    clienteId: '', fonte: 'cartao', cartaoId: '', fundoDinheiroId: '',
    valorEnviado: '', taxaAplicada: '10', formaPagamento: 'parcelado', quantidadeParcelas: '3', observacoes: '',
  });
```

Replace with:

```tsx
  const valorEnviadoNum = Number(form.valorEnviado) || 0;
  const taxaNum = Number(form.taxaAplicada) || 0;
  const parcelasNum = form.formaPagamento === 'avista' ? 1 : Number(form.quantidadeParcelas) || 1;
  const somenteJurosSelecionado = form.fonte === 'dinheiro' && form.tipoCobranca === 'somente_juros';
  const jurosPorPeriodo = valorEnviadoNum * (taxaNum / 100);
  const previewTotalReceber = valorEnviadoNum * (1 + taxaNum / 100);
  const lucro = previewTotalReceber - valorEnviadoNum;
  const valorParcela = parcelasNum > 0 ? previewTotalReceber / parcelasNum : 0;

  const resetForm = () => setForm({
    clienteId: '', fonte: 'cartao', cartaoId: '', fundoDinheiroId: '',
    valorEnviado: '', taxaAplicada: '10', tipoCobranca: 'total',
    formaPagamento: 'parcelado', quantidadeParcelas: '3', observacoes: '',
  });
```

- [ ] **Step 3: Pass `tipoCobranca` in `handleSaveOperacao`**

Find:

```tsx
    const err = await createOperacao({
      clienteId: form.clienteId,
      fonte: form.fonte,
      cartaoId: form.fonte === 'cartao' ? form.cartaoId : undefined,
      fundoDinheiroId: form.fonte === 'dinheiro' ? form.fundoDinheiroId : undefined,
      valorEnviado: valorEnviadoNum,
      taxaAplicada: taxaNum,
      formaPagamento: form.formaPagamento,
      quantidadeParcelas: parcelasNum,
      observacoes: form.observacoes,
    });
```

Replace with:

```tsx
    const err = await createOperacao({
      clienteId: form.clienteId,
      fonte: form.fonte,
      cartaoId: form.fonte === 'cartao' ? form.cartaoId : undefined,
      fundoDinheiroId: form.fonte === 'dinheiro' ? form.fundoDinheiroId : undefined,
      valorEnviado: valorEnviadoNum,
      taxaAplicada: taxaNum,
      tipoCobranca: form.fonte === 'dinheiro' ? form.tipoCobranca : 'total',
      formaPagamento: form.formaPagamento,
      quantidadeParcelas: parcelasNum,
      observacoes: form.observacoes,
    });
```

- [ ] **Step 4: Reset `tipoCobranca` when Fonte changes, and add the new field**

Find:

```tsx
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Fonte do Patrimônio</label>
                  <select value={form.fonte}
                    onChange={e => {
                      const fonte = e.target.value as 'cartao' | 'dinheiro';
                      setForm(f => ({ ...f, fonte, cartaoId: '', fundoDinheiroId: '', taxaAplicada: '10' }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="dinheiro">Dinheiro (capital próprio)</option>
                  </select>
                </div>
                {form.fonte === 'cartao' ? (
```

Replace with:

```tsx
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Fonte do Patrimônio</label>
                  <select value={form.fonte}
                    onChange={e => {
                      const fonte = e.target.value as 'cartao' | 'dinheiro';
                      setForm(f => ({ ...f, fonte, cartaoId: '', fundoDinheiroId: '', taxaAplicada: '10', tipoCobranca: 'total' }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="dinheiro">Dinheiro (capital próprio)</option>
                  </select>
                </div>
                {form.fonte === 'dinheiro' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tipo de Cobrança</label>
                    <select value={form.tipoCobranca}
                      onChange={e => setForm(f => ({ ...f, tipoCobranca: e.target.value as 'total' | 'somente_juros' }))}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                      <option value="total">Valor Total (principal + juros)</option>
                      <option value="somente_juros">Somente Juros (principal fica em aberto)</option>
                    </select>
                  </div>
                )}
                {form.fonte === 'cartao' ? (
```

- [ ] **Step 5: Hide Forma de Pagamento / Parcelas when Somente Juros is selected**

Find:

```tsx
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Forma de Pagamento</label>
                  <select value={form.formaPagamento} onChange={e => setForm(f => ({ ...f, formaPagamento: e.target.value as 'avista' | 'parcelado' }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option value="avista">À Vista</option>
                    <option value="parcelado">Parcelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Parcelas</label>
                  <input type="number" value={form.quantidadeParcelas} onChange={e => setForm(f => ({ ...f, quantidadeParcelas: e.target.value }))}
                    disabled={form.formaPagamento === 'avista'}
                    className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    placeholder="1" min={1} max={24} />
                </div>
```

Replace with:

```tsx
                {!somenteJurosSelecionado && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Forma de Pagamento</label>
                      <select value={form.formaPagamento} onChange={e => setForm(f => ({ ...f, formaPagamento: e.target.value as 'avista' | 'parcelado' }))}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        <option value="avista">À Vista</option>
                        <option value="parcelado">Parcelado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Parcelas</label>
                      <input type="number" value={form.quantidadeParcelas} onChange={e => setForm(f => ({ ...f, quantidadeParcelas: e.target.value }))}
                        disabled={form.formaPagamento === 'avista'}
                        className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        placeholder="1" min={1} max={24} />
                    </div>
                  </>
                )}
```

- [ ] **Step 6: Update the preview summary panel**

Find:

```tsx
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>Resumo da Operação (prévia)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total a Receber</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{valorEnviadoNum ? formatCurrency(previewTotalReceber) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Lucro</p>
                    <p className="text-sm font-bold text-success-600">{valorEnviadoNum ? formatCurrency(lucro) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Valor Parcela</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{valorEnviadoNum ? formatCurrency(valorParcela) : '—'}</p>
                  </div>
                </div>
              </div>
```

Replace with:

```tsx
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>Resumo da Operação (prévia)</p>
                {somenteJurosSelecionado ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Juros por Período</p>
                        <p className="text-sm font-bold text-success-600">{valorEnviadoNum ? formatCurrency(jurosPorPeriodo) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Principal (fica em aberto)</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{valorEnviadoNum ? formatCurrency(valorEnviadoNum) : '—'}</p>
                      </div>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                      O cliente paga só os juros a cada período. O principal fica em aberto até você quitar manualmente.
                    </p>
                  </>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total a Receber</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{valorEnviadoNum ? formatCurrency(previewTotalReceber) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Lucro</p>
                      <p className="text-sm font-bold text-success-600">{valorEnviadoNum ? formatCurrency(lucro) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Valor Parcela</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{valorEnviadoNum ? formatCurrency(valorParcela) : '—'}</p>
                    </div>
                  </div>
                )}
              </div>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Operacoes.tsx
git commit -m "feat: Nova Operacao form supports Tipo de Cobranca (somente juros)"
```

---

### Task 7: List table and detail modal — Quitar Principal action and display

**Files:**
- Modify: `src/pages/Operacoes.tsx:2` (icon import)
- Modify: `src/pages/Operacoes.tsx:12-16` (`useData()` destructure)
- Modify: `src/pages/Operacoes.tsx:27` (add `confirmQuitarPrincipal` state)
- Modify: `src/pages/Operacoes.tsx:103-110` (add `handleQuitarPrincipal`, near `handleDelete`)
- Modify: `src/pages/Operacoes.tsx:209-211` (list table Taxa/Parcelas columns)
- Modify: `src/pages/Operacoes.tsx:240-254` (detail modal header buttons)
- Modify: `src/pages/Operacoes.tsx:275-288` (detail modal Fonte/Forma Pgto/Status grid)
- Modify: `src/pages/Operacoes.tsx:313` (Parcelas table `#` column)
- Modify: `src/pages/Operacoes.tsx:522-532` (confirm modals section — add the Quitar Principal confirm modal)

**Interfaces:**
- Consumes: `quitarPrincipal` (Task 5), `Operacao.tipoCobranca`/`principalQuitado`/`dataQuitacaoPrincipal` (Task 2).
- Produces: no new exports — leaf UI.

- [ ] **Step 1: Import the `Wallet` icon**

Find:

```tsx
import { HandCoins, Plus, Search, Eye, X, Calendar, Loader2, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
```

Replace with:

```tsx
import { HandCoins, Plus, Search, Eye, X, Calendar, Loader2, Pencil, Trash2, CheckCircle2, Wallet } from 'lucide-react';
```

- [ ] **Step 2: Destructure `quitarPrincipal` from `useData()`**

Find:

```tsx
  const {
    operacoes, cartoes, fundosDinheiro, clientes, loading,
    getClienteNome, getFonteNome,
    createOperacao, updateOperacao, deleteOperacao, pagarParcela,
  } = useData();
```

Replace with:

```tsx
  const {
    operacoes, cartoes, fundosDinheiro, clientes, loading,
    getClienteNome, getFonteNome,
    createOperacao, updateOperacao, deleteOperacao, pagarParcela, quitarPrincipal,
  } = useData();
```

- [ ] **Step 3: Add state for the Quitar Principal confirmation**

Find:

```tsx
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
```

Replace with:

```tsx
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [confirmQuitarPrincipal, setConfirmQuitarPrincipal] = useState<{ id: string; label: string } | null>(null);
```

- [ ] **Step 4: Add the `handleQuitarPrincipal` handler**

Find:

```tsx
  const handleDelete = async () => {
    if (!confirmDelete) return;
    const err = await deleteOperacao(confirmDelete.id);
    setConfirmDelete(null);
    if (err) { showToast(err, 'error'); return; }
    setSelectedOp(null);
    showToast('Operação excluída.');
  };
```

Replace with:

```tsx
  const handleDelete = async () => {
    if (!confirmDelete) return;
    const err = await deleteOperacao(confirmDelete.id);
    setConfirmDelete(null);
    if (err) { showToast(err, 'error'); return; }
    setSelectedOp(null);
    showToast('Operação excluída.');
  };

  const handleQuitarPrincipal = async () => {
    if (!confirmQuitarPrincipal) return;
    const err = await quitarPrincipal(confirmQuitarPrincipal.id);
    setConfirmQuitarPrincipal(null);
    if (err) { showToast(err, 'error'); return; }
    setSelectedOp(null);
    showToast('Principal quitado com sucesso!');
  };
```

- [ ] **Step 5: Update the list table's Taxa and Parcelas columns**

Find:

```tsx
                    <td className="px-4 py-3 text-sm hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>{op.taxaAplicada}%</td>
                    <td className="px-4 py-3 text-sm font-medium hidden sm:table-cell" style={{ color: 'var(--text-primary)' }}>{formatCurrency(op.valorTotalReceber)}</td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>{op.quantidadeParcelas}x {formatCurrency(op.parcelas[0]?.valor || 0)}</td>
```

Replace with:

```tsx
                    <td className="px-4 py-3 text-sm hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {op.taxaAplicada}%
                      {op.tipoCobranca === 'somente_juros' && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>Juros</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium hidden sm:table-cell" style={{ color: 'var(--text-primary)' }}>{formatCurrency(op.valorTotalReceber)}</td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {op.tipoCobranca === 'somente_juros'
                        ? `Recorrente (${formatCurrency(op.parcelas[op.parcelas.length - 1]?.valor ?? 0)})`
                        : `${op.quantidadeParcelas}x ${formatCurrency(op.parcelas[0]?.valor || 0)}`}
                    </td>
```

- [ ] **Step 6: Add the Quitar Principal button in the detail modal header**

Find:

```tsx
              <div className="flex items-center gap-2">
                <button onClick={() => handleOpenEdit(selectedOp)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
                {!selectedOp.parcelas.some(p => p.status === 'paga') && (
                  <button
                    onClick={() => setConfirmDelete({ id: selectedOp.id, label: `Op. #${selectedOp.id.slice(0, 8).toUpperCase()}` })}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title="Excluir">
                    <Trash2 className="w-4 h-4 text-danger-500" />
                  </button>
                )}
                <button onClick={() => setSelectedOp(null)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                  <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
```

Replace with:

```tsx
              <div className="flex items-center gap-2">
                <button onClick={() => handleOpenEdit(selectedOp)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
                {selectedOp.tipoCobranca === 'somente_juros' && !selectedOp.principalQuitado && (
                  <button
                    onClick={() => setConfirmQuitarPrincipal({ id: selectedOp.id, label: `Op. #${selectedOp.id.slice(0, 8).toUpperCase()}` })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors" title="Quitar Principal">
                    <Wallet className="w-3.5 h-3.5" /> Quitar Principal
                  </button>
                )}
                {!selectedOp.parcelas.some(p => p.status === 'paga') && !selectedOp.principalQuitado && (
                  <button
                    onClick={() => setConfirmDelete({ id: selectedOp.id, label: `Op. #${selectedOp.id.slice(0, 8).toUpperCase()}` })}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title="Excluir">
                    <Trash2 className="w-4 h-4 text-danger-500" />
                  </button>
                )}
                <button onClick={() => setSelectedOp(null)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                  <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
```

- [ ] **Step 7: Show "Somente Juros" and a Principal tile in the detail modal**

Find:

```tsx
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Fonte</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{getFonteNome(selectedOp)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Forma Pgto</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selectedOp.formaPagamento === 'avista' ? 'À vista' : `${selectedOp.quantidadeParcelas}x`}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Status</p>
                  <div className="mt-0.5"><StatusBadge status={selectedOp.status} /></div>
                </div>
              </div>
```

Replace with:

```tsx
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Fonte</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{getFonteNome(selectedOp)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Forma Pgto</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {selectedOp.tipoCobranca === 'somente_juros'
                      ? 'Somente Juros (recorrente)'
                      : (selectedOp.formaPagamento === 'avista' ? 'À vista' : `${selectedOp.quantidadeParcelas}x`)}
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Status</p>
                  <div className="mt-0.5"><StatusBadge status={selectedOp.status} /></div>
                </div>
                {selectedOp.tipoCobranca === 'somente_juros' && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Principal</p>
                    <p className="text-sm font-medium" style={{ color: selectedOp.principalQuitado ? '#34d399' : 'var(--text-primary)' }}>
                      {selectedOp.principalQuitado
                        ? `Quitado em ${formatDate(selectedOp.dataQuitacaoPrincipal!)}`
                        : `${formatCurrency(selectedOp.valorEnviado)} em aberto`}
                    </p>
                  </div>
                )}
              </div>
```

- [ ] **Step 8: Update the Parcelas table `#` column**

Find:

```tsx
                          <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.numero}/{selectedOp.quantidadeParcelas}</td>
```

Replace with:

```tsx
                          <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {selectedOp.tipoCobranca === 'somente_juros' ? `Juros #${p.numero}` : `${p.numero}/${selectedOp.quantidadeParcelas}`}
                          </td>
```

- [ ] **Step 9: Add the Quitar Principal confirmation modal**

Find:

```tsx
      {/* Confirm Delete */}
      {confirmDelete && (
        <ConfirmModal
          title="Excluir operação?"
          message={`Tem certeza que deseja excluir a ${confirmDelete.label}? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
```

Replace with:

```tsx
      {/* Confirm Delete */}
      {confirmDelete && (
        <ConfirmModal
          title="Excluir operação?"
          message={`Tem certeza que deseja excluir a ${confirmDelete.label}? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Confirm Quitar Principal */}
      {confirmQuitarPrincipal && (
        <ConfirmModal
          title="Quitar principal?"
          message={`Confirma a devolução do principal da ${confirmQuitarPrincipal.label}? O valor voltará para o fundo de dinheiro e nenhuma nova parcela de juros será gerada.`}
          confirmLabel="Quitar Principal"
          onConfirm={handleQuitarPrincipal}
          onCancel={() => setConfirmQuitarPrincipal(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 10: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add src/pages/Operacoes.tsx
git commit -m "feat: Quitar Principal action and somente_juros display in Operacoes"
```

---

### Task 8: Dinheiro.tsx — Juros badge in fundo detail table

**Files:**
- Modify: `src/pages/Dinheiro.tsx:261` (the Taxa cell in the fundo detail operações table)

**Interfaces:**
- Consumes: `Operacao.tipoCobranca` (Task 2).
- Produces: no new exports — leaf UI.

- [ ] **Step 1: Add the badge next to the taxa**

Find:

```tsx
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{op.taxaAplicada}%</td>
```

Replace with:

```tsx
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {op.taxaAplicada}%
                            {op.tipoCobranca === 'somente_juros' && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>Juros</span>
                            )}
                          </td>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dinheiro.tsx
git commit -m "feat: show Juros badge for somente_juros operations in fundo detail"
```

---

## Post-implementation manual checklist

There is no automated test suite in this project (confirmed: no vitest/jest in `package.json`). Run through this checklist manually after all 8 tasks are committed, using a test Supabase project or the dev database:

1. **Apply the migration:** open the Supabase SQL Editor and run the contents of `supabase/migrations/006_operacao_somente_juros.sql`.
2. Run `npm run dev` and log in.
3. Go to **Dinheiro**, create (or reuse) a fundo with `valorDisponivel` of at least R$ 1.000.
4. Go to **Operações → Nova Operação**. Select a cliente, Fonte = "Dinheiro (capital próprio)", pick the fundo. Confirm the **"Tipo de Cobrança"** field appears, and switching it to **"Somente Juros"** hides "Forma de Pagamento"/"Parcelas" and updates the preview to show "Juros por Período" and "Principal (fica em aberto)".
5. Set Valor Enviado = 1000, Taxa = 10, Tipo de Cobrança = Somente Juros. Register the operation. Confirm:
   - The fundo's `valorDisponivel` dropped by exactly R$ 1.000.
   - The operação appears in the list with a "Juros" badge next to the taxa, and the Parcelas column shows "Recorrente (R$ 100,00)".
6. Open the operação's detail modal. Confirm it shows "Forma Pgto: Somente Juros (recorrente)", a "Principal" tile showing "R$ 1.000,00 em aberto", and exactly 1 parcela labeled "Juros #1" with value R$ 100,00.
7. Click "Pagar" on that parcela. Confirm:
   - The fundo's `valorDisponivel` increases by R$ 100,00.
   - A new "Juros #2" parcela appears (pendente, due ~30 days later).
   - The operação's "Principal" tile still shows R$ 1.000,00 em aberto.
   - "Total a Receber" in the list/detail grew by R$ 100,00 (now reflects principal + 2 periods of interest, one paid one pending).
8. Click **"Quitar Principal"**, confirm in the modal. Confirm:
   - The fundo's `valorDisponivel` increases by R$ 1.000,00 (the principal).
   - The "Principal" tile now shows "Quitado em <hoje>".
   - The "Quitar Principal" button disappears.
   - If a parcela was still pendente at this point, the operação status stays `em_aberto`, and the parcela can still be paid via "Pagar" (verify it pays normally and does **not** spawn a new parcela afterward, since `principalQuitado` is now `true`).
9. After paying that last pendente parcela post-quitação, confirm the operação's status becomes `Pago` and no further parcelas are generated.
10. Try to delete an operação in "somente_juros" mode after quitting the principal — confirm the delete button doesn't even appear in the header once `principalQuitado` is true (per Step 6 of Task 7).
11. Create a second operação with Fonte = "Cartão de Crédito" and confirm the "Tipo de Cobrança" field does **not** appear, and the operation behaves exactly as before (regression check).
12. Create a third operação with Fonte = "Dinheiro" and Tipo de Cobrança = "Valor Total" (default) and confirm it behaves exactly like before this feature existed (regression check for the untouched path).
