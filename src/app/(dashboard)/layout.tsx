import type { Metadata } from "next";
import { DashboardShell } from "./dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/auth/admin";

export async function generateMetadata(): Promise<Metadata> {
  let pwaName = process.env.NEXT_PUBLIC_PWA_NAME || "WACRM - WhatsApp CRM";
  let pwaShortName = process.env.NEXT_PUBLIC_PWA_SHORT_NAME || "WACRM";
  let pwaIcon = process.env.NEXT_PUBLIC_PWA_ICON || "/icon-192x192.png";
  let manifestUrl = "/api/manifest";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.account_id) {
        const db = supabaseAdmin();
        const { data: account } = await db
          .from("accounts")
          .select("id, pwa_name, pwa_icon_url, slug")
          .eq("id", profile.account_id)
          .maybeSingle();

        if (account) {
          if (account.pwa_name) {
            pwaName = account.pwa_name;
            pwaShortName = account.pwa_name.slice(0, 15);
          }
          if (account.pwa_icon_url) {
            pwaIcon = account.pwa_icon_url;
          }
          if (account.slug) {
            manifestUrl = `/api/manifest?slug=${encodeURIComponent(account.slug)}`;
          } else {
            manifestUrl = `/api/manifest?account_id=${encodeURIComponent(account.id)}`;
          }
        }
      }
    }
  } catch (_e) {
    // Fallback
  }

  return {
    title: {
      default: pwaName,
      template: `%s — ${pwaShortName}`,
    },
    manifest: manifestUrl,
    icons: {
      icon: [{ url: pwaIcon }, { url: "/icon.svg" }],
      apple: [{ url: pwaIcon }],
    },
    appleWebApp: {
      capable: true,
      title: pwaShortName,
      statusBarStyle: "default",
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
