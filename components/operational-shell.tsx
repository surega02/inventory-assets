import { ArrowLeftRight, Boxes, ClipboardCheck, LogOut, Package, Settings2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/masuk/actions";
import { Brand, Copyright } from "@/components/brand";

const handovers = { key: "handovers", href: "/serah-terima", label: "Serah Terima", Icon: ArrowLeftRight } as const;
const navigation = {
  admin: [
    { key: "home", href: "/inventaris", label: "Inventaris", Icon: Boxes },
    handovers,
    { key: "stocktake", href: "/stok-opname", label: "Stok Opname", Icon: ClipboardCheck },
  ],
  staff: [{ key: "home", href: "/aset-saya", label: "Aset Saya", Icon: Package }, handovers],
  superadmin: [{ key: "settings", href: "/pengaturan", label: "Pengaturan", Icon: Settings2 }],
} as const;
const roleLabels = { admin: "Admin", staff: "Staf", superadmin: "Superadmin" };

export function OperationalShell({ role, current, demo = false, children }: {
  role: keyof typeof navigation;
  current: "home" | "handovers" | "stocktake" | "settings";
  demo?: boolean;
  children: ReactNode;
}) {
  const destinations = navigation[role];
  return (
    <div className="app-shell">
      <a href="#konten" className="skip-link">Lewati ke konten</a>
      <header className="app-rail">
        <Brand href={destinations[0].href} />
        <nav className="app-nav" aria-label="Navigasi utama">
          {(demo ? destinations.slice(0, 1) : destinations).map(({ key, href, label, Icon }) => (
            <Link key={key} href={href} aria-current={current === key ? "location" : undefined}>
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="app-account">
          <span><ShieldCheck size={16} aria-hidden="true" /> {roleLabels[role]}</span>
          {!demo && (
            <form action={signOut}>
              <button type="submit" className="icon-button" aria-label="Keluar" title="Keluar"><LogOut size={17} aria-hidden="true" /></button>
            </form>
          )}
        </div>
      </header>
      <div className="app-workspace">
        <main id="konten" className="frame main-frame" tabIndex={-1}>{children}</main>
        <footer className="site-footer frame"><Copyright /></footer>
      </div>
    </div>
  );
}
