import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendPushToSubscription } from '@/lib/push/send-push';

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = supabaseAdmin();
    const { data: subscriptions, error: subErr } = await db
      .from('push_subscriptions')
      .select('endpoint, keys')
      .eq('user_id', user.id);

    if (subErr || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dispositivo cadastrado para este usuário. Ative os avisos primeiro!' },
        { status: 404 }
      );
    }

    let successCount = 0;
    for (const sub of subscriptions) {
      const ok = await sendPushToSubscription(
        { endpoint: sub.endpoint, keys: sub.keys },
        {
          title: '🔔 Teste de Notificação - WACRM',
          body: 'As notificações Push do seu PWA estão funcionando perfeitamente!',
          url: '/inbox',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          sound: true,
          vibrate: true,
        }
      );
      if (ok) successCount++;
    }

    if (successCount === 0) {
      return NextResponse.json(
        { error: 'Falha ao enviar notificação. Verifique se as chaves VAPID estão configuradas.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'sent', count: successCount }, { status: 200 });
  } catch (error: unknown) {
    console.error('[Push Test] Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
