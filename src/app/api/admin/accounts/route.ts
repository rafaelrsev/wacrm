import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { toErrorResponse } from "@/lib/auth/account";

export async function GET() {
  try {
    const { supabaseAdmin } = await requireSuperAdmin();

    // Fetch accounts with owner details
    const { data: accounts, error: accErr } = await supabaseAdmin
      .from("accounts")
      .select("id, name, owner_user_id, slug, pwa_name, pwa_icon_url, notification_icon_url, is_active, created_at")
      .order("created_at", { ascending: false });

    if (accErr) {
      return NextResponse.json({ error: accErr.message }, { status: 500 });
    }

    // Fetch owner profiles for these accounts
    const ownerUserIds = Array.from(
      new Set(accounts.map((a) => a.owner_user_id).filter(Boolean))
    );

    const profilesMap: Record<string, { email: string; full_name: string | null; is_super_admin: boolean }> = {};
    if (ownerUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, full_name, is_super_admin")
        .in("user_id", ownerUserIds);

      if (profiles) {
        for (const p of profiles) {
          profilesMap[p.user_id] = {
            email: p.email,
            full_name: p.full_name,
            is_super_admin: p.is_super_admin ?? false,
          };
        }
      }
    }

    const result = accounts.map((acc) => ({
      ...acc,
      owner_email: profilesMap[acc.owner_user_id]?.email || "",
      owner_name: profilesMap[acc.owner_user_id]?.full_name || acc.name,
      is_super_admin: profilesMap[acc.owner_user_id]?.is_super_admin || false,
    }));

    return NextResponse.json({ accounts: result });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabaseAdmin } = await requireSuperAdmin();
    const body = await request.json();

    const {
      email,
      password,
      full_name,
      slug,
      pwa_name,
      pwa_icon_url,
      notification_icon_url,
      is_super_admin,
    } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    // Check slug uniqueness if provided
    const cleanSlug = slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") : null;
    if (cleanSlug) {
      const { data: existingSlug } = await supabaseAdmin
        .from("accounts")
        .select("id")
        .eq("slug", cleanSlug)
        .maybeSingle();

      if (existingSlug) {
        return NextResponse.json(
          { error: `O slug "${cleanSlug}" já está em uso por outro CRM.` },
          { status: 400 }
        );
      }
    }

    // 1. Create Auth user via Supabase Admin API
    const { data: authData, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || email.split("@")[0],
        },
      });

    if (createErr || !authData.user) {
      return NextResponse.json(
        { error: createErr?.message || "Falha ao criar o usuário." },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;

    // 2. Create personal Account for the new owner
    const accountName = pwa_name || full_name || `${email.split("@")[0]}'s CRM`;
    const { data: newAccount, error: accErr } = await supabaseAdmin
      .from("accounts")
      .insert({
        name: accountName,
        owner_user_id: newUserId,
        slug: cleanSlug || null,
        pwa_name: pwa_name || accountName,
        pwa_icon_url: pwa_icon_url || null,
        notification_icon_url: notification_icon_url || pwa_icon_url || null,
        is_active: true,
      })
      .select()
      .single();

    if (accErr || !newAccount) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: `Erro ao criar conta CRM: ${accErr?.message}` },
        { status: 500 }
      );
    }

    // 3. Upsert Profile row linked to the new account as owner
    const { error: profErr } = await supabaseAdmin.from("profiles").upsert(
      {
        user_id: newUserId,
        email,
        full_name: full_name || email.split("@")[0],
        account_id: newAccount.id,
        account_role: "owner",
        is_super_admin: Boolean(is_super_admin),
      },
      { onConflict: "user_id" }
    );

    if (profErr) {
      console.error("[POST /api/admin/accounts] Profile upsert error:", profErr);
    }

    return NextResponse.json({
      success: true,
      account: {
        ...newAccount,
        owner_email: email,
        owner_name: full_name || email.split("@")[0],
        is_super_admin: Boolean(is_super_admin),
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
