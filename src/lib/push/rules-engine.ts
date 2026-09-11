export interface PushPreferences {
  id?: string;
  account_id: string;
  user_id: string;
  enabled: boolean;
  notify_new_messages: boolean;
  notify_groups: boolean;
  notify_unattended_only: boolean;
  notify_self_sent: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // e.g. "08:00"
  quiet_hours_end: string;   // e.g. "18:00"
  contacts_mode: 'all' | 'specific';
  specific_contact_ids: string[];
  keywords_enabled: boolean;
  keywords: string[];
  sound_enabled: boolean;
  vibrate_enabled: boolean;
  target_user_mode: 'assigned_or_all' | 'assigned_only' | 'all_members';
}

export interface MessagePushEvent {
  conversationId: string;
  contactId: string;
  contactName?: string;
  contactAvatarUrl?: string | null;
  senderType: 'customer' | 'user' | 'system';
  senderUserId?: string | null;
  assignedAgentId?: string | null;
  messageText: string;
  isGroup?: boolean;
  isUnattended?: boolean;
}

export function defaultPushPreferences(accountId: string, userId: string): PushPreferences {
  return {
    account_id: accountId,
    user_id: userId,
    enabled: true,
    notify_new_messages: true,
    notify_groups: false,
    notify_unattended_only: false,
    notify_self_sent: false,
    quiet_hours_enabled: false,
    quiet_hours_start: '08:00',
    quiet_hours_end: '18:00',
    contacts_mode: 'all',
    specific_contact_ids: [],
    keywords_enabled: false,
    keywords: [],
    sound_enabled: true,
    vibrate_enabled: true,
    target_user_mode: 'assigned_or_all',
  };
}

/**
 * Checks if current local time (HH:MM) falls within allowed notification hours.
 */
function isWithinNotificationHours(start: string, end: string, currentTimeStr?: string): boolean {
  let currentMinutes: number;
  if (currentTimeStr) {
    const [h, m] = currentTimeStr.split(':').map(Number);
    currentMinutes = h * 60 + m;
  } else {
    const now = new Date();
    currentMinutes = now.getHours() * 60 + now.getMinutes();
  }

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Standard daytime interval, e.g. 08:00 to 18:00
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight interval, e.g. 22:00 to 06:00
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

/**
 * Evaluates whether a push notification should be delivered to a specific user.
 */
export function shouldDeliverPushNotification(
  pref: PushPreferences,
  event: MessagePushEvent,
  recipientUserId: string,
  currentTimeStr?: string
): boolean {
  // 1. Master toggle
  if (!pref.enabled) {
    return false;
  }

  // 2. New message toggle
  if (!pref.notify_new_messages) {
    return false;
  }

  // 3. Target user matching mode
  if (pref.target_user_mode === 'assigned_only') {
    if (event.assignedAgentId && event.assignedAgentId !== recipientUserId) {
      return false;
    }
  } else if (pref.target_user_mode === 'assigned_or_all') {
    if (event.assignedAgentId && event.assignedAgentId !== recipientUserId) {
      return false;
    }
  }

  // 4. Self-sent message exclusion
  if (event.senderType === 'user' && event.senderUserId === recipientUserId) {
    if (!pref.notify_self_sent) {
      return false;
    }
  }

  // 5. Group message exclusion
  if (event.isGroup && !pref.notify_groups) {
    return false;
  }

  // 6. Unattended only requirement
  if (pref.notify_unattended_only) {
    const isUnattended = event.isUnattended ?? (!event.assignedAgentId);
    if (!isUnattended) {
      return false;
    }
  }

  // 7. Notification Hours filter (Quiet Hours)
  if (pref.quiet_hours_enabled && pref.quiet_hours_start && pref.quiet_hours_end) {
    if (!isWithinNotificationHours(pref.quiet_hours_start, pref.quiet_hours_end, currentTimeStr)) {
      return false;
    }
  }

  // 8. Contact filter (All vs Specific)
  if (pref.contacts_mode === 'specific' && Array.isArray(pref.specific_contact_ids)) {
    if (pref.specific_contact_ids.length > 0 && !pref.specific_contact_ids.includes(event.contactId)) {
      return false;
    }
  }

  // 9. Keyword filter
  if (pref.keywords_enabled && Array.isArray(pref.keywords) && pref.keywords.length > 0) {
    const textLower = (event.messageText || '').toLowerCase();
    const matchesKeyword = pref.keywords.some((kw) => textLower.includes(kw.trim().toLowerCase()));
    if (!matchesKeyword) {
      return false;
    }
  }

  return true;
}
