import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { loadAiConfig } from '@/lib/ai/config'
import { generateAndSaveConversationSummary } from '@/lib/ai/summary'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/ai/summary
 *
 * Generate or update the AI summary for a contact/conversation on demand.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await getCurrentAccount()

    const limit = checkRateLimit(`ai-summary:${userId}`, RATE_LIMITS.adminAction)
    if (!limit.success) return rateLimitResponse(limit)

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const contactId = typeof body.contactId === 'string' ? body.contactId.trim() : null
    let conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : null

    if (!contactId) {
      return NextResponse.json({ error: 'contactId is required' }, { status: 400 })
    }

    const config = await loadAiConfig(supabase, accountId, { requireActive: false })
    if (!config) {
      return NextResponse.json(
        { error: 'AI is not configured for this account' },
        { status: 400 },
      )
    }

    // If conversationId wasn't passed, find the most recent conversation for this contact
    if (!conversationId) {
      const { data: latestConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contactId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!latestConv) {
        return NextResponse.json(
          { error: 'No conversation found for this contact to summarize' },
          { status: 404 },
        )
      }
      conversationId = latestConv.id
    }

    await generateAndSaveConversationSummary(
      supabase,
      accountId,
      conversationId,
      contactId,
      config,
    )

    // Fetch the updated contact summary
    const { data: updatedContact } = await supabase
      .from('contacts')
      .select('ai_summary, ai_summary_updated_at')
      .eq('id', contactId)
      .maybeSingle()

    if (!updatedContact?.ai_summary) {
      // Check if conversation exists but had no messages
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)

      if (!count || count === 0) {
        return NextResponse.json(
          { error: 'Nenhuma mensagem encontrada nesta conversa para resumir.' },
          { status: 400 },
        )
      }

      return NextResponse.json(
        { error: 'Não foi possível gerar o resumo. Verifique se o provedor de IA está configurado corretamente.' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      ai_summary: updatedContact.ai_summary,
      ai_summary_updated_at: updatedContact.ai_summary_updated_at,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
