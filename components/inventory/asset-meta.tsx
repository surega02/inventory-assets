import { conditions, statuses, type Asset, type AssetStatus, type Condition } from "@/lib/inventory";

export function ConditionMark({ condition }: { condition: Condition }) {
  return (
    <span className={`condition condition-${condition}`}>
      <span className="condition-dot" aria-hidden="true" />
      {conditions[condition]}
    </span>
  );
}

export function StatusMark({ status }: { status: AssetStatus }) {
  return <span className={`asset-status status-${status}`}>{statuses[status]}</span>;
}

export function AssetLocation({ asset }: { asset: Asset }) {
  return (
    <dl className="asset-location">
      <div><dt>Ruangan tercatat</dt><dd>{asset.room_name}</dd></div>
      <div><dt>Pemegang aktif</dt><dd>{asset.holder_name || "Belum dipegang"}</dd></div>
    </dl>
  );
}
