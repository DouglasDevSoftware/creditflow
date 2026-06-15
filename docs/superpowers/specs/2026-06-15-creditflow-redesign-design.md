# CreditFlow — Frontend Redesign

**Data:** 2026-06-15  
**Status:** Aprovado para implementação

---

## Objetivo

Elevar o frontend do CreditFlow de um design padrão claro/escuro para um visual premium de fintech com estética **Glassmorphism Dark + Glow**, inspirado nas referências de apps financeiros de alto padrão fornecidas pelo cliente.

---

## Decisões de Design

| Decisão | Escolha |
|---|---|
| Estilo visual | Glassmorphism Dark + Glow |
| Cor de acento | Teal Neon `#00d5c4` |
| Modo de cor | Dark only (toggle removido) |
| Sidebar | Slim (64px) + expansão ao hover (220px) |
| Escopo | Shared components + Dashboard (outras páginas herdam) |
| Abordagem | Design System First |

---

## Paleta de Cores

```css
/* Backgrounds */
--bg-deep:      #080d14;   /* fundo mais profundo do app */
--bg-primary:   #0d1421;   /* fundo principal do conteúdo */
--bg-secondary: #111827;   /* fundo alternado / hover */

/* Glassmorphism */
--glass-bg:     rgba(255, 255, 255, 0.04);
--glass-border: rgba(255, 255, 255, 0.08);

/* Acento */
--accent:       #00d5c4;
--accent-dark:  #00a896;

/* Semânticas */
--success:      #10b981;
--danger:       #ef4444;
--warning:      #f59e0b;
--purple:       #a78bfa;

/* Tipografia */
--text-primary:   #f8fafc;
--text-secondary: #94a3b8;
--text-tertiary:  #475569;
--text-muted:     #334155;
```

---

## CSS Tokens de Glassmorphism

```css
--glass-blur:      blur(16px);
--glass-blur-sm:   blur(8px);
--glow-accent:     0 0 20px rgba(0, 213, 196, 0.15);
--glow-accent-sm:  0 0 12px rgba(0, 213, 196, 0.1);
--glow-danger:     0 0 12px rgba(239, 68, 68, 0.2);
--glow-success:    0 0 12px rgba(16, 185, 129, 0.2);
--radius-card:     16px;
--radius-sm:       10px;
--sidebar-slim:    64px;
--sidebar-full:    220px;
```

---

## Componentes Afetados

### 1. `index.css` — Design System
- Remover variáveis do modo claro e dark toggle
- Aplicar paleta dark permanente via `:root`
- Adicionar tokens de glassmorphism, glow e border
- Manter tokens semânticos de cor (success, danger, warning)
- Adicionar `--font-display` (Plus Jakarta Sans) e importação Google Fonts

### 2. `Sidebar.tsx` — Slim + Hover Expand
- Remover botão "Recolher" e estado `collapsed`
- Sidebar fixada em `64px` via CSS, expande para `220px` ao `:hover` com `transition`
- Fundo: `rgba(255,255,255,0.025)` + `backdrop-filter: blur(20px)`
- Borda direita: `1px solid rgba(0,213,196,0.10)`
- Logo: ícone com gradiente teal + glow; texto "CreditFlow" aparece só expandida
- Item ativo: `background: rgba(0,213,196,0.10)`, `border: 1px solid rgba(0,213,196,0.25)`, `box-shadow: glow-accent-sm`, cor teal
- Item inativo: `color: rgba(255,255,255,0.38)`, hover `rgba(255,255,255,0.75)`
- Labels ficam `opacity: 0` colapsado, `opacity: 1` expandido com `transition`
- Remover suporte a mobile overlay (sidebar sempre visível no desktop; mobile mantém hamburger com drawer)

### 3. `Header.tsx` — Glassmorphism Header
- Remover props `darkMode: boolean` e `onToggleDarkMode: () => void` da interface `HeaderProps`
- Remover botão de toggle dark/light mode
- Fundo: `rgba(255,255,255,0.025)` + `backdrop-filter: blur(20px)`
- Borda inferior: `1px solid rgba(0,213,196,0.08)`
- Campo de busca: `background: rgba(255,255,255,0.05)`, border sutil
- Botão de sino: borda sutil + dot vermelho pulsante com `box-shadow: 0 0 6px #ef4444`
- Avatar: gradiente teal + `border: 2px solid rgba(0,213,196,0.4)` + glow sutil

