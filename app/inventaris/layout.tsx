import type { ReactNode } from "react";
import { OperationalShell } from "@/components/operational-shell";
import { requireInventoryAccess } from "@/lib/inventory-access";

export const dynamic = "force-dynamic";

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  const access = await requireInventoryAccess();
  const demo = access.kind === "demo";
  return <OperationalShell role={demo ? "admin" : access.role} current="inventory" demo={demo}>{children}</OperationalShell>;
}
