import { Archive, ArrowLeft, ArrowRight, ScanLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetLocation, ConditionMark, StatusMark } from "@/components/inventory/asset-meta";
import { AssetOperations } from "@/components/inventory/asset-operations";
import { AssetPhoto } from "@/components/inventory/photo";
import { SettingsActionForm } from "@/components/settings/action-form";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  conditions, dateFormat, dateTimeFormat, eventLabels, inventoryHref, param,
  readFilters, readPage, rupiah, statuses, type AssetEvent, type Search,
} from "@/lib/inventory";
import { requireInventoryAccess } from "@/lib/inventory-access";
import { assetPhotoSrc, inventoryAsset, inventoryHistory } from "@/lib/inventory-store";
import { assetPendingHandover } from "@/lib/operations";
import { archiveAsset } from "../actions";

export const metadata: Metadata = { title: "Detail aset" };

function changes(event: AssetEvent) {
  const before = event.before_state;
  const after = event.after_state;
  const fields = [
    ["Ruangan", before?.room_name, after.room_name],
    ["Pemegang", before?.holder_name, after.holder_name],
    ["Kondisi", before?.condition && conditions[before.condition], after.condition && conditions[after.condition]],
    ["Status", before?.status && statuses[before.status], after.status && statuses[after.status]],
  ] as const;
  return fields.filter(([, oldValue, newValue]) => newValue !== undefined && oldValue !== newValue);
}

export default async function AssetDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const [access, { id }, query] = await Promise.all([requireInventoryAccess(), params, searchParams]);
  const asset = await inventoryAsset(access, id);
  if (!asset) notFound();
  const canOperate = access.kind === "admin" && asset.status === "active" && !!asset.updated_at;
  const [history, pending] = await Promise.all([
    inventoryHistory(access, asset),
    access.kind === "admin" && canOperate ? assetPendingHandover(access.client, asset.id) : null,
  ]);
  const filters = readFilters(query);
  const page = readPage(query);
  const result = param(query.hasil);

  return (
    <div className="detail-page">
      <Link href={inventoryHref("/inventaris", filters, page, asset.id)} className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Daftar aset
      </Link>
      {result === "ditambahkan" && <p className="settings-notice" role="status">Aset berhasil ditambahkan.</p>}
      {result === "diarsipkan" && asset.status === "archived" && <p className="settings-notice" role="status">Aset berhasil diarsipkan.</p>}
      {result === "dikembalikan" && <p className="settings-notice" role="status">Pengembalian ke Gudang tercatat.</p>}
      {result === "dipindahkan" && <p className="settings-notice" role="status">Mutasi ruangan tercatat.</p>}
      <div className="detail-grid">
        <section className="detail-identity" aria-labelledby="asset-title">
          <h1 id="asset-title">{asset.name}</h1>
          <div className="detail-marks">
            <span className="asset-code">{asset.code}</span>
            <StatusMark status={asset.status} />
            <ConditionMark condition={asset.condition} />
            {access.kind === "demo" && <span className="demo-tag">Data contoh</span>}
          </div>
          <AssetLocation asset={asset} />
          <dl className="detail-properties">
            <div><dt>Kategori</dt><dd>{asset.category_name}</dd></div>
            <div><dt>Merek / model</dt><dd>{asset.brand_model || "Belum dicatat"}</dd></div>
            <div><dt>Nomor seri</dt><dd className={asset.serial_number ? "asset-code" : ""}>{asset.serial_number || "Belum dicatat"}</dd></div>
            <div><dt>Tanggal pembelian</dt><dd>{asset.purchase_date ? dateFormat.format(new Date(asset.purchase_date)) : "Belum dicatat"}</dd></div>
            <div><dt>Harga perolehan</dt><dd>{asset.acquisition_cost_idr === null ? "Belum dicatat" : rupiah.format(BigInt(asset.acquisition_cost_idr))}</dd></div>
            {asset.notes && <div><dt>Catatan</dt><dd>{asset.notes}</dd></div>}
          </dl>
          <Link href={inventoryHref(`/inventaris/${asset.id}/label`, filters, page)} className={buttonStyles("outline")}>
            <ScanLine size={18} aria-hidden="true" /> Cetak label QR
          </Link>
          {canOperate && <a className="operation-link" href="#kelola-aset">Kelola aset</a>}
          {access.kind === "admin" && asset.status === "active" && !pending && (
            <details className="asset-archive">
              <summary className={buttonStyles("outline")}><Archive size={17} aria-hidden="true" /> Arsipkan aset</summary>
              <div className="asset-archive-confirmation">
                <p><strong>{asset.name}</strong> akan dikeluarkan dari inventaris aktif. Detail dan riwayatnya tetap dapat dibuka.</p>
                <SettingsActionForm action={archiveAsset.bind(null, asset.id)}>
                  {Object.entries(filters).map(([name, value]) => value && <input key={name} type="hidden" name={name} value={value} />)}
                  <input type="hidden" name="halaman" value={page} />
                  <Button type="submit">Konfirmasi arsip</Button>
                </SettingsActionForm>
              </div>
            </details>
          )}
        </section>
        <AssetPhoto src={assetPhotoSrc(access, asset)} name={asset.name} demo={access.kind === "demo"} eager />
      </div>
      {access.kind === "admin" && canOperate && <AssetOperations client={access.client} asset={asset} pending={pending} />}
      <section className="history" aria-labelledby="history-title">
        <h2 id="history-title">Riwayat aset</h2>
        {history.length ? (
          <ol>
            {history.map((event) => (
              <li key={event.id}>
                <div className="history-date">
                  <time dateTime={event.occurred_at}>{dateTimeFormat.format(new Date(event.occurred_at))} WIB</time>
                  <span>{event.actor_name}</span>
                </div>
                <div className="history-content">
                  <h3>{eventLabels[event.event_type]}</h3>
                  {changes(event).map(([label, before, after]) => (
                    <p className="history-change" key={label}>
                      <span>{label}</span>
                      {event.before_state && (
                        <>{before ?? (before === null && label === "Pemegang" ? "Belum dipegang" : "Belum dicatat")}
                          <ArrowRight size={14} aria-label="menjadi" /></>
                      )}
                      <strong>{after || (label === "Pemegang" ? "Belum dipegang" : "Belum dicatat")}</strong>
                    </p>
                  ))}
                  {event.notes && <p>{event.notes}</p>}
                </div>
              </li>
            ))}
          </ol>
        ) : <p className="muted">Belum ada riwayat untuk aset ini.</p>}
      </section>
    </div>
  );
}
