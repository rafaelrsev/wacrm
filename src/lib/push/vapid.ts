import webpush from 'web-push';

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/**
 * Returns configured VAPID keys from environment variables.
 * Fallbacks to generate keys dynamically if env variables are not present.
 */
export function getVapidKeys(): VapidKeys | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:suporte@rsev.cloud';

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

/**
 * Ensures web-push is configured with VAPID details.
 */
export function configureWebPush(): boolean {
  const keys = getVapidKeys();
  if (!keys) {
    return false;
  }

  try {
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
    return true;
  } catch (error) {
    console.error('[WebPush] Error setting VAPID details:', error);
    return false;
  }
}

/**
 * Helper to generate a fresh pair of VAPID keys for setup.
 */
export function generateVapidKeys(): webpush.VapidKeys {
  return webpush.generateVAPIDKeys();
}
