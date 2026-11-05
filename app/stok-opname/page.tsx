import { ArrowRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SettingsActionForm } from "@/components/settings/action-form";
import { Button } from "@/components/ui/button";
import { requireOperationalAccess } from "@/lib/account-access";
import { dateTimeFormat, param, readPage, type Search } from "@/lib/inventory";
import { inventoryOptions } from "@/lib/inventory-store";
import { stocktakeSessions } from "@/lib/stocktake";
import { openStocktake } from "./actions";
import { StocktakePagination } from "./pagination";

export const metadata: Metadata = { title: "Stok Opname" };

export default async function StocktakePage({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ client }, query] = await Promise.all([requireOperationalAccess("admin"), searchParams]);
  const history = param(query.tab) === "riwayat";
  const [{ rooms }, { sessions, page, pages }] = await Promise.all([
    inventoryOptions({ kind: "admin", client }, true),
    stocktakeSessions(client, history ? "closed" : "open", readPage(query)),
  ]);

  function href(nextPage: number) {
    const params = new URLSearchParams();
    if (history) params.set("tab", "riwayat");
    if (nextPage > 1) params.set("halaman", String(nextPage));
    return params.size ? `/stok-opname?${params}` : "/stok-opname";
  }

  return (
    <>
      <div className="page-intro"><div><h1>Stok Opname</h1><p>Cocokkan aset fisik dengan daftar tercatat per ruangan.</p></div></div>
      <div className="stocktake-grid">
        <section className="settings-panel" aria-labelledby="stocktake-open">
          <h2 id="stocktake-open">Buka sesi ruangan</h2>
          {rooms.length ? (
            <>
              <p>Daftar awal memuat aset aktif saat sesi dibuka. Jika sudah ada sesi terbuka untuk ruangan ini, sesi tersebut akan dilanjutkan.</p>
              <SettingsActionForm action={openStocktake}>
                <label className="settings-field">Ruangan
                  <select name="ruangan" defaultValue="" required>
                    <option value="" disabled>Pilih ruangan</option>
                    {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                  </select>
                </label>
                <Button type="submit"><Plus size={17} aria-hidden="true" /> Buka sesi</Button>
              </SettingsActionForm>
            </>
          ) : <p>Belum ada ruangan aktif. Minta Superadmin mengaktifkan ruangan untuk memulai.</p>}
        </section>
        <section className="index-section" aria-labelledby="stocktake-sessions">
          <div className="settings-list-heading"><h2 id="stocktake-sessions">Daftar sesi</h2></div>
          <nav className="stocktake-tabs" aria-label="Status sesi">
            <Link href="/stok-opname" aria-current={history ? undefined : "page"}>Terbuka</Link>
            <Link href="/stok-opname?tab=riwayat" aria-current={history ? "page" : undefined}>Riwayat</Link>
          </nav>
          {sessions.length ? (
            <ul className="stocktake-rows">
              {sessions.map((session) => (
                <li key={session.id}>
                  <Link className="stocktake-row stocktake-session-row" href={`/stok-opname/${session.id}`}>
                    <div><strong>{session.room_name_snapshot}</strong>
                      <p className="muted">{session.closed_at ? "Ditutup" : "Dibuka"} <time dateTime={session.closed_at ?? session.opened_at}>{dateTimeFormat.format(new Date(session.closed_at ?? session.opened_at))} WIB</time></p>
                    </div>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="settings-empty">{history ? "Sesi yang sudah ditutup akan tampil di sini." : "Belum ada sesi terbuka. Pilih ruangan untuk memulai pemeriksaan."}</p>}
          <StocktakePagination page={page} pages={pages} href={href} />
        </section>
      </div>
    </>
  );
}
