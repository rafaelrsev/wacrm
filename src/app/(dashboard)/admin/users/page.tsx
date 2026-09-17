"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  Plus,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  Lock,
  Upload,
  Check,
  AlertCircle,
  Globe,
  Smartphone,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface AdminAccount {
  id: string;
  name: string;
  owner_user_id: string;
  owner_email: string;
  owner_name: string;
  slug: string | null;
  pwa_name: string | null;
  pwa_icon_url: string | null;
  notification_icon_url: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const { isSuperAdmin, profileLoading } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Dialog state: Create / Edit
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formPwaName, setFormPwaName] = useState("");
  const [formPwaIconUrl, setFormPwaIconUrl] = useState("");
  const [formNotifIconUrl, setFormNotifIconUrl] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsSuperAdmin, setFormIsSuperAdmin] = useState(false);
  const [formNewPassword, setFormNewPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Uploading state
  const [uploadingPwaIcon, setUploadingPwaIcon] = useState(false);
  const [uploadingNotifIcon, setUploadingNotifIcon] = useState(false);

  const pwaFileInputRef = useRef<HTMLInputElement>(null);
  const notifFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profileLoading && !isSuperAdmin) {
      router.push("/dashboard");
    }
  }, [isSuperAdmin, profileLoading, router]);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/accounts");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao carregar contas.");
      }
      setAccounts(data.accounts || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAccounts();
    }
  }, [isSuperAdmin]);

  const handleOpenCreate = () => {
    setFormEmail("");
    setFormPassword("");
    setFormName("");
    setFormSlug("");
    setFormPwaName("");
    setFormPwaIconUrl("");
    setFormNotifIconUrl("");
    setFormIsActive(true);
    setFormIsSuperAdmin(false);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (acc: AdminAccount) => {
    setEditingAccount(acc);
    setFormName(acc.owner_name || acc.name);
    setFormEmail(acc.owner_email);
    setFormSlug(acc.slug || "");
    setFormPwaName(acc.pwa_name || acc.name);
    setFormPwaIconUrl(acc.pwa_icon_url || "");
    setFormNotifIconUrl(acc.notification_icon_url || "");
    setFormIsActive(acc.is_active);
    setFormIsSuperAdmin(acc.is_super_admin);
    setFormNewPassword("");
    setFormError(null);
  };

  const handleFileUpload = async (
    file: File,
    type: "pwa" | "notif"
  ) => {
    if (type === "pwa") setUploadingPwaIcon(true);
    else setUploadingNotifIcon(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload-icon", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao fazer upload da imagem.");
      }

      if (type === "pwa") {
        setFormPwaIconUrl(data.url);
        if (!formNotifIconUrl) setFormNotifIconUrl(data.url);
      } else {
        setFormNotifIconUrl(data.url);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      if (type === "pwa") setUploadingPwaIcon(false);
      else setUploadingNotifIcon(false);
    }
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formEmail,
          password: formPassword,
          full_name: formName,
          slug: formSlug,
          pwa_name: formPwaName,
          pwa_icon_url: formPwaIconUrl,
          notification_icon_url: formNotifIconUrl,
          is_super_admin: formIsSuperAdmin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar conta.");
      }

      setIsCreateOpen(false);
      fetchAccounts();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/admin/accounts/${editingAccount.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: formSlug,
          pwa_name: formPwaName,
          pwa_icon_url: formPwaIconUrl,
          notification_icon_url: formNotifIconUrl,
          is_active: formIsActive,
          is_super_admin: formIsSuperAdmin,
          new_password: formNewPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao atualizar conta.");
      }

      setEditingAccount(null);
      fetchAccounts();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (acc: AdminAccount) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente a conta de "${acc.owner_name || acc.name}" (${acc.owner_email})? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/accounts/${acc.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao excluir conta.");
      }

      fetchAccounts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir conta.");
    }
  };

  const filteredAccounts = accounts.filter(
    (acc) =>
      acc.name.toLowerCase().includes(search.toLowerCase()) ||
      acc.owner_email.toLowerCase().includes(search.toLowerCase()) ||
      acc.owner_name.toLowerCase().includes(search.toLowerCase()) ||
      (acc.slug && acc.slug.toLowerCase().includes(search.toLowerCase())) ||
      (acc.pwa_name && acc.pwa_name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter((a) => a.is_active).length;
  const superAdminCount = accounts.filter((a) => a.is_super_admin).length;

  if (profileLoading || !isSuperAdmin) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Shield className="h-7 w-7 text-primary" />
            Painel Admin de Usuários & Contas CRM
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os proprietários de CRM, rotas por slug, nomes de PWA e ícones de notificação mobile.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 bg-primary font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" />
          Criar Nova Conta CRM
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Contas CRM
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalAccounts}</div>
            <p className="text-xs text-muted-foreground">Instâncias cadastradas</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contas Ativas
            </CardTitle>
            <Check className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{activeAccounts}</div>
            <p className="text-xs text-muted-foreground">CRMs em operação</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Super Administradores
            </CardTitle>
            <Crown className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-300">{superAdminCount}</div>
            <p className="text-xs text-muted-foreground">Usuários com acesso master</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Lista de Usuários e Contas</CardTitle>
              <CardDescription>
                Apenas os usuários cadastrados aqui pelo Super Admin podem ser proprietários de um CRM.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-border bg-muted"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhuma conta CRM encontrada com o termo buscado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">PWA / CRM</th>
                    <th className="px-4 py-3">Proprietário</th>
                    <th className="px-4 py-3">URL Personalizada (Slug)</th>
                    <th className="px-4 py-3">Ícone PWA / Mobile</th>
                    <th className="px-4 py-3">Status / Perfil</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-muted/30">
                      {/* PWA / CRM Name */}
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          {acc.pwa_icon_url ? (
                            <img
                              src={acc.pwa_icon_url}
                              alt={acc.pwa_name || acc.name}
                              className="h-9 w-9 rounded-lg object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                              {(acc.pwa_name || acc.name).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-foreground">
                              {acc.pwa_name || acc.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Conta: {acc.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner details */}
                      <td className="px-4 py-3">
                        <div className="text-foreground font-medium">{acc.owner_name}</div>
                        <div className="text-xs text-muted-foreground">{acc.owner_email}</div>
                      </td>

                      {/* Slug URL */}
                      <td className="px-4 py-3">
                        {acc.slug ? (
                          <a
                            href={`/${acc.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                          >
                            /{acc.slug}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Sem slug (Acesso padrão)
                          </span>
                        )}
                      </td>

                      {/* Icon Thumbnails */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Ícone PWA">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            {acc.pwa_icon_url ? (
                              <span className="text-emerald-400 font-semibold">Custom</span>
                            ) : (
                              <span>Padrão</span>
                            )}
                          </div>
                          <span className="text-border">•</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Ícone Notificação Mobile">
                            <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                            {acc.notification_icon_url ? (
                              <span className="text-emerald-400 font-semibold">Custom</span>
                            ) : (
                              <span>Padrão</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status & Super Admin Badges */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {acc.is_active ? (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-400">
                              Suspenso
                            </Badge>
                          )}
                          {acc.is_super_admin && (
                            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300 gap-1">
                              <Crown className="h-3 w-3" />
                              Super Admin
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(acc)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Editar Conta"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAccount(acc)}
                            className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            title="Excluir Conta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Criar Nova Conta / Proprietário de CRM
            </DialogTitle>
            <DialogDescription>
              Configure o novo usuário que será o proprietário deste CRM e personalize a marca.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCreate} className="space-y-4 py-2">
            {formError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {formError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-name">Nome do Proprietário *</Label>
                <Input
                  id="create-name"
                  placeholder="Ex: Rafael Silva"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-email">E-mail de Login *</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="proprietario@empresa.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Senha de Acesso Inicial *</Label>
              <Input
                id="create-password"
                type="password"
                placeholder="No mínimo 6 caracteres"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                required
              />
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-semibold text-foreground text-sm mb-3">Personalização da Marca do CRM</h4>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-pwa-name">Nome do PWA / Título do CRM</Label>
                  <Input
                    id="create-pwa-name"
                    placeholder="Ex: Empresa X CRM (padrão: CRM para WhatsApp)"
                    value={formPwaName}
                    onChange={(e) => setFormPwaName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-slug">Slug Personalizado para Acesso (URL)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground shrink-0">crm.rsev.cloud/</span>
                    <Input
                      id="create-slug"
                      placeholder="empresax"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    />
                  </div>
                  {formSlug && (
                    <p className="text-xs text-primary font-mono">
                      URL Final: crm.rsev.cloud/{formSlug}
                    </p>
                  )}
                </div>

                {/* PWA Icon */}
                <div className="space-y-2">
                  <div className="space-y-0.5">
                    <Label>Ícone do PWA e Menu Lateral</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Recomendado: <strong>512x512 px</strong> ou <strong>192x192 px</strong> (Quadrado 1:1). Formatos: <strong>PNG, WebP, SVG</strong> (máx. 5MB).
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {formPwaIconUrl ? (
                      <img
                        src={formPwaIconUrl}
                        alt="PWA Icon Preview"
                        className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Globe className="h-5 w-5" />
                      </div>
                    )}
                    <Input
                      placeholder="URL do Ícone (ou faça upload)"
                      value={formPwaIconUrl}
                      onChange={(e) => setFormPwaIconUrl(e.target.value)}
                      className="text-xs"
                    />
                    <input
                      type="file"
                      ref={pwaFileInputRef}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "pwa");
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingPwaIcon}
                      onClick={() => pwaFileInputRef.current?.click()}
                      className="shrink-0 gap-1"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingPwaIcon ? "Enviando..." : "Upload"}
                    </Button>
                  </div>
                </div>

                {/* Mobile Notification Icon */}
                <div className="space-y-2">
                  <div className="space-y-0.5">
                    <Label>Ícone de Notificação Push Mobile</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Recomendado: <strong>192x192 px</strong> (Quadrado 1:1, fundo transparente para Android/iOS). Formatos: <strong>PNG, WebP, SVG</strong>.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {formNotifIconUrl ? (
                      <img
                        src={formNotifIconUrl}
                        alt="Notification Icon Preview"
                        className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Smartphone className="h-5 w-5" />
                      </div>
                    )}
                    <Input
                      placeholder="URL do Ícone de Notificação (ou faça upload)"
                      value={formNotifIconUrl}
                      onChange={(e) => setFormNotifIconUrl(e.target.value)}
                      className="text-xs"
                    />
                    <input
                      type="file"
                      ref={notifFileInputRef}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "notif");
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingNotifIcon}
                      onClick={() => notifFileInputRef.current?.click()}
                      className="shrink-0 gap-1"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingNotifIcon ? "Enviando..." : "Upload"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="create-super-admin" className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <Crown className="h-4 w-4" />
                  Super Administrador do Sistema
                </Label>
                <p className="text-xs text-muted-foreground">
                  Concede acesso total ao Painel Admin para criar e gerenciar outros CRMs.
                </p>
              </div>
              <Switch
                id="create-super-admin"
                checked={formIsSuperAdmin}
                onCheckedChange={setFormIsSuperAdmin}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary font-semibold text-primary-foreground">
                {saving ? "Criando..." : "Criar Conta CRM"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Editar Conta CRM — {editingAccount?.name}
            </DialogTitle>
            <DialogDescription>
              Altere a marca, ícones, slug, perfil de acesso ou resete a senha do proprietário.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            {formError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {formError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Proprietário</Label>
                <div className="font-medium text-foreground">{formName}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">E-mail</Label>
                <div className="font-medium text-foreground">{formEmail}</div>
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-3">
              <div className="space-y-2">
                <Label htmlFor="edit-pwa-name">Nome do PWA / Título do CRM</Label>
                <Input
                  id="edit-pwa-name"
                  value={formPwaName}
                  onChange={(e) => setFormPwaName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-slug">Slug Personalizado para Acesso (URL)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground shrink-0">crm.rsev.cloud/</span>
                  <Input
                    id="edit-slug"
                    placeholder="empresax"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  />
                </div>
              </div>

              {/* PWA Icon */}
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <Label>Ícone do PWA e Menu Lateral</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Recomendado: <strong>512x512 px</strong> ou <strong>192x192 px</strong> (Quadrado 1:1). Formatos: <strong>PNG, WebP, SVG</strong> (máx. 5MB).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {formPwaIconUrl ? (
                    <img
                      src={formPwaIconUrl}
                      alt="PWA Icon Preview"
                      className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Globe className="h-5 w-5" />
                    </div>
                  )}
                  <Input
                    placeholder="URL do Ícone PWA"
                    value={formPwaIconUrl}
                    onChange={(e) => setFormPwaIconUrl(e.target.value)}
                    className="text-xs"
                  />
                  <input
                    type="file"
                    ref={pwaFileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "pwa");
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingPwaIcon}
                    onClick={() => pwaFileInputRef.current?.click()}
                    className="shrink-0 gap-1"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </Button>
                </div>
              </div>

              {/* Mobile Notification Icon */}
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <Label>Ícone de Notificação Push Mobile</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Recomendado: <strong>192x192 px</strong> (Quadrado 1:1, fundo transparente para Android/iOS). Formatos: <strong>PNG, WebP, SVG</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {formNotifIconUrl ? (
                    <img
                      src={formNotifIconUrl}
                      alt="Notif Icon Preview"
                      className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Smartphone className="h-5 w-5" />
                    </div>
                  )}
                  <Input
                    placeholder="URL do Ícone de Notificação Mobile"
                    value={formNotifIconUrl}
                    onChange={(e) => setFormNotifIconUrl(e.target.value)}
                    className="text-xs"
                  />
                  <input
                    type="file"
                    ref={notifFileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "notif");
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingNotifIcon}
                    onClick={() => notifFileInputRef.current?.click()}
                    className="shrink-0 gap-1"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label htmlFor="edit-password" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Redefinir Senha do Proprietário (opcional)
              </Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Deixe em branco para não alterar"
                value={formNewPassword}
                onChange={(e) => setFormNewPassword(e.target.value)}
              />
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-active">Status da Conta CRM</Label>
                  <p className="text-xs text-muted-foreground">
                    Contas suspensas não conseguem acessar o sistema.
                  </p>
                </div>
                <Switch
                  id="edit-active"
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-super-admin" className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <Crown className="h-4 w-4" />
                    Super Administrador do Sistema
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Permite ao proprietário acessar o Painel Admin.
                  </p>
                </div>
                <Switch
                  id="edit-super-admin"
                  checked={formIsSuperAdmin}
                  onCheckedChange={setFormIsSuperAdmin}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingAccount(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary font-semibold text-primary-foreground">
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
