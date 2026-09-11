import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateVapidKeys, getVapidKeys } from '@/lib/push/vapid';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentKeys = getVapidKeys();
    const generated = generateVapidKeys();

    return NextResponse.json({
      configured: !!currentKeys,
      currentPublicKey: currentKeys?.publicKey || null,
      generatedKeys: {
        publicKey: generated.publicKey,
        privateKey: generated.privateKey,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('[Push Generate Keys] Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
