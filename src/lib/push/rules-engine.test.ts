import { describe, expect, it } from 'vitest';
import {
  shouldDeliverPushNotification,
  defaultPushPreferences,
  type PushPreferences,
  type MessagePushEvent,
} from './rules-engine';

describe('Push Rules Engine', () => {
  const accountId = 'acc-123';
  const userId = 'user-123';
  const defaultPref = defaultPushPreferences(accountId, userId);

  const baseEvent: MessagePushEvent = {
    conversationId: 'conv-1',
    contactId: 'contact-1',
    senderType: 'customer',
    messageText: 'Olá, preciso de ajuda com meu pedido',
    assignedAgentId: userId,
    isUnattended: false,
  };

  it('should deliver notification when default preferences are enabled', () => {
    const result = shouldDeliverPushNotification(defaultPref, baseEvent, userId);
    expect(result).toBe(true);
  });

  it('should NOT deliver notification when master toggle is disabled', () => {
    const pref: PushPreferences = { ...defaultPref, enabled: false };
    const result = shouldDeliverPushNotification(pref, baseEvent, userId);
    expect(result).toBe(false);
  });

  it('should NOT deliver notification when notify_new_messages is false', () => {
    const pref: PushPreferences = { ...defaultPref, notify_new_messages: false };
    const result = shouldDeliverPushNotification(pref, baseEvent, userId);
    expect(result).toBe(false);
  });

  it('should NOT deliver self-sent messages when notify_self_sent is false', () => {
    const selfEvent: MessagePushEvent = {
      ...baseEvent,
      senderType: 'user',
      senderUserId: userId,
    };
    const pref: PushPreferences = { ...defaultPref, notify_self_sent: false };
    const result = shouldDeliverPushNotification(pref, selfEvent, userId);
    expect(result).toBe(false);
  });

  it('should NOT deliver group messages when notify_groups is false', () => {
    const groupEvent: MessagePushEvent = { ...baseEvent, isGroup: true };
    const pref: PushPreferences = { ...defaultPref, notify_groups: false };
    const result = shouldDeliverPushNotification(pref, groupEvent, userId);
    expect(result).toBe(false);
  });

  it('should respect unattended_only toggle', () => {
    const pref: PushPreferences = { ...defaultPref, notify_unattended_only: true };
    
    // Attended conversation
    expect(shouldDeliverPushNotification(pref, { ...baseEvent, isUnattended: false }, userId)).toBe(false);
    
    // Unattended conversation
    expect(shouldDeliverPushNotification(pref, { ...baseEvent, isUnattended: true }, userId)).toBe(true);
  });

  it('should filter by notification hours (quiet hours)', () => {
    const pref: PushPreferences = {
      ...defaultPref,
      quiet_hours_enabled: true,
      quiet_hours_start: '08:00',
      quiet_hours_end: '18:00',
    };

    // 10:00 AM (Within window)
    expect(shouldDeliverPushNotification(pref, baseEvent, userId, '10:00')).toBe(true);

    // 21:00 PM (Outside window)
    expect(shouldDeliverPushNotification(pref, baseEvent, userId, '21:00')).toBe(false);
  });

  it('should filter by specific contact IDs', () => {
    const pref: PushPreferences = {
      ...defaultPref,
      contacts_mode: 'specific',
      specific_contact_ids: ['contact-1', 'contact-2'],
    };

    // Matching contact
    expect(shouldDeliverPushNotification(pref, { ...baseEvent, contactId: 'contact-1' }, userId)).toBe(true);

    // Non-matching contact
    expect(shouldDeliverPushNotification(pref, { ...baseEvent, contactId: 'contact-999' }, userId)).toBe(false);
  });

  it('should filter by keywords', () => {
    const pref: PushPreferences = {
      ...defaultPref,
      keywords_enabled: true,
      keywords: ['urgente', 'orçamento'],
    };

    // Matching keyword
    expect(shouldDeliverPushNotification(pref, { ...baseEvent, messageText: 'Preciso de um ORÇAMENTO urgente!' }, userId)).toBe(true);

    // Non-matching text
    expect(shouldDeliverPushNotification(pref, { ...baseEvent, messageText: 'Bom dia, como vai?' }, userId)).toBe(false);
  });
});
