-- Keep-alive: evita que o Supabase (plano free) pause o projeto por inatividade.
-- O workflow .github/workflows/supabase-keep-alive.yml chama keep_alive_ping()
-- diariamente via REST. A função GRAVA uma linha (atividade real no banco, não
-- só leitura) e apaga registros com mais de 30 dias para a tabela não crescer.

CREATE TABLE IF NOT EXISTS public.keep_alive (
  id BIGSERIAL PRIMARY KEY,
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT
);

-- RLS ligado e sem policies: ninguém acessa a tabela diretamente pela API,
-- somente através da função SECURITY DEFINER abaixo.
ALTER TABLE public.keep_alive ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.keep_alive_ping(p_source TEXT DEFAULT 'github-actions')
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ;
BEGIN
  INSERT INTO public.keep_alive (source)
  VALUES (left(coalesce(p_source, 'unknown'), 64))
  RETURNING pinged_at INTO v_now;

  DELETE FROM public.keep_alive WHERE pinged_at < now() - INTERVAL '30 days';

  RETURN v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.keep_alive_ping(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.keep_alive_ping(TEXT) TO anon, authenticated;