### 4. `KPICard.tsx` — Glass Cards com Glow
- Fundo: `rgba(255,255,255,0.04)` + `backdrop-filter: blur(16px)`
- Borda: `1px solid rgba(255,255,255,0.07)`
- Border-radius: `16px`
- Hover: `border-color: rgba(0,213,196,0.25)`, `translateY(-1px)`
- Card primário (Patrimônio Disponível): variante `primary` com `background: rgba(0,213,196,0.06)`, borda teal, `box-shadow: glow-accent`
- Ícone em box com cor temática por tipo (teal, green, red, purple, yellow)
- Glow blob absoluto no canto superior direito, colorido por `color` prop
- Valor: `font-size: 20px`, `font-weight: 800`, `letter-spacing: -0.5px`
- Label: `10px`, `uppercase`, `letter-spacing: 1px`, `color: --text-tertiary`
- Trend: cor semântica (teal/success/danger/muted por direction)

### 5. `StatusBadge.tsx` — Badges com Borda Colorida
- Substituir fundos sólidos por `background: rgba(cor, 0.12)` + `border: 1px solid rgba(cor, 0.25)`
- Border-radius: `20px` (pill)
- Font: `10px`, `font-weight: 600`
- Ponto colorido (`●`) antes do texto
- Variantes: pago (green), em_aberto (blue), pago_parcialmente (yellow), atrasado (red), inadimplente (red escuro)

### 6. `Dashboard.tsx` — Layout e Alertas
- Alertas: substituir fundos `bg-red-50` por `rgba(239,68,68,0.07)` + `border: 1px solid rgba(239,68,68,0.18)`, border-radius `10px`
- Dot de alerta danger: `box-shadow: 0 0 6px #ef4444` + `animation: pulse`
- Cards dos gráficos: mesmo padrão glass (fundo `rgba(255,255,255,0.03)`, border `rgba(255,255,255,0.06)`, radius `16px`)
- Títulos de seção dos gráficos: `12px uppercase letter-spacing 0.8px color: --text-secondary`
- Tabelas: fundo zero, `th` com `rgba(255,255,255,0.02)`, row hover `rgba(0,213,196,0.03)`
- Cabeçalhos de tabela: `10px uppercase letter-spacing 0.8px color: --text-muted`
- Recharts: atualizar cores das barras para teal (`#00d5c4`) e danger (`#ef4444`), `CartesianGrid` com `rgba(255,255,255,0.04)`
- Recharts `<Tooltip>` com `contentStyle: { background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f5f9' }`

### 7. `App.tsx` — Remover Dark Mode Toggle
- Remover estado `darkMode` e `useEffect` de toggle
- Remover `localStorage.getItem('darkMode')`
- Aplicar `document.documentElement` sem classe `.dark`
- Passar `darkMode={false}` não será mais necessário no Header

---

## Arquitetura do Design System

```
index.css
 ├── :root → tokens dark permanentes (sem .dark class)
 ├── @theme → paleta Tailwind (primary = teal)
 └── utilitários globais (scrollbar, print)

Componentes compartilhados (herdam via CSS vars):
 ├── Sidebar.tsx     → glassmorphism + hover expand
 ├── Header.tsx      → glassmorphism + sem toggle
 ├── KPICard.tsx     → glass card + glow por cor
 └── StatusBadge.tsx → pill com borda colorida

Páginas (herdam ~80% automaticamente):
 ├── Dashboard.tsx   → ajustes de gráficos + alertas (escopo desta iteração)
 ├── Cartoes.tsx     → herda (ajustes menores se necessário)
 ├── Dinheiro.tsx    → herda
 ├── Clientes.tsx    → herda
 ├── Operacoes.tsx   → herda
 ├── Financeiro.tsx  → herda
 └── Relatorios.tsx  → herda
```

---

## Comportamentos Interativos

- **Sidebar hover**: `transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1)`; labels com `opacity 0.15s delay 0.05s`
- **KPI card hover**: `transform: translateY(-1px)`, border-color teal, `transition: all 0.2s`
- **Table row hover**: background `rgba(0,213,196,0.03)`
- **Bell dot**: `animation: pulse 2s infinite` (opacity 1→0.35→1)
- **Alert danger dot**: mesma animação pulse + `box-shadow: 0 0 6px #ef4444`
- **Scrollbar**: `width: 6px`, thumb `rgba(0,213,196,0.3)`, hover `rgba(0,213,196,0.5)`

---

## Fora de Escopo

- Novas funcionalidades ou rotas
- Responsividade mobile além do que já existe (drawer mobile mantido)
- Refactor de lógica de negócio ou contextos
- Animações de página / page transitions
- Outras páginas além do Dashboard (herdam via design system, ajustes pontuais se necessário)
