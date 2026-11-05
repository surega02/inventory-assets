import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AssetForm } from "@/components/inventory/asset-form";
import { isId, param, type Search } from "@/lib/inventory";
import { requireInventoryAccess } from "@/lib/inventory-access";
import { inventoryOptions } from "@/lib/inventory-store";

export const metadata: Metadata = { title: "Tambah aset" };

export default async function AddAssetPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [access, query] = await Promise.all([requireInventoryAccess(), searchParams]);
  if (access.kind !== "admin") redirect("/inventaris");
  const { categories, rooms } = await inventoryOptions(access, true);
  const added = param(query.ditambahkan);
  const previousId = isId(added) ? added : null;

  return (
    <div className="asset-entry">
      <Link href="/inventaris" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Daftar aset</Link>
      <div className="page-intro">
        <div>
          <h1>Tambah aset</h1>
          <p>Catat satu unit aset menggunakan kode dari daftar inventaris.</p>
        </div>
      </div>
      {previousId && <p className="settings-notice" role="status">Aset berhasil ditambahkan. <Link href={`/inventaris/${previousId}`}>Lihat detail aset terakhir</Link></p>}
      {!categories.length || !rooms.length ? (
        <section className="settings-panel" aria-labelledby="asset-entry-unavailable">
          <h2 id="asset-entry-unavailable">Kategori dan ruangan diperlukan</h2>
          <p>Hubungi Superadmin untuk menyiapkan setidaknya satu kategori dan satu ruangan aktif.</p>
        </section>
      ) : <AssetForm key={previousId ?? "new"} categories={categories} rooms={rooms} />}
    </div>
  );
}
