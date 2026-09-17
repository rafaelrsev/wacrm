import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { toErrorResponse } from "@/lib/auth/account";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: currentUser, supabaseAdmin } = await requireSuperAdmin();
    const { id: accountId } = await params;
    const body = await request.json();

    const {
      pwa_name,
      slug,
      pwa_icon_url,
      notification_icon_url,
      is_active,
      is_super_admin,
      new_password,
    } = body;

    // Fetch existing account
    const { data: account, error: fetchErr } = await supabaseAdmin
      .from("accounts")
      .select("id, owner_user_id, slug")
      .eq("id", accountId)
      .single();

    if (fetchErr || !account) {
      return NextResponse.json(
        { error: "Conta CRM não encontrada." },
        { status: 404 }
      );
    }

    // Slug check if changing
    const cleanSlug = slug !== undefined ? (slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") : null) : undefined;
    if (cleanSlug !== undefined && cleanSlug !== account.slug && cleanSlug !== null) {
      const { data: existingSlug } = await supabaseAdmin
        .from("accounts")
        .select("id")
        .eq("slug", cleanSlug)
        .neq("id", accountId)
        .maybeSingle();

      if (existingSlug) {
        return NextResponse.json(
          { error: `O slug "${cleanSlug}" já está em uso por outro CRM.` },
          { status: 400 }
        );
      }
    }

    // Build update payload for accounts table
    const updatePayload: Record<string, unknown> = {};
    if (pwa_name !== undefined) {
      updatePayload.pwa_name = pwa_name || null;
      updatePayload.name = pwa_name || "CRM";
    }
    if (cleanSlug !== undefined) {
      updatePayload.slug = cleanSlug;
    }
    if (pwa_icon_url !== undefined) {
      updatePayload.pwa_icon_url = pwa_icon_url || null;
    }
    if (notification_icon_url !== undefined) {
      updatePayload.notification_icon_url = notification_icon_url || null;
    }
    if (is_active !== undefined) {
      updatePayload.is_active = Boolean(is_active);
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateErr } = await supabaseAdmin
        .from("accounts")
        .update(updatePayload)
        .eq("id", accountId);

      if (updateErr) {
        return NextResponse.json(
          { error: `Erro ao atualizar conta: ${updateErr.message}` },
          { status: 500 }
        );
      }
    }

    // Update Super Admin status on owner profile if provided
    if (is_super_admin !== undefined && account.owner_user_id) {
      // Prevent self-demotion if caller is demoting themselves
      if (account.owner_user_id === currentUser.id && is_super_admin === false) {
        return NextResponse.json(
          { error: "Você não pode revogar seus próprios privilégios de Super Admin." },
          { status: 400 }
        );
      }

      await supabaseAdmin
        .from("profiles")
        .update({ is_super_admin: Boolean(is_super_admin) })
        .eq("user_id", account.owner_user_id);
    }

    // Password reset if requested
    if (new_password && account.owner_user_id) {
      if (new_password.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve possuir no mínimo 6 caracteres." },
          { status: 400 }
        );
      }
      const { error: pwdErr } = await supabaseAdmin.auth.admin.updateUserById(
        account.owner_user_id,
        { password: new_password }
      );
      if (pwdErr) {
        return NextResponse.json(
          { error: `Erro ao atualizar senha: ${pwdErr.message}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: currentUser, supabaseAdmin } = await requireSuperAdmin();
    const { id: accountId } = await params;

    const { data: account } = await supabaseAdmin
      .from("accounts")
      .select("id, owner_user_id")
      .eq("id", accountId)
      .single();

    if (!account) {
      return NextResponse.json(
        { error: "Conta não encontrada." },
        { status: 404 }
      );
    }

    if (account.owner_user_id === currentUser.id) {
      return NextResponse.json(
        { error: "Você não pode excluir sua própria conta enquanto estiver logado nela." },
        { status: 400 }
      );
    }

    // Delete account (cascade deletes domain data)
    const { error: delAccErr } = await supabaseAdmin
      .from("accounts")
      .delete()
      .eq("id", accountId);

    if (delAccErr) {
      return NextResponse.json(
        { error: `Erro ao excluir conta: ${delAccErr.message}` },
        { status: 500 }
      );
    }

    // Delete owner auth user
    if (account.owner_user_id) {
      await supabaseAdmin.auth.admin.deleteUser(account.owner_user_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
