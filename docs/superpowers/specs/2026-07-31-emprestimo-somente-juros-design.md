# Empréstimo em Dinheiro: cobrança "Somente Juros" vs "Valor Total"

## Contexto

Hoje, ao criar uma operação de empréstimo (`Operacoes.tsx`), independente da fonte (`cartao` ou
`dinheiro`), o sistema sempre calcula:

```
valorTotalReceber = valorEnviado * (1 + taxaAplicada / 100)
```

Esse total é dividido em N parcelas iguais (capital + juros embutidos), seja à vista (1 parcela) ou
parcelado. Quando uma parcela é paga, o valor cheio dela volta para `valorDisponivel` do fundo de
dinheiro.

Para operações com `fonte = 'dinheiro'`, o usuário precisa de uma segunda opção de cobrança: cobrar
apenas os juros periodicamente sobre o valor emprestado, mantendo o principal em aberto até decidir
quitá-lo separadamente (modelo comum de empréstimo pessoal informal — "juros recorrentes").

Este documento define o design dessa segunda opção. **Escopo: apenas `fonte = 'dinheiro'`.**
Operações com `fonte = 'cartao'` continuam exclusivamente no modelo atual.

## Decisões confirmadas com o usuário

1. No modo "Somente Juros", o cliente paga apenas os juros a cada período (mensal), e o valor
   principal (`valorEnviado`) fica em aberto, sendo devolvido separadamente, quando o usuário decidir
   (não há prazo fixo).
2. As parcelas de juros são geradas **uma de cada vez**: ao pagar a parcela de juros do período
   atual, o sistema gera automaticamente a parcela do período seguinte — e assim por diante,
   indefinidamente, até o principal ser quitado.
3. A quitação do principal é uma **ação separada e dedicada** ("Quitar Principal"), disponível a
   qualquer momento, que encerra a operação e interrompe a geração de novas parcelas de juros.

## Modelo de dados

Novas colunas em `operacoes` (migration `006_operacao_somente_juros.sql`):

| Coluna | Tipo | Default | Descrição |
|---|---|---|---|
| `tipo_cobranca` | ENUM `'total' \| 'somente_juros'` | `'total'` | Define o modelo de cobrança. Só pode ser `'somente_juros'` quando `fonte = 'dinheiro'` (constraint `CHECK`). |
| `principal_quitado` | BOOLEAN | `false` | Só é relevante para `tipo_cobranca = 'somente_juros'`: vira `true` quando o usuário aciona "Quitar Principal". Para operações `'total'`, permanece sempre `false` e não é usado em nenhuma lógica. |
| `data_quitacao_principal` | DATE | `NULL` | Data em que o principal foi quitado. |

`valor_total_receber` passa a ter semânticas diferentes por modo, mas em ambos continua representando
"principal + juros acumulados até agora" — isso é importante porque o "Lucro" é calculado em vários
lugares do app (KPIs, detalhe da operação) como `valorTotalReceber - valorEnviado`, e essa conta só
fica correta se `valorTotalReceber` sempre incluir o principal:
- `'total'` (comportamento atual, inalterado): valor fixo calculado na criação
  (`valorEnviado * (1 + taxa/100)`), dividido nas parcelas.
- `'somente_juros'`: **total acumulado**, começando em `valorEnviado + juros do 1º período`
  (`valorEnviado * (1 + taxa/100)` — mesma fórmula do modo `'total'`, mas só para o primeiro ciclo) e
  incrementado pelo valor de cada nova parcela de juros gerada depois. Assim `valorTotalReceber -
  valorEnviado` sempre resulta nos juros acumulados até agora, igual ao modo `'total'`. **Importante:**
  isso é diferente do valor de cada parcela individual (`parcelas.valor`), que representa só o juro
  puro do período (`valorEnviado * taxa / 100`) — é o que o cliente efetivamente paga a cada ciclo, e
  nunca inclui o principal.

`parcelas` não muda de schema. No modo `somente_juros`, cada linha representa um período de juros:
`valor = valorEnviado * taxaAplicada / 100`, `numero` incrementando a cada ciclo, `vencimento` =
+30 dias a partir da geração.

`forma_pagamento` e `quantidade_parcelas` deixam de ter significado no modo `somente_juros`: são
fixados como `'avista'` / `1` no banco (para caber no schema/constraints existentes) e ocultados na
UI — a tela mostra "Recorrente" no lugar de "Nx".

## Fluxo de criação (`Operacoes.tsx` + `createOperacao`)

Quando `fonte = 'dinheiro'`, novo campo **"Tipo de Cobrança"**:
- `Valor Total` (padrão, pré-selecionado) — sem mudanças no comportamento atual.
- `Somente Juros` — ao selecionar:
  - Campos "Forma de Pagamento" e "Parcelas" ficam ocultos (não se aplicam).
  - O resumo da operação (prévia) mostra "Juros por período: R$ X" e um aviso: "Principal de R$ Y
    fica em aberto até você quitar."

