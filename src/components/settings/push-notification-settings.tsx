'use client';

import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { type PushPreferences, defaultPushPreferences } from '@/lib/push/rules-engine';
import {
  Bell,
  BellOff,
  Check,
  Clock,
  Copy,
  Filter,
  Info,
  Key,
  Loader2,
  Lock,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  Smartphone,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function PushNotificationSettings() {
  const {
    isSupported,
    isStandalone,
    isIos,
    permission,
    isSubscribed,
    loading: hookLoading,
    subscribe,
    unsubscribe,
    sendTestPush,
    playTestSound,
  } = usePushNotifications();

  const [preferences, setPreferences] = useState<PushPreferences | null>(null);
  const [loadingPref, setLoadingPref] = useState<boolean>(true);
  const [savingPref, setSavingPref] = useState<boolean>(false);
  const [keywordInput, setKeywordInput] = useState<string>('');

  // VAPID generation state
  const [vapidInfo, setVapidInfo] = useState<{
    configured: boolean;
    currentPublicKey: string | null;
  } | null>(null);
  const [loadingVapid, setLoadingVapid] = useState<boolean>(false);

  // Load user preferences
  useEffect(() => {
    async function loadPreferences() {
      try {
        setLoadingPref(true);
        const res = await fetch('/api/push/preferences');
        if (res.ok) {
          const data = await res.json();
          setPreferences(data.preferences);
          if (data.preferences?.keywords) {
            setKeywordInput(data.preferences.keywords.join(', '));
          }
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
      } finally {
        setLoadingPref(false);
      }
    }
    loadPreferences();
  }, []);

  // Fetch VAPID key info
  useEffect(() => {
    async function loadVapidInfo() {
      try {
        setLoadingVapid(true);
        const res = await fetch('/api/push/generate-keys');
        if (res.ok) {
          const data = await res.json();
          setVapidInfo(data);
        }
      } catch (err) {
        console.error('Error loading VAPID keys:', err);
      } finally {
        setLoadingVapid(false);
      }
    }
    loadVapidInfo();
  }, []);

  const savePreferences = async (newPrefs: Partial<PushPreferences>) => {
    if (!preferences) return;
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    setSavingPref(true);

    try {
      const res = await fetch('/api/push/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: updated }),
      });

      if (!res.ok) {
        toast.error('Erro ao salvar preferências de notificação.');
      } else {
        toast.success('Regras de notificação atualizadas!');
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
      toast.error('Erro de conexão ao salvar.');
    } finally {
      setSavingPref(false);
    }
  };

  const handleKeywordsBlur = () => {
    if (!preferences) return;
    const kwArray = keywordInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    savePreferences({ keywords: kwArray });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiada para a área de transferência!`);
  };

  if (loadingPref) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const prefs = preferences || defaultPushPreferences('', '');

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          Notificações Push PWA & Celular
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Receba alertas em tempo real no seu celular (iPhone ou Android) ou computador quando chegarem novas mensagens no CRM.
        </p>
      </div>

      {/* iOS & PWA Setup Card */}
      {isIos && !isStandalone && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-500">
                Instruções para Notificações no iPhone (iOS)
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                A Apple exige 3 passos simples para o Push funcionar no seu iPhone/iPad (iOS 16.4+):
              </p>
              <ol className="mt-2 text-xs space-y-1.5 text-foreground list-decimal list-inside">
                <li>Abra este site no Safari do iPhone.</li>
                <li>
                  Toque no botão <strong>Compartilhar</strong> (ícone do quadrado com seta no rodapé do Safari).
                </li>
                <li>
                  Selecione <strong>Adicionar à Tela de Início</strong> (Add to Home Screen).
                </li>
                <li>Abra o aplicativo através do ícone criado na tela inicial do seu celular e clique no botão abaixo.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Device Activation Box */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-foreground">Status do Dispositivo</span>
              {isSubscribed ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <Check className="h-3.5 w-3.5" /> Ativado neste dispositivo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <BellOff className="h-3.5 w-3.5" /> Não ativado
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {permission === 'denied'
                ? 'As permissões de notificação foram bloqueadas no seu navegador. Habilite-as nas configurações do site.'
                : 'Clique no botão para autorizar o recebimento de avisos sonoros e pop-ups neste navegador.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={playTestSound}
              className="gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
            >
              <Volume2 className="h-4 w-4" /> Testar Som
            </Button>

            {isSubscribed ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendTestPush}
                  className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Send className="h-4 w-4" /> Notificação de Teste
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={unsubscribe}
                  disabled={hookLoading}
                  className="text-destructive hover:bg-destructive/10"
                >
                  Desativar neste aparelho
                </Button>
              </>
            ) : (
              <Button
                onClick={subscribe}
                disabled={hookLoading || permission === 'denied'}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
              >
                {hookLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                Ativar Aviso / Notificações Push
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Rules Configuration Panel */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="border-b border-border pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" /> Regras de Notificação Personalizadas
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure quando e como você quer ser avisado sobre novas interações no CRM.
            </p>
          </div>
          {savingPref && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Master & Message Toggles */}
          <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Tipos de Mensagem
            </h4>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-foreground">🔔 Ativar Notificações Push</span>
              <input
                type="checkbox"
                checked={prefs.enabled}
                onChange={(e) => savePreferences({ enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-foreground">💬 Novas Mensagens</span>
              <input
                type="checkbox"
                checked={prefs.notify_new_messages}
                onChange={(e) => savePreferences({ notify_new_messages: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-foreground">🔕 Não notificar mensagens enviadas por você</span>
              <input
                type="checkbox"
                checked={!prefs.notify_self_sent}
                onChange={(e) => savePreferences({ notify_self_sent: !e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-foreground">🔕 Não notificar grupos</span>
              <input
                type="checkbox"
                checked={!prefs.notify_groups}
                onChange={(e) => savePreferences({ notify_groups: !e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-foreground">⏳ Notificar somente conversas sem atendimento</span>
              <input
                type="checkbox"
                checked={prefs.notify_unattended_only}
                onChange={(e) => savePreferences({ notify_unattended_only: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>
          </div>

          {/* Device Behavior (Sound & Vibrate) */}
          <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5" /> Som e Vibração do Celular
            </h4>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                {prefs.sound_enabled ? <Volume2 className="h-4 w-4 text-emerald-500" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-medium text-foreground">Tocar som ao notificar</span>
              </label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={playTestSound}
                  className="h-7 text-xs gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 px-2.5"
                >
                  <Volume2 className="h-3.5 w-3.5" /> Ouvir Som
                </Button>
                <input
                  type="checkbox"
                  checked={prefs.sound_enabled}
                  onChange={(e) => savePreferences({ sound_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Vibrar dispositivo
              </span>
              <input
                type="checkbox"
                checked={prefs.vibrate_enabled}
                onChange={(e) => savePreferences({ vibrate_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            {/* Target user selector */}
            <div className="pt-2 border-t border-border/60 space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Quem notificar neste CRM?
              </label>
              <select
                value={prefs.target_user_mode}
                onChange={(e) =>
                  savePreferences({
                    target_user_mode: e.target.value as PushPreferences['target_user_mode'],
                  })
                }
                className="w-full text-xs rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="assigned_or_all">
                  🎯 Responsável da conversa (ou Todos se a conversa for sem atendente)
                </option>
                <option value="assigned_only">👤 Apenas o Responsável atribuído à conversa</option>
                <option value="all_members">📢 Todos os membros da equipe (Inbox Compartilhado)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quiet Hours / Schedule Section */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Horário de Notificação (Silenciar Fora do Horário)</span>
            </label>
            <input
              type="checkbox"
              checked={prefs.quiet_hours_enabled}
              onChange={(e) => savePreferences({ quiet_hours_enabled: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </div>

          {prefs.quiet_hours_enabled && (
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>Notificar somente no horário entre:</span>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={prefs.quiet_hours_start}
                  onChange={(e) => savePreferences({ quiet_hours_start: e.target.value })}
                  className="rounded border border-border bg-background px-2 py-1 text-foreground focus:ring-1 focus:ring-primary"
                />
                <span>até</span>
                <input
                  type="time"
                  value={prefs.quiet_hours_end}
                  onChange={(e) => savePreferences({ quiet_hours_end: e.target.value })}
                  className="rounded border border-border bg-background px-2 py-1 text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Keywords filter section */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <Key className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">🔔 Notificar apenas determinadas palavras-chave</span>
            </label>
            <input
              type="checkbox"
              checked={prefs.keywords_enabled}
              onChange={(e) => savePreferences({ keywords_enabled: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </div>

          {prefs.keywords_enabled && (
            <div className="space-y-2 pt-1">
              <input
                type="text"
                placeholder="Ex: urgente, suporte, orcamento, comprar (separadas por vírgula)"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onBlur={handleKeywordsBlur}
                className="w-full text-xs rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-[11px] text-muted-foreground">
                Insira as palavras separadas por vírgula. O CRM só enviará push para mensagens que contenham pelo menos um desses termos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* VAPID & Hostinger Credentials Card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Status do Servidor VAPID
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Status da configuração do protocolo de autenticação Web Push.
            </p>
          </div>
          {vapidInfo?.configured ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" /> VAPID Configurado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-3 w-3" /> Chaves Pendentes
            </span>
          )}
        </div>

        {/* SSL vs VAPID Explanation */}
        <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground">💡 Esclarecimento sobre SSL & VAPID:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Chave SSL (Let&apos;s Encrypt da Hostinger)</strong>: Criptografa o seu site HTTPS. O SSL é obrigatório para qualquer navegador permitir PWA e Service Worker.
            </li>
            <li>
              <strong>Chaves VAPID</strong>: São as chaves configuradas via variáveis de ambiente no arquivo <code>.env</code> do servidor para autenticação com os serviços de push da Apple (APNs) e Google (FCM).
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
