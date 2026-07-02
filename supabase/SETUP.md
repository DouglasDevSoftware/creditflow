# Configuração Supabase + Vercel

## 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** → **New query**
3. Cole e execute o conteúdo de `supabase/migrations/001_initial_schema.sql`
4. Execute também `supabase/migrations/002_fundos_dinheiro.sql` (fonte de patrimônio em dinheiro)

## 2. Configurar Auth

1. **Authentication** → **Providers** → habilite **Email**
2. Para desenvolvimento rápido: **Authentication** → **Settings** → desabilite **Confirm email**
3. Crie sua conta pelo app em `/login` ou em **Authentication** → **Users**

## 3. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha com os valores em **Project Settings** → **API**:

- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_ANON_KEY` = anon public key

## 4. Rodar localmente

```bash
npm install
npm run dev
```

## 5. Deploy na Vercel

1. Faça push do código para o GitHub
2. Importe o repositório em [vercel.com](https://vercel.com)
3. Configure as variáveis de ambiente (mesmas do `.env.local`)
4. Build: `npm run build` | Output: `dist`
5. O `vercel.json` já configura o SPA fallback

## Multi-tenant

Cada usuário autenticado vê apenas seus dados. O isolamento é garantido por:

- Coluna `user_id` em todas as tabelas
- Row Level Security (RLS) com `auth.uid() = user_id`
