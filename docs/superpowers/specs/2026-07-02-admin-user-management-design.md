# CreditFlow — Admin User Management
**Data:** 2026-07-02
**Status:** Aprovado pelo usuário

---

## Contexto

O CreditFlow é um app multi-tenant de gestão de empréstimos. Atualmente qualquer pessoa pode criar uma conta (signup aberto) e cada usuário vê apenas seus próprios dados via RLS. Não existe conceito de "admin" ou controle da plataforma.

Este spec adiciona:
1. Um usuário Admin (`douglas_barcellos01@hotmail.com`) com acesso a uma página exclusiva de gerenciamento de usuários
2. Correção dos trends hardcoded no Dashboard (aproveitando o mesmo ciclo de implementação)

O cadastro permanece aberto — qualquer pessoa pode criar conta. O admin controla a plataforma depois se necessário.

---

## Escopo

### O que o admin pode fazer
- **Listar** todos os usuários com estatísticas agregadas (clientes, operações, total emprestado)
- **Bloquear / desbloquear** um usuário — impede login no nível do Supabase Auth (`banned_until`)
- **Deletar** a conta de um usuário — cascade deleta todos os dados vinculados
- O admin **não pode** agir sobre a própria conta (bloquear ou deletar a si mesmo)

### O que o admin NÃO pode fazer (fora do escopo)
- Ver os dados detalhados de outro usuário (clientes, operações individuais)
- Criar contas em nome de outros usuários
- Alterar emails ou senhas de usuários

### Também incluído no mesmo ciclo
- **Dashboard trends reais**: substituir `+12% vs mês anterior` e `+8% vs mês anterior` hardcoded por cálculo real comparando mês atual com mês anterior

---

## Arquitetura

### 1. Banco de dados — `supabase/migrations/005_admin_system.sql`

#### Tabela `profiles`
```sql
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- RLS habilitado: cada usuário só lê a própria linha
- Sem coluna `status` — o estado de bloqueio vive em `auth.users.banned_until` (feature nativa do Supabase)

#### Trigger `on_auth_user_created`
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```
Toda nova conta criada via signup recebe automaticamente `role = 'user'`.

#### RPC Functions (todas SECURITY DEFINER)

| Função | Assinatura | Descrição |
|---|---|---|
| `is_admin` | `() → boolean` | Verifica se `auth.uid()` tem `role = 'admin'` |
| `admin_list_users` | `() → TABLE(...)` | Retorna todos os usuários com stats. Lança exceção se não for admin. |
| `admin_set_user_ban` | `(target_id UUID, ban BOOLEAN) → void` | Seta `banned_until` em `auth.users`. Proíbe auto-bloqueio. |
| `admin_delete_user` | `(target_id UUID) → void` | Deleta `auth.users` (cascade). Proíbe auto-deleção. |

`admin_list_users` retorna por usuário:
- `id`, `email`, `created_at`, `banned_until`
- `clientes_count` — `COUNT(*)` de `clientes WHERE user_id = u.id`
- `operacoes_count` — `COUNT(*)` de `operacoes WHERE user_id = u.id`
- `total_emprestado` — `SUM(valor_enviado)` de `operacoes WHERE user_id = u.id`

