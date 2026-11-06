import { redirect } from "next/navigation";
import { accountAccess, accountDestination, hasOperationalAccess, type AccountRole } from "./account-access";
import type { supabaseServer } from "./supabase-server";

export type InventoryAccess =
  | { kind: "demo" }
  | { kind: "admin"; client: NonNullable<Awaited<ReturnType<typeof supabaseServer>>> };

type SignedInventoryAccess = Extract<InventoryAccess, { kind: "admin" }> & { role: AccountRole };
type InventorySession = SignedInventoryAccess | Extract<InventoryAccess, { kind: "demo" }>;

export async function inventoryAccess(): Promise<
  InventorySession | { kind: "anonymous" | "denied" | "unavailable" }
> {
  const access = await accountAccess();
  if (access.kind === "demo") return { kind: "demo" };
  if (access.kind !== "signed-in") return { kind: access.kind };
  return hasOperationalAccess(access.role, "manage") && !access.needsPassword
    ? { kind: "admin", client: access.client, role: access.role }
    : { kind: "denied" };
}

export async function requireInventoryAccess(): Promise<InventorySession> {
  const access = await inventoryAccess();
  if (access.kind === "admin" || access.kind === "demo") return access;
  const account = await accountAccess();
  if (account.kind === "signed-in") redirect(accountDestination(account));
  redirect(access.kind === "anonymous" ? "/masuk" : `/masuk?status=${access.kind}`);
}
