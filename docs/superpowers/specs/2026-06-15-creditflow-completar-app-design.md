# CreditFlow — Spec de Completude do App
**Data:** 2026-06-15  
**Status:** Aprovado pelo usuário

---

## Contexto

App de gestão de empréstimos pessoais (React + Vite + Tailwind + Supabase). Base sólida: auth multi-tenant com RLS, 7 páginas, CRUD parcial. Análise identificou 17 lacunas divididas em 4 categorias: bloqueadores críticos, funcionalidades faltando, UX e banco de dados.

---

## Escopo

### 🔴 FASE 1 — Bloqueadores críticos

**1. Dar baixa em parcela**
- Nova função `pagarParcela(parcelaId, operacaoId)` no DataContext
- Atualiza `parcelas.status = 'paga'`, `parcelas.data_pagamento = hoje`
- Recalcula `operacoes.status`: se todas as parcelas pagas → `pago`; se alguma paga → `pago_parcialmente`; se alguma vencida → `atrasado`
- Para fonte `dinheiro`: aumenta `valor_disponivel` do fundo pelo valor da parcela recebida (o dinheiro volta ao caixa)
- Para fonte `cartao`: NÃO restaura `limite_disponivel` — o limite do cartão só volta quando o usuário paga a fatura, que é registrada manualmente como saída no Financeiro. O que entra é só caixa.
- Registra `movimentacao` do tipo `entrada` (categoria `Recebimento`) automaticamente
- Botão "Pagar" aparece ao lado de cada parcela `pendente` ou `vencida` no modal de Operação

**2. Atualização automática de parcelas vencidas**
- Ao carregar dados (`refresh`), percorrer todas as parcelas com `status = 'pendente'` e `vencimento < hoje` e atualizá-las para `vencida` em batch no Supabase
- Após atualizar parcelas vencidas, recalcular status das operações afetadas

**3. Status do cliente calculado automaticamente**
- Nova função `recalcularStatusCliente(clienteId)` chamada após pagar parcela ou ao refresh
- Regra: se tem parcela `vencida` → cliente `atrasado`; se operação `inadimplente` → cliente `inadimplente`; sem pendências → `adimplente`
- Atualiza `clientes.situacao` no Supabase

**4. Botões de export funcionais**
- PDF: usar `window.print()` com uma view de impressão CSS (`@media print`) — sem dependência extra
- CSV: serializar dados do relatório atual em CSV e forçar download via `Blob`
- Excel: gerar CSV com separador `;` (compatível com Excel BR) — sem lib extra

---

### 🟡 FASE 2 — CRUD completo

**5. Editar cliente**
- Nova função `updateCliente(id, data)` no DataContext
- Botão "Editar" no modal de detalhe do cliente (ícone `Pencil`)
- Mesmo formulário do criar, pré-preenchido

**6. Atualizar status do cliente manualmente**
- Dropdown de situação no modal de detalhe: `adimplente | atrasado | inadimplente | bloqueado`
- Chama `updateCliente` com novo status

**7. Deletar cliente**
- Nova função `deleteCliente(id)` no DataContext
- Só permite deletar se cliente não tiver operações em aberto (validação no frontend)
- Botão "Excluir" no modal de detalhe

**8. Editar operação**
- `updateOperacao(id, data)` — apenas campos: `observacoes`, `status` (manual override)
- Botão "Editar" no modal de detalhe da operação

**9. Deletar operação**
- `deleteOperacao(id)` — deleta em cascade (parcelas são deletadas pelo ON DELETE CASCADE)
- Só permite se status for `em_aberto` e sem parcelas pagas

**10. Editar cartão**
- `updateCartao(id, data)` — atualiza nome, banco, bandeira, limites, vencimentos
- Botão "Editar" no card de cartão

**11. Editar fundo de dinheiro**
- `updateFundoDinheiro(id, data)` — atualiza nome, taxa padrão, status, observações
- Botão "Editar" no detalhe do fundo

