import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/auth/admin";
import { SlugLoginForm } from "@/components/auth/slug-login-form";

interface SlugPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = slug.toLowerCase();

  try {
    const db = supabaseAdmin();
    const { data: account } = await db
      .from("accounts")
      .select("pwa_name, pwa_icon_url, name")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (!account) return {};

    const title = account.pwa_name || account.name || "WACRM";
    const icon = account.pwa_icon_url || "/icon-192x192.png";

    return {
      title: `${title} — Entrar`,
      manifest: `/api/manifest?slug=${encodeURIComponent(cleanSlug)}`,
      icons: {
        icon: [{ url: icon }],
        apple: [{ url: icon }],
      },
      appleWebApp: {
        capable: true,
        title,
        statusBarStyle: "default",
      },
    };
  } catch (_e) {
    return {};
  }
}

const RESERVED_SLUGS = new Set([
  "login",
  "signup",
  "dashboard",
  "inbox",
  "contacts",
  "pipelines",
  "broadcasts",
  "automations",
  "flows",
  "settings",
  "agents",
  "admin",
  "api",
  "join",
  "notifications",
  "manifest.webmanifest",
  "favicon.ico",
  "sw.js",
]);

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params;
  const cleanSlug = slug.toLowerCase();

  if (RESERVED_SLUGS.has(cleanSlug)) {
    notFound();
  }

  const db = supabaseAdmin();

  // Fetch account by slug using admin client so RLS allows public brand lookup before login
  const { data: account } = await db
    .from("accounts")
    .select("id, name, pwa_name, pwa_icon_url, is_active")
    .eq("slug", cleanSlug)
    .maybeSingle();

  if (!account || account.is_active === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <div className="max-w-md space-y-4 rounded-xl border border-border bg-card p-8 shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <span className="text-2xl font-bold">404</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            CRM Não Encontrado
          </h1>
          <p className="text-sm text-muted-foreground">
            O endereço <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">/{cleanSlug}</code> não corresponde a nenhum CRM ativo no sistema.
          </p>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Ir para Login Principal
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is already logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // If logged in, check profile membership
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_id, is_super_admin")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.account_id === account.id || profile?.is_super_admin) {
      redirect("/dashboard");
    }
  }

  const pwaTitle = account.pwa_name || account.name || "WACRM";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <SlugLoginForm
          slug={cleanSlug}
          pwaTitle={pwaTitle}
          pwaIconUrl={account.pwa_icon_url}
        />
      </div>
    </div>
  );
}
