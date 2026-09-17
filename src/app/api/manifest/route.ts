import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugParam = searchParams.get("slug");
  const accountIdParam = searchParams.get("account_id");

  let name = process.env.NEXT_PUBLIC_PWA_NAME || "WACRM - WhatsApp CRM";
  let shortName =
    process.env.NEXT_PUBLIC_PWA_SHORT_NAME ||
    process.env.NEXT_PUBLIC_PWA_NAME ||
    "WACRM";
  let icon192 =
    process.env.NEXT_PUBLIC_PWA_ICON_192 ||
    process.env.NEXT_PUBLIC_PWA_ICON ||
    "/icon-192x192.png";
  let icon512 =
    process.env.NEXT_PUBLIC_PWA_ICON_512 ||
    process.env.NEXT_PUBLIC_PWA_ICON ||
    "/icon-512x512.png";
  let startUrl = "/";

  const db = supabaseAdmin();

  // 1. If slug is explicitly passed in query (e.g. /api/manifest?slug=rsev)
  if (slugParam) {
    const cleanSlug = slugParam.trim().toLowerCase();
    const { data: account } = await db
      .from("accounts")
      .select("pwa_name, pwa_icon_url, slug, is_active")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (account && account.is_active !== false) {
      if (account.pwa_name) {
        name = account.pwa_name;
        shortName = account.pwa_name.slice(0, 15);
      }
      if (account.pwa_icon_url) {
        icon192 = account.pwa_icon_url;
        icon512 = account.pwa_icon_url;
      }
      startUrl = `/${cleanSlug}`;
    }
  } else if (accountIdParam) {
    // 2. If account_id is passed in query
    const { data: account } = await db
      .from("accounts")
      .select("pwa_name, pwa_icon_url, slug, is_active")
      .eq("id", accountIdParam)
      .maybeSingle();

    if (account && account.is_active !== false) {
      if (account.pwa_name) {
        name = account.pwa_name;
        shortName = account.pwa_name.slice(0, 15);
      }
      if (account.pwa_icon_url) {
        icon192 = account.pwa_icon_url;
        icon512 = account.pwa_icon_url;
      }
      if (account.slug) {
        startUrl = `/${account.slug}`;
      } else {
        startUrl = "/dashboard";
      }
    }
  } else {
    // 3. Otherwise check if user is logged in via cookies
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
          const { data: account } = await db
            .from("accounts")
            .select("pwa_name, pwa_icon_url, slug")
            .eq("id", profile.account_id)
            .maybeSingle();

          if (account) {
            if (account.pwa_name) {
              name = account.pwa_name;
              shortName = account.pwa_name.slice(0, 15);
            }
            if (account.pwa_icon_url) {
              icon192 = account.pwa_icon_url;
              icon512 = account.pwa_icon_url;
            }
            if (account.slug) {
              startUrl = `/${account.slug}`;
            } else {
              startUrl = "/dashboard";
            }
          }
        }
      }
    } catch (_e) {
      // Fallback to default env vars
    }
  }

  const manifestPayload = {
    name,
    short_name: shortName,
    description: "CRM e Inbox Compartilhado para WhatsApp",
    lang: "pt-BR",
    dir: "ltr",
    start_url: startUrl,
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    orientation: "any",
    icons: [
      {
        src: icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return new NextResponse(JSON.stringify(manifestPayload), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
