import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { inventoryHref, pageSize, type Asset, type Filters } from "@/lib/inventory";
import { ConditionMark, StatusMark } from "./asset-meta";

export function IndexTable({ assets, selected, filters, page, total }: {
  assets: Asset[];
  selected: string;
  filters: Filters;
  page: number;
  total: number;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const start = assets.length ? (page - 1) * pageSize + 1 : 0;
  const end = start ? start + assets.length - 1 : 0;

  return (
    <section aria-labelledby="daftar-aset" className="index-section">
      <div className="index-heading">
        <h2 id="daftar-aset">Daftar aset</h2>
        <p aria-live="polite">{total.toLocaleString("id-ID")} aset ditemukan</p>
      </div>
      <table className="asset-table" role="table">
        <caption className="sr-only">Daftar inventaris aset kantor</caption>
        <thead>
          <tr>
            <th scope="col" aria-sort="ascending"><span>Kode <ArrowDown size={12} aria-hidden="true" /></span></th>
            <th scope="col">Nama aset</th>
            <th scope="col">Ruangan</th>
            <th scope="col">Pemegang</th>
            <th scope="col">Kondisi</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {assets.map((asset) => {
            const detail = inventoryHref(`/inventaris/${asset.id}`, filters, page);
            const preview = inventoryHref("/inventaris", filters, page, asset.id);
            return (
              <tr key={asset.id} role="row" className={selected === asset.id ? "selected" : undefined}>
                <td role="cell" className="cell-code"><span className="asset-code">{asset.code}</span></td>
                <th role="rowheader" className="cell-name" scope="row">
                  <Link href={preview} scroll={false} className="preview-link" aria-current={selected === asset.id ? "true" : undefined}>
                    {asset.name}
                  </Link>
                  <Link href={detail} className="compact-link">{asset.name} <ArrowRight size={16} aria-hidden="true" /></Link>
                  <span className="table-category">{asset.category_name}</span>
                </th>
                <td role="cell" className="cell-room"><span className="mobile-label" aria-hidden="true">Ruangan</span>{asset.room_name}</td>
                <td role="cell" className="cell-holder"><span className="mobile-label" aria-hidden="true">Pemegang</span>{asset.holder_name || "Belum dipegang"}</td>
                <td role="cell" className="cell-condition"><ConditionMark condition={asset.condition} /></td>
                <td role="cell" className="cell-status"><StatusMark status={asset.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="index-footer">
        <p>Menampilkan {start.toLocaleString("id-ID")}–{end.toLocaleString("id-ID")} dari {total.toLocaleString("id-ID")}</p>
        <nav aria-label="Halaman inventaris" className="pagination">
          {page > 1 ? (
            <Link href={inventoryHref("/inventaris", filters, page - 1)} className="icon-button" aria-label="Halaman sebelumnya">
              <ChevronLeft size={17} aria-hidden="true" />
            </Link>
          ) : <span className="icon-button" aria-hidden="true"><ChevronLeft size={17} /></span>}
          <span>{page} / {lastPage}</span>
          {page < lastPage ? (
            <Link href={inventoryHref("/inventaris", filters, page + 1)} className="icon-button" aria-label="Halaman berikutnya">
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          ) : <span className="icon-button" aria-hidden="true"><ChevronRight size={17} /></span>}
        </nav>
      </div>
    </section>
  );
}
