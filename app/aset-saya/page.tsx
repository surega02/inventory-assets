import { ArrowRight, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConditionMark } from "@/components/inventory/asset-meta";
import { OperationPagination } from "@/components/operation-pagination";
import { buttonStyles } from "@/components/ui/button";
import { requireOperationalAccess } from "@/lib/account-access";
import { readPage, type Search } from "@/lib/inventory";
import { staffAssetPage } from "@/lib/operations";

export const metadata: Metadata = { title: "Aset Saya" };

export default async function StaffAssets({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ client }, query] = await Promise.all([requireOperationalAccess("staff"), searchParams]);
  const { rows, page, total } = await staffAssetPage(client, readPage(query));
  return (
    <div className="operation-page">
      <div className="page-intro"><div><h1>Aset Saya</h1><p>Aset yang saat ini tercatat atas nama Anda.</p></div></div>
      {rows.length ? (
        <section className="index-section" aria-labelledby="staff-assets-title">
          <div className="index-heading"><h2 id="staff-assets-title">Daftar aset</h2><p>{total.toLocaleString("id-ID")} aset</p></div>
          <ul className="operation-list">
            {rows.map((asset) => (
              <li className="operation-row" key={asset.id}>
                <p className="asset-code">{asset.code}</p>
                <h3><Link className="staff-asset-link" href={`/aset-saya/${asset.id}${page > 1 ? `?halaman=${page}` : ""}`}>{asset.name}<ArrowRight size={16} aria-hidden="true" /></Link></h3>
                <p className="table-category">{asset.category_name}</p>
                <div className="staff-asset-location"><span>Ruangan <strong>{asset.room_name}</strong></span><ConditionMark condition={asset.condition} /></div>
              </li>
            ))}
          </ul>
          <OperationPagination path="/aset-saya" page={page} total={total} />
        </section>
      ) : (
        <section className="empty-state">
          <Package size={28} aria-hidden="true" />
          <h2>Belum ada aset yang Anda pegang</h2>
          <p>Aset akan tampil setelah Anda menerima pengajuan serah terima.</p>
          <Link className={buttonStyles("outline")} href="/serah-terima">Lihat Serah Terima</Link>
        </section>
      )}
    </div>
  );
}
