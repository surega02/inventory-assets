import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/masuk/actions";
import { Brand, Copyright } from "@/components/brand";
import { requireInventoryAccess } from "@/lib/inventory-access";

export const dynamic = "force-dynamic";

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  const access = await requireInventoryAccess();
  return (
    <>
      <a href="#konten" className="skip-link">Lewati ke konten</a>
      <header className="site-header">
        <div className="frame header-inner">
          <Brand />
          <nav aria-label="Navigasi utama">
            <Link href="/inventaris" className="nav-current" aria-current="true">Inventaris</Link>
          </nav>
          <div className="account">
            <span><ShieldCheck size={16} aria-hidden="true" /> Admin</span>
            {access.kind === "admin" && (
              <form action={signOut}>
                <button className="icon-button" type="submit" aria-label="Keluar" title="Keluar">
                  <LogOut size={17} aria-hidden="true" />
                </button>
              </form>
            )}
          </div>
        </div>
      </header>
      <main id="konten" className="frame main-frame">{children}</main>
      <footer className="site-footer frame">
        <Copyright />
      </footer>
    </>
  );
}
