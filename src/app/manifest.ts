import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_PWA_NAME || 'WACRM - WhatsApp CRM';
  const shortName =
    process.env.NEXT_PUBLIC_PWA_SHORT_NAME ||
    process.env.NEXT_PUBLIC_PWA_NAME ||
    'WACRM';
  const description =
    process.env.NEXT_PUBLIC_PWA_DESCRIPTION ||
    'CRM e Inbox Compartilhado para WhatsApp';
  const icon192 =
    process.env.NEXT_PUBLIC_PWA_ICON_192 ||
    process.env.NEXT_PUBLIC_PWA_ICON ||
    '/icon-192x192.png';
  const icon512 =
    process.env.NEXT_PUBLIC_PWA_ICON_512 ||
    process.env.NEXT_PUBLIC_PWA_ICON ||
    '/icon-512x512.png';

  return {
    name,
    short_name: shortName,
    description,
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    orientation: 'any',
    icons: [
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
        purpose: 'maskable',
      },
    ],
  };
}
