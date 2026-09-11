import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { defaultPushPreferences } from '@/lib/push/rules-engine';

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.account_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: prefRow, error: prefError } = await db
      .from('push_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (prefError) {
      console.error('[Push Preferences GET] Error:', prefError);
      return NextResponse.json({ error: prefError.message }, { status: 500 });
    }

    const preferences = prefRow || defaultPushPreferences(profile.account_id, user.id);

    return NextResponse.json({ preferences }, { status: 200 });
  } catch (error: unknown) {
    console.error('[Push Preferences GET] Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.account_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 400 });
    }

    const body = await request.json();
    const prefs = body.preferences || body;

    const db = supabaseAdmin();
    const payload = {
      account_id: profile.account_id,
      user_id: user.id,
      enabled: typeof prefs.enabled === 'boolean' ? prefs.enabled : true,
      notify_new_messages: typeof prefs.notify_new_messages === 'boolean' ? prefs.notify_new_messages : true,
      notify_groups: typeof prefs.notify_groups === 'boolean' ? prefs.notify_groups : false,
      notify_unattended_only: typeof prefs.notify_unattended_only === 'boolean' ? prefs.notify_unattended_only : false,
      notify_self_sent: typeof prefs.notify_self_sent === 'boolean' ? prefs.notify_self_sent : false,
      quiet_hours_enabled: typeof prefs.quiet_hours_enabled === 'boolean' ? prefs.quiet_hours_enabled : false,
      quiet_hours_start: prefs.quiet_hours_start || '08:00',
      quiet_hours_end: prefs.quiet_hours_end || '18:00',
      contacts_mode: prefs.contacts_mode === 'specific' ? 'specific' : 'all',
      specific_contact_ids: Array.isArray(prefs.specific_contact_ids) ? prefs.specific_contact_ids : [],
      keywords_enabled: typeof prefs.keywords_enabled === 'boolean' ? prefs.keywords_enabled : false,
      keywords: Array.isArray(prefs.keywords) ? prefs.keywords : [],
      sound_enabled: typeof prefs.sound_enabled === 'boolean' ? prefs.sound_enabled : true,
      vibrate_enabled: typeof prefs.vibrate_enabled === 'boolean' ? prefs.vibrate_enabled : true,
      target_user_mode: ['assigned_or_all', 'assigned_only', 'all_members'].includes(prefs.target_user_mode)
        ? prefs.target_user_mode
        : 'assigned_or_all',
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: upsertError } = await db
      .from('push_notification_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('[Push Preferences POST] Error saving:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ preferences: updated }, { status: 200 });
  } catch (error: unknown) {
    console.error('[Push Preferences POST] Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
