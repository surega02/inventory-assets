import type { ReactNode } from "react";
import { OperationalShell } from "@/components/operational-shell";
import { requireOperationalAccess } from "@/lib/account-access";

export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  await requireOperationalAccess("staff");
  return <OperationalShell role="staff" current="home">{children}</OperationalShell>;
}
