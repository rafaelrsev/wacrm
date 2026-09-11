'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function playChimeSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const now = ctx.currentTime;
    // Tone 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Tone 2: G5 (783.99 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.12);
    gain2.gain.setValueAtTime(0.4, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn('Could not play web audio chime:', e);
  }
}

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  isStandalone: boolean;
  isIos: boolean;
  permission: NotificationPermission | 'default';
  isSubscribed: boolean;
  loading: boolean;
  vapidPublicKey: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestPush: () => Promise<boolean>;
  playTestSound: () => void;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission | 'default'>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  useEffect(() => {
    // Listen for Service Worker sound playback requests
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
          playChimeSound();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  useEffect(() => {
    // Check iOS and Standalone status
    const ua = window.navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIos(iosDevice);

    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check Push & Service Worker support
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Fetch public VAPID key and check active subscription
  const init = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Register Service Worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Check existing subscription
      const existingSub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!existingSub);

      // Fetch VAPID key
      const res = await fetch('/api/push/generate-keys');
      if (res.ok) {
        const data = await res.json();
        if (data.currentPublicKey) {
          setVapidPublicKey(data.currentPublicKey);
        }
      }
    } catch (err) {
      console.error('[usePushNotifications] Init error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Notificações Push não são suportadas neste navegador.');
      return false;
    }

    try {
      setLoading(true);

      // 1. Request Notification permission
      const permResult = await Notification.requestPermission();
      setPermission(permResult);

      if (permResult !== 'granted') {
        toast.error('Permissão de notificação negada no seu dispositivo.');
        setLoading(false);
        return false;
      }

      // 2. Fetch VAPID key if not loaded yet
      let pubKey = vapidPublicKey;
      if (!pubKey) {
        const res = await fetch('/api/push/generate-keys');
        if (res.ok) {
          const data = await res.json();
          pubKey = data.currentPublicKey;
          if (pubKey) setVapidPublicKey(pubKey);
        }
      }

      if (!pubKey) {
        toast.error('Chave pública VAPID não configurada nas variáveis de ambiente do servidor.');
        setLoading(false);
        return false;
      }

      // 3. Register push subscription
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const applicationServerKey = urlBase64ToUint8Array(pubKey) as unknown as BufferSource;
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // 4. Save subscription to backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao registrar assinatura no servidor');
      }

      setIsSubscribed(true);
      toast.success('Notificações Push ativadas com sucesso neste dispositivo!');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao ativar notificações push';
      console.error('[usePushNotifications] Subscribe error:', err);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    try {
      setLoading(true);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
      toast.success('Notificações desativadas para este dispositivo.');
      return true;
    } catch (err) {
      console.error('[usePushNotifications] Unsubscribe error:', err);
      toast.error('Erro ao desativar notificações.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendTestPush = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Falha ao enviar notificação de teste.');
        return false;
      }
      playChimeSound();
      toast.success('Notificação de teste enviada!');
      return true;
    } catch (err) {
      console.error('[usePushNotifications] Test error:', err);
      toast.error('Erro de conexão ao enviar notificação de teste.');
      return false;
    }
  };

  return {
    isSupported,
    isStandalone,
    isIos,
    permission,
    isSubscribed,
    loading,
    vapidPublicKey,
    subscribe,
    unsubscribe,
    sendTestPush,
    playTestSound: playChimeSound,
  };
}
