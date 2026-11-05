import { redirect } from "next/navigation";
import { accountAccess, accountDestination } from "./account-access";
import type { supabaseServer } from "./supabase-server";

export type InventoryAccess =
  | { kind: "demo" }
  | { kind: "admin"; client: NonNullable<Awaited<ReturnType<typeof supabaseServer>>> };

export async function inventoryAccess(): Promise<
  InventoryAccess | { kind: "anonymous" | "denied" | "unavailable" }
> {
  const access = await accountAccess();
  if (access.kind !== "signed-in") return { kind: access.kind };
  return access.role === "admin" && !access.needsPassword
    ? { kind: "admin", client: access.client }
    : { kind: "denied" };
}

export async function requireInventoryAccess(): Promise<InventoryAccess> {
  const access = await inventoryAccess();
  if (access.kind === "admin" || access.kind === "demo") return access;
  const account = await accountAccess();
  if (account.kind === "signed-in") redirect(accountDestination(account));
  redirect(access.kind === "anonymous" ? "/masuk" : `/masuk?status=${access.kind}`);
}
