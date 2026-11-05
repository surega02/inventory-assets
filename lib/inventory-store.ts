import type { InventoryAccess } from "./inventory-access";
import { demoAsset, demoCategories, demoHistory, demoRooms, matchingDemoAssets } from "./demo-inventory";
import { isId, pageSize, type Asset, type AssetEvent, type Filters, type Option } from "./inventory";

const batchSize = 500;

function searchArgs(filters: Filters) {
  return {
    search_term: filters.q,
    category_filter: filters.kategori || null,
    room_filter: filters.ruangan || null,
    condition_filter: filters.kondisi || null,
    status_filter: filters.status || null,
  };
}

export async function inventoryPage(access: InventoryAccess, filters: Filters, requested: number) {
  if (access.kind === "demo") {
    const assets = matchingDemoAssets(filters);
    const total = assets.length;
    const page = Math.min(requested, Math.max(1, Math.ceil(total / pageSize)));
    return { assets: assets.slice((page - 1) * pageSize, page * pageSize), page, total };
  }

  const args = searchArgs(filters);
  const countResult = await access.client.rpc("inventory_admin_search", args, { count: "exact" }).limit(1);
  if (countResult.error || countResult.count === null) throw new Error("Inventaris gagal dimuat");
  const page = Math.min(requested, Math.max(1, Math.ceil(countResult.count / pageSize)));
  const start = (page - 1) * pageSize;
  const { data, error } = await access.client.rpc("inventory_admin_search", args)
    .order("code").order("id").range(start, start + pageSize - 1);
  if (error) throw new Error("Inventaris gagal dimuat");
  return { assets: (data ?? []) as Asset[], page, total: countResult.count };
}

export async function inventoryOptions(access: InventoryAccess, activeOnly = false) {
  if (access.kind === "demo") return { categories: demoCategories, rooms: demoRooms };
  const { client } = access;
  async function readOptions(table: "categories" | "rooms") {
    const options: Option[] = [];
    while (true) {
      const query = client.from(table).select("id,name").order("name").order("id")
        .range(options.length, options.length + batchSize - 1);
      if (activeOnly) query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error("Pilihan kategori atau ruangan gagal dimuat");
      if (!data?.length) return options;
      options.push(...data);
    }
  }
  const [categories, rooms] = await Promise.all([readOptions("categories"), readOptions("rooms")]);
  return { categories, rooms };
}

export async function inventoryAsset(access: InventoryAccess, id: string): Promise<Asset | null> {
  if (!isId(id)) return null;
  if (access.kind === "demo") return demoAsset(id);
  const { data, error } = await access.client.from("inventory_admin_index").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Detail aset gagal dimuat");
  return data as Asset | null;
}

export async function inventoryHistory(access: InventoryAccess, asset: Asset): Promise<AssetEvent[]> {
  if (access.kind === "demo") return demoHistory(asset);
  const events: AssetEvent[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await access.client.from("inventory_admin_history").select("*")
      .eq("asset_id", asset.id).order("occurred_at", { ascending: false }).order("id")
      .range(from, from + batchSize - 1);
    if (error) throw new Error("Riwayat aset gagal dimuat");
    if (!data?.length) return events;
    events.push(...data as AssetEvent[]);
    from += data.length;
  }
}

export async function exportAssets(access: InventoryAccess, filters: Filters): Promise<Asset[]> {
  if (access.kind === "demo") return matchingDemoAssets(filters);
  const assets: Asset[] = [];
  let cursor: string | undefined;
  while (true) {
    let query = access.client.rpc("inventory_admin_search", searchArgs(filters)).order("id").limit(batchSize);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error) throw new Error("Ekspor inventaris gagal dimuat");
    if (!data?.length) return assets.sort((a, b) => a.code.localeCompare(b.code, "id"));
    const batch = data as Asset[];
    assets.push(...batch);
    cursor = batch[batch.length - 1].id;
  }
}

export function assetPhotoSrc(access: InventoryAccess, asset: Asset): string | null {
  if (!asset.photo_path) return null;
  return access.kind === "demo" ? `/demo/${asset.photo_path}` : `/inventaris/${asset.id}/foto`;
}
