import type { SupabaseClient } from '@supabase/supabase-js'
import type { AiConfig } from './types'
import { buildConversationContext } from './context'
import { generateReply } from './generate'

/**
 * Generate a concise 2-3 sentence summary of the conversation state and update
 * both the conversation and contact records. Runs asynchronously in the background.
 */
export async function generateAndSaveConversationSummary(
  db: SupabaseClient,
  accountId: string,
  conversationId: string,
  contactId: string,
  config: AiConfig,
): Promise<void> {
  try {
    const messages = await buildConversationContext(db, conversationId, 15)
    if (messages.length === 0) return

    const systemPrompt =
      'You are a CRM conversation summarizer. ' +
      'Given a WhatsApp transcript between a business and a customer, summarize the customer\'s key request/intent, ' +
      'important details (products, dates, preferences), and current status in 2-3 short, clear bullet points. ' +
      'Language: same language as the conversation. Format: concise bullet points only.'

    const { text } = await generateReply({
      config,
      systemPrompt,
      messages,
    })

    if (!text || !text.trim()) return

    const summary = text.trim()
    const now = new Date().toISOString()

    // Update conversation summary
    await db
      .from('conversations')
      .update({
        ai_summary: summary,
        ai_summary_updated_at: now,
      })
      .eq('id', conversationId)

    // Update contact summary
    await db
      .from('contacts')
      .update({
        ai_summary: summary,
        ai_summary_updated_at: now,
      })
      .eq('id', contactId)
  } catch (err) {
    console.error('[ai summary] failed to update conversation summary:', err)
  }
}
