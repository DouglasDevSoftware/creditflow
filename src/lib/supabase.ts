import { createClient } from '@supabase/supabase-js';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'public-anon-key-not-configured';

if (!isSupabaseConfigured) {
  console.warn(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas. Copie .env.example para .env.local.',
  );
}

const REMEMBER_ME_KEY = 'creditflow-remember-me';

export function setRememberMe(remember: boolean) {
  localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false');
}

// "Lembrar de mim" guarda a sessão no localStorage (sobrevive ao fechar o navegador);
// caso contrário usa sessionStorage, que é limpo ao fechar a aba/janela.
function activeStorage() {
  return localStorage.getItem(REMEMBER_ME_KEY) === 'false' ? sessionStorage : localStorage;
}

const rememberAwareStorage = {
  getItem: (key: string) => activeStorage().getItem(key),
  setItem: (key: string, value: string) => activeStorage().setItem(key, value),
  removeItem: (key: string) => activeStorage().removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: rememberAwareStorage },
});
