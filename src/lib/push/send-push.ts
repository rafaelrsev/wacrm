import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { configureWebPush } from './vapid';
import {
  shouldDeliverPushNotification,
  defaultPushPreferences,
  type PushPreferences,
  type MessagePushEvent,
} from './rules-engine';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  sound?: boolean;
  vibrate?: boolean;
}

/**
 * Sends a Web Push notification to a single specific subscription endpoint.
 */
export async function sendPushToSubscription(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushNotificationPayload
): Promise<boolean> {
  const configured = configureWebPush();
  if (!configured) {
    console.warn('[WebPush] VAPID keys not configured; skipping push send');
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );
    return true;
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    console.error(`[WebPush] Failed sending push to ${subscription.endpoint}:`, err.message || error);

    // If subscription is 404 or 410 (Gone / Unsubscribed), delete stale subscription
    if (err.statusCode === 404 || err.statusCode === 410) {
      try {
        await supabaseAdmin()
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
      } catch (_e) {
        // Ignore deletion error
      }
    }
    return false;
  }
}

/**
 * Evaluates rules and sends Web Push notifications to qualified account users
 * upon an incoming message event.
 */
export async function sendPushForMessageEvent(
  accountId: string,
  event: MessagePushEvent
): Promise<{ sentCount: number; evaluatedCount: number }> {
  const configured = configureWebPush();
  if (!configured) {
    return { sentCount: 0, evaluatedCount: 0 };
  }

  const db = supabaseAdmin();

  // 1. Fetch all push subscriptions for this account
  const { data: subscriptions, error: subErr } = await db
    .from('push_subscriptions')
    .select('id, user_id, endpoint, keys')
    .eq('account_id', accountId);

  if (subErr || !subscriptions || subscriptions.length === 0) {
    return { sentCount: 0, evaluatedCount: 0 };
  }

  // 2. Fetch user notification preferences
  const userIds = Array.from(new Set(subscriptions.map((s) => s.user_id)));
  const { data: prefRows } = await db
    .from('push_notification_preferences')
    .select('*')
    .eq('account_id', accountId)
    .in('user_id', userIds);

  const prefMap = new Map<string, PushPreferences>();
  if (prefRows) {
    for (const row of prefRows) {
      prefMap.set(row.user_id, row as PushPreferences);
    }
  }

  // Fetch account custom icon for push notification
  const { data: accountData } = await db
    .from('accounts')
    .select('notification_icon_url, pwa_icon_url')
    .eq('id', accountId)
    .maybeSingle();

  const accountIcon = accountData?.notification_icon_url || accountData?.pwa_icon_url || '/icon-192x192.png';

  let sentCount = 0;

  for (const sub of subscriptions) {
    const pref = prefMap.get(sub.user_id) || defaultPushPreferences(accountId, sub.user_id);

    // Evaluate rules engine for recipient user
    const shouldSend = shouldDeliverPushNotification(pref, event, sub.user_id);

    if (shouldSend) {
      const title = event.contactName || 'Nova Mensagem';
      const body = event.messageText || '[Anexo / Mídia]';
      const url = `/inbox?c=${event.conversationId}`;

      const payload: PushNotificationPayload = {
        title,
        body,
        url,
        icon: event.contactAvatarUrl || accountIcon,
        badge: accountIcon,
        tag: `conv-${event.conversationId}`,
        sound: pref.sound_enabled,
        vibrate: pref.vibrate_enabled,
        data: {
          conversationId: event.conversationId,
          contactId: event.contactId,
        },
      };

      const ok = await sendPushToSubscription(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      );
      if (ok) sentCount++;
    }
  }

  return { sentCount, evaluatedCount: subscriptions.length };
}
