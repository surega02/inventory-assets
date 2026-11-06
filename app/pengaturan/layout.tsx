import type { ReactNode } from "react";
import { OperationalShell } from "@/components/operational-shell";
import { requireSuperadmin } from "@/lib/account-access";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requireSuperadmin();
  return <OperationalShell role="superadmin" current="settings">{children}</OperationalShell>;
}
