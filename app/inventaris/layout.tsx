import type { ReactNode } from "react";
import { OperationalShell } from "@/components/operational-shell";
import { requireInventoryAccess } from "@/lib/inventory-access";

export const dynamic = "force-dynamic";

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  const access = await requireInventoryAccess();
  return <OperationalShell role="admin" current="home" demo={access.kind === "demo"}>{children}</OperationalShell>;
}
