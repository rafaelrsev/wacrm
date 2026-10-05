-- ============================================================
-- 043_add_openrouter_provider.sql
--
-- 1. Adds 'openrouter' to ai_configs provider check constraint
-- 2. Adds 'openrouter' to ai_usage_log provider check constraint
-- ============================================================

-- 1. Allow 'openrouter' provider in ai_configs
ALTER TABLE ai_configs DROP CONSTRAINT IF EXISTS ai_configs_provider_check;
ALTER TABLE ai_configs ADD CONSTRAINT ai_configs_provider_check CHECK (provider IN ('openai', 'anthropic', 'deepseek', 'openrouter'));

-- 2. Allow 'openrouter' provider in ai_usage_log
ALTER TABLE ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_provider_check;
ALTER TABLE ai_usage_log ADD CONSTRAINT ai_usage_log_provider_check CHECK (provider IN ('openai', 'anthropic', 'deepseek', 'openrouter'));
