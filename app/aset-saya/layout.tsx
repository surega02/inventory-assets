import type { ReactNode } from "react";
import { OperationalShell } from "@/components/operational-shell";
import { requireOperationalAccess } from "@/lib/account-access";

export const dynamic = "force-dynamic";

export default async function MyAssetsLayout({ children }: { children: ReactNode }) {
  const { role } = await requireOperationalAccess("personal");
  return <OperationalShell role={role} current="my-assets">{children}</OperationalShell>;
}
