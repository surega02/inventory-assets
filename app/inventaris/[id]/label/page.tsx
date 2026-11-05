import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PrintButton } from "@/components/inventory/print-button";
import { inventoryHref, readFilters, readPage, type Search } from "@/lib/inventory";
import { requireInventoryAccess } from "@/lib/inventory-access";
import { inventoryAsset } from "@/lib/inventory-store";

export const metadata: Metadata = { title: "Label QR" };

export default async function AssetLabel({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const [access, { id }, query] = await Promise.all([requireInventoryAccess(), params, searchParams]);
  const asset = await inventoryAsset(access, id);
  if (!asset) notFound();
  const qr = await QRCode.toDataURL(`assets:v1:${asset.id}`, { margin: 4, width: 240, errorCorrectionLevel: "M" });

  return (
    <div className="label-page">
      <div className="print-controls">
        <Link href={inventoryHref(`/inventaris/${asset.id}`, readFilters(query), readPage(query))} className="back-link">
          <ArrowLeft size={16} aria-hidden="true" /> Detail aset
        </Link>
        <div className="page-intro"><div><h1>Label QR</h1><p>Cetak dan tempel label pada aset.</p></div><PrintButton /></div>
      </div>
      <figure className="print-label">
        <Image src={qr} alt={`Kode QR untuk aset ${asset.code}`} unoptimized width={120} height={120} />
        <figcaption>
          <strong className="asset-code">{asset.code}</strong>
          <span>{asset.name}</span>
          {access.kind === "demo" && <small>Label contoh</small>}
        </figcaption>
      </figure>
    </div>
  );
}
