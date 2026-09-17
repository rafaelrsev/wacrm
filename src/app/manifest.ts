import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = process.env.NEXT_PUBLIC_PWA_NAME || 'WACRM - WhatsApp CRM';
  let shortName =
    process.env.NEXT_PUBLIC_PWA_SHORT_NAME ||
    process.env.NEXT_PUBLIC_PWA_NAME ||
    'WACRM';
  let icon192 =
    process.env.NEXT_PUBLIC_PWA_ICON_192 ||
    process.env.NEXT_PUBLIC_PWA_ICON ||
    '/icon-192x192.png';
  let icon512 =
    process.env.NEXT_PUBLIC_PWA_ICON_512 ||
    process.env.NEXT_PUBLIC_PWA_ICON ||
    '/icon-512x512.png';
  let startUrl = '/';

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.account_id) {
        const db = supabaseAdmin();
        const { data: account } = await db
          .from('accounts')
          .select('pwa_name, pwa_icon_url, slug')
          .eq('id', profile.account_id)
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
            startUrl = '/dashboard';
          }
        }
      }
    }
  } catch (_e) {
    // Fallback to defaults
  }

  return {
    name,
    short_name: shortName,
    description: 'CRM e Inbox Compartilhado para WhatsApp',
    start_url: startUrl,
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    orientation: 'any',
    icons: [
      {
        src: icon192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icon192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: icon512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icon512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
