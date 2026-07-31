-- Hardening: fixa search_path nas funções SECURITY DEFINER da migration 005.
-- Sem isso, um SECURITY DEFINER pode em teoria ser enganado por um objeto com
-- o mesmo nome em outro schema que entre antes de "public" no search_path da
-- sessão. Não é explorável hoje neste projeto (não há caminho de DDL para um
-- usuário authenticated), mas é a recomendação padrão do linter do Supabase.

ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_list_users() SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_set_user_ban(UUID, BOOLEAN) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_delete_user(UUID) SET search_path = public, pg_temp;
