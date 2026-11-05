import { ArrowUpRight, ScanLine } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import type { Asset } from "@/lib/inventory";
import { AssetLocation, ConditionMark, StatusMark } from "./asset-meta";
import { AssetPhoto } from "./photo";

export function AssetPreview({ asset, photo, detail, label, demo }: {
  asset: Asset;
  photo: string | null;
  detail: string;
  label: string;
  demo: boolean;
}) {
  return (
    <aside className="asset-preview" aria-label="Pratinjau aset terpilih">
      <div className="preview-top">
        <span className="asset-code">{asset.code}</span>
        <StatusMark status={asset.status} />
      </div>
      <h2>{asset.name}</h2>
      <div className="preview-category">{asset.category_name} <ConditionMark condition={asset.condition} /></div>
      <AssetPhoto key={photo ?? "none"} src={photo} name={asset.name} demo={demo} />
      <AssetLocation asset={asset} />
      <div className="preview-actions">
        <Link href={detail} className={buttonStyles("primary")}>
          Lihat detail <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <Link href={label} className={buttonStyles("outline")}>
          <ScanLine size={17} aria-hidden="true" /> Label QR
        </Link>
      </div>
    </aside>
  );
}
