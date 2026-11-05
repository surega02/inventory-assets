import type { ReactNode } from "react";
import { OperationalShell } from "@/components/operational-shell";
import { requireOperationalAccess } from "@/lib/account-access";
import "./stocktake.css";

export const dynamic = "force-dynamic";

export default async function StocktakeLayout({ children }: { children: ReactNode }) {
  await requireOperationalAccess("admin");
  return <OperationalShell role="admin" current="stocktake">{children}</OperationalShell>;
}
