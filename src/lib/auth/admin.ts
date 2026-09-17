import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/account";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase URL and Service Role Key must be configured.");
  }

  return createSupabaseAdminClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new UnauthorizedError("Faça login para continuar.");
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, is_super_admin, account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileErr || !profile || !profile.is_super_admin) {
    throw new ForbiddenError("Acesso restrito ao Super Administrador do sistema.");
  }

  return {
    user,
    profile,
    supabaseAdmin: supabaseAdmin(),
  };
}
