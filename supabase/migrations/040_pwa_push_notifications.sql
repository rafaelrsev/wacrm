-- ============================================================
-- PWA PUSH NOTIFICATIONS & USER PREFERENCES
-- ============================================================

-- Table for storing Web Push subscriptions per user device
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL, -- { p256dh: "...", auth: "..." }
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE(endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_account_user
  ON push_subscriptions(account_id, user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select ON push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_insert ON push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_delete ON push_subscriptions;

CREATE POLICY push_subscriptions_select ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY push_subscriptions_insert ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_subscriptions_delete ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);


-- Table for storing granular notification preferences and rules per user
CREATE TABLE IF NOT EXISTS push_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Master Push toggle
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Rule toggles
  notify_new_messages BOOLEAN NOT NULL DEFAULT TRUE,
  notify_groups BOOLEAN NOT NULL DEFAULT FALSE,
  notify_unattended_only BOOLEAN NOT NULL DEFAULT FALSE,
  notify_self_sent BOOLEAN NOT NULL DEFAULT FALSE, -- False = 🔕 Não notificar mensagens enviadas por você
  
  -- Quiet Hours (Horário de notificação / silêncio)
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start TIME NOT NULL DEFAULT '08:00',
  quiet_hours_end TIME NOT NULL DEFAULT '18:00',
  
  -- Contact filtering
  contacts_mode TEXT NOT NULL DEFAULT 'all' CHECK (contacts_mode IN ('all', 'specific')),
  specific_contact_ids JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of contact UUID strings
  
  -- Keyword filtering
  keywords_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of lowercased strings
  
  -- Device behavior
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vibrate_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- User targeting mode within CRM
  -- 'assigned_or_all': Notifies assigned agent, or all members if conversation is unassigned
  -- 'assigned_only': Notifies only the assigned agent
  -- 'all_members': Notifies all team members in the account
  target_user_mode TEXT NOT NULL DEFAULT 'assigned_or_all'
    CHECK (target_user_mode IN ('assigned_or_all', 'assigned_only', 'all_members')),
    
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT push_notification_preferences_user_unique UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_push_notification_preferences_account_user
  ON push_notification_preferences(account_id, user_id);

ALTER TABLE push_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_pref_select ON push_notification_preferences;
DROP POLICY IF EXISTS push_pref_insert ON push_notification_preferences;
DROP POLICY IF EXISTS push_pref_update ON push_notification_preferences;

CREATE POLICY push_pref_select ON push_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY push_pref_insert ON push_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_pref_update ON push_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);
