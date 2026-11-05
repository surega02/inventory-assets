import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/masuk/actions";
import { Brand, Copyright } from "@/components/brand";

export function OperationalShell({ role, current, demo = false, children }: {
  role: "admin" | "staff";
  current: "home" | "handovers" | "stocktake";
  demo?: boolean;
  children: ReactNode;
}) {
  const admin = role === "admin";
  const home = admin ? "/inventaris" : "/aset-saya";
  return (
    <>
      <a href="#konten" className="skip-link">Lewati ke konten</a>
      <header className="site-header">
        <div className={`frame header-inner${demo ? "" : " operational-header"}`}>
          <Brand href={home} />
          <nav aria-label="Navigasi utama">
            <Link href={home} className={current === "home" ? "nav-current" : undefined} aria-current={current === "home" ? "true" : undefined}>
              {admin ? "Inventaris" : "Aset Saya"}
            </Link>
            {!demo && <Link href="/serah-terima" className={current === "handovers" ? "nav-current" : undefined} aria-current={current === "handovers" ? "true" : undefined}>Serah Terima</Link>}
            {admin && !demo && <Link href="/stok-opname" className={current === "stocktake" ? "nav-current" : undefined} aria-current={current === "stocktake" ? "true" : undefined}>Stok Opname</Link>}
          </nav>
          <div className="account">
            <span><ShieldCheck size={16} aria-hidden="true" /> {admin ? "Admin" : "Staf"}</span>
            {!demo && (
              <form action={signOut}>
                <button type="submit" className="icon-button" aria-label="Keluar" title="Keluar"><LogOut size={17} aria-hidden="true" /></button>
              </form>
            )}
          </div>
        </div>
      </header>
      <main id="konten" className="frame main-frame">{children}</main>
      <footer className="site-footer frame"><Copyright /></footer>
    </>
  );
}
