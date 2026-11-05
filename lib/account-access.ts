import { redirect } from "next/navigation";
import { cache } from "react";
import { demoMode } from "./supabase-settings";
import { supabaseServer } from "./supabase-server";

export type AccountRole = "superadmin" | "admin" | "staff";
type Client = NonNullable<Awaited<ReturnType<typeof supabaseServer>>>;

type SignedIn = {
  kind: "signed-in";
  id: string;
  username: string;
  role: AccountRole;
  needsPassword: boolean;
  version: string | null;
  client: Client;
};

export const accountAccess = cache(async (): Promise<
  SignedIn | { kind: "demo" | "anonymous" | "denied" | "unavailable" }
> => {
  if (demoMode()) return { kind: "demo" };
  const client = await supabaseServer();
  if (!client) return { kind: "unavailable" };
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims.sub) return { kind: "anonymous" };
  const { data: account, error: accessError } = await client.rpc("assets_account_state").maybeSingle<{
    role: AccountRole; needs_password: boolean; username: string; session_version: string | null;
  }>();
  if (accessError) return { kind: "unavailable" };
  if (!account) return { kind: "denied" };
  return {
    kind: "signed-in", id: data.claims.sub, client, role: account.role, username: account.username,
    needsPassword: account.needs_password, version: account.session_version,
  };
});

export function accountDestination(account: SignedIn): string {
  if (account.needsPassword) return "/ganti-password";
  if (account.role === "superadmin") return "/pengaturan";
  if (account.role === "admin") return "/inventaris";
  return "/masuk";
}

export async function requireSuperadmin() {
  const access = await accountAccess();
  if (access.kind === "signed-in") {
    if (access.role === "superadmin" && !access.needsPassword) return access;
    redirect(accountDestination(access));
  }
  if (access.kind === "demo") redirect("/inventaris");
  redirect(access.kind === "anonymous" ? "/masuk" : `/masuk?status=${access.kind}`);
}
