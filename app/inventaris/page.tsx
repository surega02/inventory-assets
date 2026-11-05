import { Plus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AssetPreview } from "@/components/inventory/asset-preview";
import { ExportButton } from "@/components/inventory/export-button";
import { FilterForm } from "@/components/inventory/filter-form";
import { IndexTable } from "@/components/inventory/index-table";
import { buttonStyles } from "@/components/ui/button";
import { inventoryHref, param, readFilters, readPage, type Search } from "@/lib/inventory";
import { requireInventoryAccess } from "@/lib/inventory-access";
import { assetPhotoSrc, inventoryOptions, inventoryPage } from "@/lib/inventory-store";

export const metadata: Metadata = { title: "Inventaris" };

export default async function InventoryIndex({ searchParams }: { searchParams: Promise<Search> }) {
  const [access, query] = await Promise.all([requireInventoryAccess(), searchParams]);
  const filters = readFilters(query);
  const [{ assets, page, total }, { categories, rooms }] = await Promise.all([
    inventoryPage(access, filters, readPage(query)),
    inventoryOptions(access),
  ]);
  const selected = assets.find((asset) => asset.id === param(query.aset)) ?? assets[0];
  const hasFilters = Object.values(filters).some(Boolean);
  const demo = access.kind === "demo";

  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Inventaris</h1>
          <p>Temukan aset, ruangan, dan pemegangnya.</p>
        </div>
        <div className="intro-actions">
          {demo && <span className="demo-tag">Data contoh</span>}
          <ExportButton key={JSON.stringify(filters)} filters={filters} disabled={!total} />
          {!demo && <Link href="/inventaris/tambah" className={buttonStyles()}><Plus size={17} aria-hidden="true" /> Tambah aset</Link>}
        </div>
      </div>
      <FilterForm key={JSON.stringify(filters)} filters={filters} categories={categories} rooms={rooms} />
      {selected ? (
        <div className="inventory-grid">
          <IndexTable assets={assets} selected={selected.id} filters={filters} page={page} total={total} />
          <AssetPreview key={selected.id} asset={selected} photo={assetPhotoSrc(access, selected)} demo={demo}
            detail={inventoryHref(`/inventaris/${selected.id}`, filters, page)}
            label={inventoryHref(`/inventaris/${selected.id}/label`, filters, page)} />
        </div>
      ) : (
        <section className="empty-state">
          <SearchX size={30} strokeWidth={1.5} aria-hidden="true" />
          <h2>{hasFilters ? "Tidak ada aset yang cocok" : "Belum ada aset tercatat"}</h2>
          <p>{hasFilters ? "Coba kata kunci lain atau longgarkan filter." : "Aset akan muncul setelah tercatat di inventaris."}</p>
          {hasFilters && <Link href="/inventaris" className={buttonStyles("outline")}>Reset filter</Link>}
        </section>
      )}
    </>
  );
}
