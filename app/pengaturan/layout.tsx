import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/masuk/actions";
import { Brand, Copyright } from "@/components/brand";
import { requireSuperadmin } from "@/lib/account-access";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requireSuperadmin();
  return (
    <>
      <a href="#konten" className="skip-link">Lewati ke konten</a>
      <header className="site-header">
        <div className="frame header-inner">
          <Brand href="/pengaturan" />
          <nav aria-label="Navigasi utama">
            <Link href="/pengaturan" className="nav-current" aria-current="true">Pengaturan</Link>
          </nav>
          <div className="account">
            <span><ShieldCheck size={16} aria-hidden="true" /> Superadmin</span>
            <form action={signOut}>
              <button type="submit" className="icon-button" aria-label="Keluar" title="Keluar">
                <LogOut size={17} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="konten" className="frame main-frame">{children}</main>
      <footer className="site-footer frame"><Copyright /></footer>
    </>
  );
}
