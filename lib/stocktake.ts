import type { requireOperationalAccess } from "./account-access";
import type { Condition } from "./inventory";

type Client = Awaited<ReturnType<typeof requireOperationalAccess>>["client"];

export const stocktakeStatuses = { open: "Terbuka", closed: "Tertutup" } as const;
export const stocktakeResults = { unchecked: "Belum diperiksa", found: "Ditemukan", missing: "Tidak ditemukan" } as const;
export const stocktakeOrigins = { snapshot: "Daftar awal", extra: "Aset tambahan" } as const;

export type StocktakeSession = {
  id: string;
  room_id: string;
  room_name_snapshot: string;
  status: keyof typeof stocktakeStatuses;
  opened_at: string;
  closed_at: string | null;
};

export type StocktakeAsset = {
  asset_id: string;
  asset_code_snapshot: string;
  asset_name_snapshot: string;
  recorded_room_id: string;
  recorded_room_name: string;
  recorded_condition: Condition;
};

export type StocktakeItem = StocktakeAsset & {
  origin: keyof typeof stocktakeOrigins;
  result: keyof typeof stocktakeResults;
  observed_condition: Condition | null;
  checked_at: string | null;
  notes: string | null;
};

export const stocktakePageSize = 12;

export async function stocktakeSessions(client: Client, status: StocktakeSession["status"], requested: number) {
  const read = (page: number) => client.from("stocktake_sessions")
    .select("id,room_id,room_name_snapshot,status,opened_at,closed_at", { count: "exact" })
    .eq("status", status).order("opened_at", { ascending: false }).order("id")
    .range((page - 1) * stocktakePageSize, page * stocktakePageSize - 1).returns<StocktakeSession[]>();
  const first = await read(1);
  if (first.error || first.count === null) throw new Error("Daftar sesi belum bisa dimuat.");
  const pages = Math.max(1, Math.ceil(first.count / stocktakePageSize));
  const page = Math.min(requested, pages);
  const result = page === 1 ? first : await read(page);
  if (result.error) throw new Error("Daftar sesi belum bisa dimuat.");
  return { sessions: result.data ?? [], page, pages };
}

export async function stocktakeDetail(client: Client, id: string) {
  const { data, error } = await client.rpc("stocktake_detail", { target_session: id });
  if (error) throw new Error("Sesi stok opname belum bisa dimuat.");
  return data as (StocktakeSession & { items: StocktakeItem[] }) | null;
}

export async function findExtraAssets(client: Client, id: string, term: string, target: string | null) {
  const { data, error } = await client.rpc("stocktake_find_extra", { target_session: id, term, target_asset: target });
  if (error) throw new Error("Pencarian aset tambahan gagal.");
  return (data ?? []) as StocktakeAsset[];
}

export function stocktakeDifferences(roomId: string, item: StocktakeItem) {
  const differences: string[] = [];
  if (item.result === "found") {
    if (roomId !== item.recorded_room_id) differences.push("Lokasi berbeda");
    if (item.observed_condition !== item.recorded_condition) differences.push("Kondisi berbeda");
  }
  return differences;
}