Em `createOperacao`, quando `tipoCobranca === 'somente_juros'`:
1. Gera **uma única parcela** inicial: `numero = 1`, `valor = valorEnviado * taxa / 100` (só o juro,
   sem o principal), `vencimento = hoje + 30 dias`, `status = 'pendente'`.
2. `valor_total_receber` inicial = `valorEnviado + valor` dessa parcela (principal + juro do 1º
   período — ver nota na seção "Modelo de dados" sobre por que o principal entra nessa conta).
3. `forma_pagamento = 'avista'`, `quantidade_parcelas = 1`.
4. Débito em `valorDisponivel` do fundo e movimentação de saída (Pix): idêntico ao fluxo atual.
5. Validação de saldo do fundo (`valorEnviado > valorDisponivel`) continua igual.

## Pagamento e quitação (`pagarParcela` + nova função `quitarPrincipal`)

**Pagar parcela de juros** — reaproveita o botão "Pagar" já existente na tabela de parcelas do
modal de detalhe. Quando a operação é `tipo_cobranca = 'somente_juros'`:
1. Marca a parcela atual como `paga` (igual hoje).
2. Credita o valor da parcela de volta em `valorDisponivel` do fundo (igual hoje).
3. Se `principal_quitado === false`: gera automaticamente a próxima parcela (`numero + 1`,
   `vencimento = hoje + 30 dias`, mesmo valor de juros), e soma esse valor ao `valor_total_receber`
   acumulado da operação.
4. Se `principal_quitado === true` (quitação ocorreu antes desse pagamento, com uma parcela de
   juros do período corrente ainda pendente): paga essa última parcela e **não gera nova parcela**.

**Quitar Principal** — botão novo, visível apenas quando `tipoCobranca === 'somente_juros'` e
`principal_quitado === false` (na tela de detalhe da operação, ao lado do botão de editar):
1. Credita `valorEnviado` de volta em `valorDisponivel` do fundo.
2. Marca `principal_quitado = true`, `data_quitacao_principal = hoje`.
3. Registra uma `movimentacao` de entrada: categoria "Devolução de Principal", vinculada à operação.
4. **Não gera nenhuma parcela nova.** Se já existir uma parcela de juros pendente no momento (juro
   do período corrente), ela permanece e deve ser paga separadamente pelo fluxo normal de "Pagar".
5. Modal de confirmação antes de executar (mesmo padrão do `ConfirmModal` usado em exclusões).

## Status da operação

Para `tipo_cobranca = 'somente_juros'`, `calcularStatusOperacao` (hoje baseado em "todas as
parcelas pagas") não se aplica — nunca há "todas pagas" enquanto o ciclo se renova. Novo cálculo
específico:
- `'atrasado'` se a parcela de juros atual estiver com `status = 'vencida'`.
- `'pago'` somente quando `principal_quitado === true` **e** não houver parcela pendente.
- `'em_aberto'` nos demais casos.

Para `tipo_cobranca = 'total'`, comportamento de status inalterado.

## Exibição

- **Lista de Operações** (`Operacoes.tsx`) e **detalhe do fundo** (`Dinheiro.tsx`): coluna
  "Parcelas" mostra `Recorrente (juros)` em vez de `Nx R$...` quando `somente_juros`. Badge/label
  adicional junto à taxa indicando `Juros` vs `Total`.
- **KPIs** ("Total a Receber", "Lucro Previsto"): somam `valorTotalReceber - valorEnviado`
  normalmente. Como `valorTotalReceber` é o acumulado real (juros já gerados até agora, pagos ou
  pendentes), o KPI reflete o que já foi cobrado/está sendo cobrado — não há previsão de juros
  futuros indefinidos.
- **Detalhe da operação**: mostra `Principal em Aberto` (valor + indicador) enquanto
  `principal_quitado === false`, e `Principal Quitado em <data>` depois.

## Casos de borda

- **Exclusão de operação** (`deleteOperacao`): mantém a regra atual (bloqueia se alguma parcela
  `paga`), e adiciona: bloqueia também se `principal_quitado === true` (dinheiro já movimentado,
  não pode ser simplesmente apagado).
- **Edição**: `tipoCobranca` não é editável após a criação — trocar o tipo no meio do caminho
  quebraria a contabilidade acumulada do fundo. O modal de edição continua limitado a
  `observacoes`/`status`, como hoje.
- **Fonte `cartao`**: campo "Tipo de Cobrança" nem aparece; sempre `'total'`.

## Fora de escopo

- Alterar a taxa de juros no meio de uma operação `somente_juros` já criada.
- Qualquer previsão/projeção de juros futuros nos KPIs (o valor é sempre "até agora", nunca
  estimado para frente).
- Aplicar esse modelo a operações com `fonte = 'cartao'`.
