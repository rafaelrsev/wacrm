-- ============================================================
-- 041_add_deepseek_and_ai_enhancements.sql
--
-- 1. Adds 'deepseek' to ai_configs provider check constraint
-- 2. Adds context_message_limit and auto_reply_delay_seconds to ai_configs
-- 3. Adds ai_summary and ai_summary_updated_at to conversations and contacts
-- ============================================================

-- 1. Allow 'deepseek' provider in ai_configs
ALTER TABLE ai_configs DROP CONSTRAINT IF EXISTS ai_configs_provider_check;
ALTER TABLE ai_configs ADD CONSTRAINT ai_configs_provider_check CHECK (provider IN ('openai', 'anthropic', 'deepseek'));

-- 2. Configurable context limit and auto-reply delay
ALTER TABLE ai_configs
  ADD COLUMN IF NOT EXISTS context_message_limit integer NOT NULL DEFAULT 20
    CHECK (context_message_limit BETWEEN 1 AND 50);

ALTER TABLE ai_configs
  ADD COLUMN IF NOT EXISTS auto_reply_delay_seconds integer NOT NULL DEFAULT 5
    CHECK (auto_reply_delay_seconds BETWEEN 0 AND 600);

-- 3. AI conversation and contact summaries
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_summary_updated_at timestamptz;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_summary_updated_at timestamptz;
