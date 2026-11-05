import { Crosshair } from "lucide-react";
import Link from "next/link";

export function Brand({ href = "/inventaris" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="assets · Beranda">
      <Crosshair size={23} strokeWidth={1.45} aria-hidden="true" />
      <span>assets</span>
    </Link>
  );
}

export function Copyright() {
  const owner = process.env.ASSETS_COPYRIGHT_OWNER?.trim();
  const year = new Intl.DateTimeFormat("id-ID", { year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());
  return <span>© {year}{owner ? ` ${owner}` : ""}</span>;
}
