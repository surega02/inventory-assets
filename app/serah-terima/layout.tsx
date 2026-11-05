import type { ReactNode } from "react";
import { OperationalShell } from "@/components/operational-shell";
import { requireOperationalAccess } from "@/lib/account-access";

export const dynamic = "force-dynamic";

export default async function HandoverLayout({ children }: { children: ReactNode }) {
  const { role } = await requireOperationalAccess();
  return <OperationalShell role={role} current="handovers">{children}</OperationalShell>;
}
