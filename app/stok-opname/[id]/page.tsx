import { ArrowLeft, ArrowRight, ClipboardCheck, Download, Search as SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SettingsActionForm } from "@/components/settings/action-form";
import { Button, buttonStyles } from "@/components/ui/button";
import { requireOperationalAccess } from "@/lib/account-access";
import { conditions, dateTimeFormat, isId, param, readPage, type Search } from "@/lib/inventory";
import {
  findExtraAssets, stocktakeDetail, stocktakeDifferences, stocktakeOrigins, stocktakePageSize,
  stocktakeResults, stocktakeStatuses, type StocktakeAsset, type StocktakeItem,
} from "@/lib/stocktake";
import { closeStocktake, confirmStocktake } from "../actions";
import { StocktakePagination } from "../pagination";
import { StocktakeScanner } from "../qr-scanner";

export const metadata: Metadata = { title: "Sesi Stok Opname" };

export default async function StocktakeSessionPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const [{ client }, { id }, query] = await Promise.all([requireOperationalAccess("manage"), params, searchParams]);
  if (!isId(id)) notFound();
  const session = await stocktakeDetail(client, id);
  if (!session) notFound();

  const path = `/stok-opname/${session.id}`;
  const open = session.status === "open";
  const review = open && param(query.tinjau) === "ya";
  const term = param(query.q).trim().slice(0, 120).replace(/\u0000/g, "");
  const needle = term.toLowerCase();
  const selectedId = param(query.aset).toLowerCase();
  const selecting = open && !review && isId(selectedId);
  const selectedItem = selecting ? session.items.find((item) => item.asset_id === selectedId) : undefined;
  const [extra, selectedExtra] = await Promise.all([
    open && !review && term ? findExtraAssets(client, id, term, null) : [],
    selecting && !selectedItem ? findExtraAssets(client, id, "", selectedId).then(([asset]) => asset) : undefined,
  ]);
  const selected = selectedItem ?? selectedExtra;
  const unchecked = session.items.filter((item) => item.result === "unchecked");
  const found = session.items.filter((item) => item.result === "found").length;
  const missing = session.items.length - found - unchecked.length;
  const differences = session.items.filter((item) => stocktakeDifferences(session.room_id, item).length > 0).length;
  const items = term
    ? session.items.filter((item) => item.asset_code_snapshot.toLowerCase().includes(needle) || item.asset_name_snapshot.toLowerCase().includes(needle))
    : [...unchecked, ...session.items.filter((item) => item.result !== "unchecked")];
  const pages = Math.max(1, Math.ceil(items.length / stocktakePageSize));
  const page = Math.min(readPage(query), pages);

  function href(nextPage = 1, asset?: string) {
    const params = new URLSearchParams();
    if (term) params.set("q", term);
    if (nextPage > 1) params.set("halaman", String(nextPage));
    if (asset) params.set("aset", asset);
    return `${path}${params.size ? `?${params}` : ""}${asset ? "#pemeriksaan" : ""}`;
  }

  return (
    <>
      <Link href={open ? "/stok-opname" : "/stok-opname?tab=riwayat"} className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Daftar sesi</Link>
      <div className="page-intro stocktake-intro">
        <div>
          <h1>{session.room_name_snapshot}</h1>
          <p><span className="stocktake-status">{stocktakeStatuses[session.status]}</span> Dibuka <Time value={session.opened_at} />
            {session.closed_at && <> · Ditutup <Time value={session.closed_at} /></>}
          </p>
        </div>
        <div className="intro-actions">
          <a className={buttonStyles("outline")} href={`${path}/ekspor`} download><Download size={17} aria-hidden="true" /> Ekspor Excel</a>
          {open && !review && <Link className={buttonStyles("outline")} href={`${path}?tinjau=ya`}><ClipboardCheck size={17} aria-hidden="true" /> Tinjau &amp; tutup</Link>}
        </div>
      </div>
      {param(query.hasil) === "disimpan" && <p className="settings-notice" role="status">Pemeriksaan aset tersimpan.</p>}
      {param(query.hasil) === "ditutup" && !open && <p className="settings-notice" role="status">Sesi ditutup. Hasil pemeriksaan sudah final.</p>}
      <dl className="stocktake-totals" aria-label="Ringkasan pemeriksaan">
        <div><dt>Ditemukan</dt><dd>{found}</dd></div>
        <div><dt>Belum diperiksa</dt><dd>{unchecked.length}</dd></div>
        <div><dt>Tidak ditemukan</dt><dd>{missing}</dd></div>
        <div><dt>Aset dengan selisih</dt><dd>{differences}</dd></div>
      </dl>
      {review ? (
        <section className="settings-panel stocktake-review" aria-labelledby="stocktake-review">
          <h2 id="stocktake-review">Tutup sesi</h2>
          <p>{unchecked.length ? `${unchecked.length} aset di bawah akan ditandai Tidak ditemukan.` : "Semua aset dalam daftar awal sudah diperiksa."} Hasil akan dikunci setelah sesi ditutup.</p>
          {unchecked.length > 0 && <ul className="stocktake-rows stocktake-unchecked">
            {unchecked.map((item) => <li key={item.asset_id} className="stocktake-row"><Identity asset={item} /></li>)}
          </ul>}
          <SettingsActionForm key={unchecked.map((item) => item.asset_id).join(",")} action={closeStocktake.bind(null, id)}>
            {unchecked.map((item) => <input key={item.asset_id} type="hidden" name="belum-diperiksa" value={item.asset_id} />)}
            <label className="stocktake-check"><input type="checkbox" name="konfirmasi" value="ya" required />
              {unchecked.length ? "Saya konfirmasi aset di atas tidak ditemukan dan siap menutup sesi." : "Saya konfirmasi hasil dan siap menutup sesi."}
            </label>
            <div className="stocktake-actions"><Button type="submit">Tutup sesi</Button><Link href={path} className="back-link">Kembali ke pemeriksaan</Link></div>
          </SettingsActionForm>
        </section>
      ) : (
        <>
          <section className="stocktake-tools" aria-label="Temukan aset">
            {open && <StocktakeScanner key={`${selectedId}:${param(query.hasil)}`} path={path} />}
            <form action={path} className="stocktake-search" role="search" key={term}>
              <label className="settings-field">Cari aset
                <input type="search" name="q" defaultValue={term} placeholder="Kode atau nama aset" maxLength={120} />
              </label>
              <Button type="submit" variant="outline"><SearchIcon size={17} aria-hidden="true" /> Cari</Button>
              {term && <Link className="back-link" href={path}>Reset</Link>}
            </form>
          </section>
          {selecting && <section id="pemeriksaan" className="settings-panel stocktake-inspection" aria-labelledby="inspection-heading">
            <h2 id="inspection-heading">Pemeriksaan aset</h2>
            {selected ? (
              <>
                <Identity asset={selected} />
                <p>Tercatat di <strong>{selected.recorded_room_name}</strong> · {conditions[selected.recorded_condition]}</p>
                <p>{selectedItem ? stocktakeResults[selectedItem.result] : "Aset tambahan akan masuk sesi setelah temuan disimpan."}
                  {selectedItem?.checked_at && <> · <Time value={selectedItem.checked_at} /></>}
                </p>
                <SettingsActionForm key={`${selected.asset_id}:${selectedItem?.checked_at ?? "baru"}`} action={confirmStocktake.bind(null, id, selected.asset_id, selectedItem?.checked_at ?? null)}>
                  <label className="settings-field">Kondisi fisik
                    <select name="kondisi" defaultValue={selectedItem?.observed_condition ?? ""} required>
                      <option value="" disabled>Pilih kondisi yang terlihat</option>
                      {Object.entries(conditions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="settings-field">Catatan (opsional)
                    <textarea name="catatan" maxLength={500} rows={2} defaultValue={selectedItem?.notes ?? ""} />
                  </label>
                  <div className="stocktake-actions"><Button type="submit">{selectedItem?.result === "found" ? "Simpan perubahan" : "Konfirmasi ditemukan"}</Button><Link href={href(page)} className="back-link">Kembali ke daftar</Link></div>
                </SettingsActionForm>
              </>
            ) : <p role="status">Aset tidak ditemukan di sesi ini atau sudah diarsipkan. Coba cari dengan kode atau nama aset.</p>}
          </section>}
          <section className="index-section" aria-labelledby="stocktake-items">
            <div className="settings-list-heading"><div><h2 id="stocktake-items">Aset dalam sesi</h2><p>{items.length} aset{term ? " cocok dengan pencarian" : " dalam daftar pemeriksaan"}</p></div></div>
            {items.length ? (
              <ul className="stocktake-rows">
                {items.slice((page - 1) * stocktakePageSize, page * stocktakePageSize).map((item) => (
                  <li className="stocktake-row" key={item.asset_id}>
                    <div>
                      <Identity asset={item} />
                      <p className="muted">{stocktakeOrigins[item.origin]} · Tercatat di {item.recorded_room_name} · {conditions[item.recorded_condition]}</p>
                      {item.observed_condition && <p>Fisik di {session.room_name_snapshot} · {conditions[item.observed_condition]}</p>}
                      {item.notes && <p className="stocktake-note">{item.notes}</p>}
                    </div>
                    <div className="stocktake-row-result">
                      <span className={`stocktake-status stocktake-${item.result}`}>{stocktakeResults[item.result]}</span>
                      {stocktakeDifferences(session.room_id, item).map((difference) => <span className="stocktake-difference" key={difference}>{difference}</span>)}
                    </div>
                    {open && <Link href={href(page, item.asset_id)} className={buttonStyles("outline")} aria-label={`Periksa ${item.asset_code_snapshot}`}>Periksa <ArrowRight size={16} aria-hidden="true" /></Link>}
                  </li>
                ))}
              </ul>
            ) : <p className="settings-empty">{term ? "Tidak ada aset dalam sesi yang cocok." : "Daftar awal kosong. Aset yang dikonfirmasi sebagai temuan akan muncul di sini."}</p>}
            <StocktakePagination page={page} pages={pages} href={href} />
          </section>
          {open && term && (
            <section className="index-section stocktake-extra" aria-labelledby="stocktake-extra">
              <div className="settings-list-heading"><div><h2 id="stocktake-extra">Aset aktif di luar daftar sesi</h2><p>Pilih aset jika ditemukan secara fisik di ruangan ini.</p></div></div>
              {extra.length ? <ul className="stocktake-rows">
                {extra.map((asset) => <li className="stocktake-row" key={asset.asset_id}>
                  <div><Identity asset={asset} /><p className="muted">Tercatat di {asset.recorded_room_name}</p></div>
                  <Link href={href(page, asset.asset_id)} className={buttonStyles("outline")} aria-label={`Periksa ${asset.asset_code_snapshot}`}>Periksa <ArrowRight size={16} aria-hidden="true" /></Link>
                </li>)}
              </ul> : <p className="settings-empty">Tidak ada aset tambahan yang cocok.</p>}
              {extra.length === 20 && <p className="settings-empty">Menampilkan hingga 20 aset tambahan. Gunakan kode atau nama yang lebih spesifik.</p>}
            </section>
          )}
        </>
      )}
    </>
  );
}

function Time({ value }: { value: string }) {
  return <time dateTime={value}>{dateTimeFormat.format(new Date(value))} WIB</time>;
}

function Identity({ asset }: { asset: StocktakeAsset }) {
  return <div className="stocktake-identity"><span className="asset-code">{asset.asset_code_snapshot}</span><strong>{asset.asset_name_snapshot}</strong></div>;
}