#### Seed do admin — `supabase/seed_admin.sql`
Script manual (não é migration numerada — não roda automaticamente). Executar uma única vez no SQL Editor do Supabase após criar a conta `douglas_barcellos01@hotmail.com`:
```sql
INSERT INTO profiles (id, role)
SELECT id, 'admin' FROM auth.users
WHERE email = 'douglas_barcellos01@hotmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### 2. Frontend

#### `src/contexts/AuthContext.tsx` — estender com `isAdmin`
- Adicionar `isAdmin: boolean` à interface `AuthContextValue` (default `false`)
- Após qualquer mudança de sessão (`onAuthStateChange`), se houver usuário, chamar `supabase.rpc('is_admin')` e setar `isAdmin`
- Na saída (`signOut`), resetar `isAdmin` para `false`

#### `src/components/AdminRoute.tsx` — novo arquivo
Guard de rota que protege `/admin`:
- Se `loading`: renderiza spinner
- Se `!isAdmin`: `<Navigate to="/" replace />`
- Se `isAdmin`: renderiza `children`

#### `src/App.tsx` — nova rota
```tsx
<Route path="/admin" element={
  <AdminRoute>
    <Admin />
  </AdminRoute>
} />
```
Rota dentro do `AppLayout` (mesmo sidebar e header das outras páginas).

#### `src/components/Sidebar.tsx` — link admin condicional
- Importar `useAuth` e ler `isAdmin`
- Se `isAdmin`: adicionar item ao menu após `Relatórios`:
  - Ícone: `Shield` (lucide-react)
  - Label: `"Admin"`
  - Path: `"/admin"`
  - Separador visual (`border-top: 1px solid var(--glass-border)`) antes do item
- Usuários normais não veem o item (condicional, sem renderização)

#### `src/pages/Admin.tsx` — novo arquivo
Estrutura:
1. **Header**: título "Gerenciamento de Usuários" + count badge + botão "Atualizar"
2. **Tabela glassmorphism** com colunas:
   - Usuário (email + badge `você` para o próprio admin)
   - Cadastrado em (data formatada `jan/26`)
   - Status (badge: `👑 Admin`, `✅ Ativo`, `🚫 Bloqueado`)
   - Clientes (count)
   - Operações (count)
   - Total Emprestado (soma formatada em R$)
   - Ações (botões Bloquear/Ativar + Deletar)
3. **Ações desabilitadas** na linha do próprio admin
4. **Deletar**: abre `ConfirmModal` existente antes de executar
5. **Estados**: loading (skeleton), erro (banner + retry), vazio

Ao bloquear: `supabase.rpc('admin_set_user_ban', { target_id: id, ban: true })`  
Ao desbloquear: `supabase.rpc('admin_set_user_ban', { target_id: id, ban: false })`  
Ao deletar: `supabase.rpc('admin_delete_user', { target_id: id })`

#### `src/pages/Dashboard.tsx` — trends reais
- Substituir os valores hardcoded `'+12% vs mês anterior'` e `'+8% vs mês anterior'`
- **Total a Receber**: soma de `valorTotalReceber` das operações com `status !== 'pago'`. Comparar o total atual com o total do mês anterior (operações criadas no mês anterior que ainda não estavam pagas naquele ponto — usar `dataTransacao` para filtrar por mês). Exibir delta percentual.
- **Lucro Estimado**: soma de `(valorTotalReceber - valorEnviado)` das operações do mês atual vs mês anterior (filtrar por `dataTransacao` dentro do mês)
- Fórmula do delta: `((atual - anterior) / anterior) * 100`, arredondado para 1 casa decimal
- Se `anterior === 0`: exibir `"Primeiro mês"` no lugar do percentual
- Cor verde se delta ≥ 0, vermelho se delta < 0

---

## Ordem de implementação

1. `supabase/migrations/005_admin_system.sql` — tabela, trigger, RPC functions
2. `supabase/migrations/005_seed_admin.sql` — seed do admin (rodado manualmente)
3. `AuthContext.tsx` — adicionar `isAdmin` via `supabase.rpc('is_admin')`
4. `AdminRoute.tsx` — guard de rota
5. `App.tsx` — registrar rota `/admin`
6. `Sidebar.tsx` — link admin condicional
7. `Admin.tsx` — página completa de gerenciamento
8. `Dashboard.tsx` — trends reais

---

## O que NÃO está no escopo

- Sistema de convites (signup permanece aberto)
- Visualizar dados detalhados de outros usuários
- Audit log de ações do admin
- Multi-admin (apenas um admin hardcoded por email)
- Qualquer nova página ou funcionalidade não listada acima
