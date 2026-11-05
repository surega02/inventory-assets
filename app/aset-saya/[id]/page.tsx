import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConditionMark } from "@/components/inventory/asset-meta";
import { AssetPhoto } from "@/components/inventory/photo";
import { requireOperationalAccess } from "@/lib/account-access";
import { isId, readPage, type Search } from "@/lib/inventory";
import { staffAsset } from "@/lib/operations";

export const metadata: Metadata = { title: "Detail Aset Saya" };

export default async function StaffAssetDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const [{ client }, { id }, query] = await Promise.all([requireOperationalAccess("staff"), params, searchParams]);
  if (!isId(id)) notFound();
  const asset = await staffAsset(client, id);
  if (!asset) notFound();
  const page = readPage(query);
  return (
    <div className="detail-page">
      <Link href={`/aset-saya${page > 1 ? `?halaman=${page}` : ""}`} className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Aset Saya</Link>
      <div className="detail-grid">
        <section className="detail-identity" aria-labelledby="staff-asset-title">
          <h1 id="staff-asset-title">{asset.name}</h1>
          <div className="detail-marks"><span className="asset-code">{asset.code}</span><ConditionMark condition={asset.condition} /></div>
          <dl className="detail-properties">
            <div><dt>Ruangan</dt><dd>{asset.room_name}</dd></div>
            <div><dt>Kategori</dt><dd>{asset.category_name}</dd></div>
            <div><dt>Merek / model</dt><dd>{asset.brand_model || "Belum dicatat"}</dd></div>
            <div><dt>Nomor seri</dt><dd>{asset.serial_number || "Belum dicatat"}</dd></div>
          </dl>
        </section>
        <AssetPhoto src={asset.has_photo ? `/inventaris/${asset.id}/foto` : null} name={asset.name} demo={false} eager />
      </div>
    </div>
  );
}
