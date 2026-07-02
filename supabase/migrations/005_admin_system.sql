-- supabase/migrations/005_admin_system.sql

-- ── 1. profiles table ─────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Each user can only read their own row
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- ── 2. Auto-create profile on every new signup ────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 3. is_admin() — used by AuthContext and as gate inside other RPC functions ─
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── 4. admin_list_users() — returns all users with aggregated stats ────────────
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
  id               UUID,
  email            TEXT,
  created_at       TIMESTAMPTZ,
  banned_until     TIMESTAMPTZ,
  clientes_count   BIGINT,
  operacoes_count  BIGINT,
  total_emprestado NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    u.created_at,
    u.banned_until,
    COALESCE((SELECT COUNT(*) FROM clientes  c WHERE c.user_id = u.id), 0)              AS clientes_count,
    COALESCE((SELECT COUNT(*) FROM operacoes o WHERE o.user_id = u.id), 0)              AS operacoes_count,
    COALESCE((SELECT SUM(o.valor_enviado) FROM operacoes o WHERE o.user_id = u.id), 0)  AS total_emprestado
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- ── 5. admin_set_user_ban(target_id, ban) ────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_set_user_ban(target_id UUID, ban BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível bloquear sua própria conta';
  END IF;

  UPDATE auth.users
  SET banned_until = CASE WHEN ban THEN '2099-12-31 00:00:00+00'::TIMESTAMPTZ ELSE NULL END
  WHERE id = target_id;
END;
$$;

-- ── 6. admin_delete_user(target_id) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_delete_user(target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível deletar sua própria conta';
  END IF;

  DELETE FROM auth.users WHERE id = target_id;
END;
$$;