**12. Filtro de período dinâmico no Financeiro**
- Gerar lista dos últimos 12 meses dinamicamente a partir de `new Date()`
- Substituir os `<option>` hardcoded por loop calculado

**13. Trends reais no Dashboard**
- Calcular comparativo real entre mês atual e mês anterior para: "Total a Receber" e "Lucro Estimado"
- Remover os `'+12% vs mês anterior'` e `'+8% vs mês anterior'` hardcoded

---

### 🟠 FASE 3 — UX / Frontend

**14. Toast de feedback de sucesso/erro**
- Componente `Toast` simples no topo da tela: aparece por 3s após criar/editar/deletar com sucesso
- Sem lib externa — estado no App root repassado via context leve

**15. Empty states em Clientes e Operações**
- Clientes: ícone `Users` + "Nenhum cliente cadastrado. Adicione o primeiro cliente."
- Operações: ícone `HandCoins` + "Nenhuma operação registrada. Crie a primeira operação."

**16. Modal de confirmação para deletar**
- Componente `ConfirmModal` reutilizável: título + mensagem + botões Cancelar/Confirmar
- Substituir `confirm()` e `alert()` nativos em todos os lugares

**17. ID da operação corrigido no modal**
- `selectedOp.id.slice(0, 8).toUpperCase()` em vez de `.replace('op', '')`

---

### 🔵 FASE 4 — Banco de dados

**18. Índice em parcelas.vencimento**
- Migration `003_performance_indexes.sql`
- `CREATE INDEX idx_parcelas_vencimento ON parcelas(vencimento);`
- `CREATE INDEX idx_parcelas_status ON parcelas(status);`

---

## Arquitetura das mudanças

### DataContext (src/contexts/DataContext.tsx)
Novas funções adicionadas à interface e implementação:
- `pagarParcela(parcelaId, operacaoId) → Promise<string | null>`
- `updateCliente(id, data) → Promise<string | null>`
- `deleteCliente(id) → Promise<string | null>`
- `updateOperacao(id, data) → Promise<string | null>`
- `deleteOperacao(id) → Promise<string | null>`
- `updateCartao(id, data) → Promise<string | null>`
- `updateFundoDinheiro(id, data) → Promise<string | null>`

Lógica interna no `refresh`:
- Batch update de parcelas vencidas
- Recalculo de status das operações
- Recalculo de situação dos clientes

### Novos componentes (src/components/)
- `Toast.tsx` — notificação flutuante com auto-dismiss
- `ConfirmModal.tsx` — modal de confirmação reutilizável
- `ToastContext.tsx` — context para disparar toasts de qualquer página

### Modificações em páginas
- `Operacoes.tsx` — botão "Pagar" em cada parcela pendente/vencida, ID corrigido, empty state
- `Clientes.tsx` — editar, deletar, alterar status, empty state
- `Cartoes.tsx` — editar cartão, modal de confirmação de delete
- `Dinheiro.tsx` — editar fundo
- `Financeiro.tsx` — filtro de período dinâmico
- `Dashboard.tsx` — trends calculados
- `Relatorios.tsx` — export CSV/PDF funcionais

### Nova migration (supabase/migrations/)
- `003_performance_indexes.sql`

---

## Ordem de implementação

1. Migration 003 (índices)
2. DataContext — funções de update/delete + `pagarParcela` + lógica de refresh
3. ToastContext + Toast + ConfirmModal (componentes base usados por tudo)
4. Operacoes.tsx — pagar parcela + ID fix + empty state
5. Clientes.tsx — edit/delete/status + empty state
6. Cartoes.tsx — edit + confirm modal
7. Dinheiro.tsx — edit fundo
8. Financeiro.tsx — período dinâmico
9. Dashboard.tsx — trends reais
10. Relatorios.tsx — export CSV + PDF

---

## O que NÃO está no escopo

- Paginação (requer refactor de queries, deixar para próxima iteração)
- Notificações push
- Multi-usuário compartilhado
- Qualquer nova página ou funcionalidade não listada acima
