import type { Condition, Option } from "./inventory";
import type { requireOperationalAccess } from "./account-access";

type Client = Awaited<ReturnType<typeof requireOperationalAccess>>["client"];

export const handoverStatuses = {
  pending: "Menunggu", accepted: "Diterima", rejected: "Ditolak", cancelled: "Dibatalkan",
} as const;

export type Handover = {
  id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  recipient_name: string;
  status: keyof typeof handoverStatuses;
  requested_at: string;
  resolved_at: string | null;
  rejection_reason: string | null;
};

export type StaffAsset = {
  id: string;
  code: string;
  name: string;
  category_name: string;
  room_name: string;
  condition: Condition;
  serial_number: string | null;
  brand_model: string | null;
  has_photo: boolean;
};

export const operationPageSize = 10;

async function readPageOf<T>(requested: number, read: (start: number, end: number) => PromiseLike<{
  data: T[] | null; count: number | null; error: unknown;
}>) {
  const readAt = (page: number) => {
    const start = (page - 1) * operationPageSize;
    return read(start, start + operationPageSize - 1);
  };
  // Count from the first page so untrusted offsets cannot exceed database limits.
  const first = await readAt(1);
  if (first.error || first.count === null) throw new Error("Daftar operasional belum bisa dimuat.");
  const total = first.count;
  const page = Math.min(requested, Math.max(1, Math.ceil(total / operationPageSize)));
  const result = page === 1 ? first : await readAt(page);
  if (result.error) throw new Error("Daftar operasional belum bisa dimuat.");
  return { rows: result.data ?? [], total, page };
}

export function handoverPage(client: Client, pending: boolean, page: number) {
  return readPageOf<Handover>(page, (start, end) => {
    const query = client.from("inventory_handovers").select("*", { count: "exact" });
    return (pending ? query.eq("status", "pending") : query.neq("status", "pending"))
      .order(pending ? "requested_at" : "resolved_at", { ascending: false }).order("id")
      .range(start, end).returns<Handover[]>();
  });
}

export function staffAssetPage(client: Client, page: number) {
  return readPageOf<StaffAsset>(page, (start, end) => client.from("inventory_staff_assets")
    .select("*", { count: "exact" }).order("code").order("id").range(start, end).returns<StaffAsset[]>());
}

export async function staffAsset(client: Client, id: string) {
  const { data, error } = await client.from("inventory_staff_assets").select("*").eq("id", id).maybeSingle<StaffAsset>();
  if (error) throw new Error("Detail aset belum bisa dimuat.");
  return data;
}

export async function assetPendingHandover(client: Client, id: string) {
  const { data, error } = await client.from("inventory_handovers").select("recipient_name")
    .eq("asset_id", id).eq("status", "pending").maybeSingle<{ recipient_name: string }>();
  if (error) throw new Error("Status pengajuan belum bisa dimuat.");
  return data;
}

async function readOptions(read: (start: number, end: number) => PromiseLike<{ data: Option[] | null; error: unknown }>) {
  const rows: Option[] = [];
  while (true) {
    const { data, error } = await read(rows.length, rows.length + 499);
    if (error) throw new Error("Pilihan serah terima atau ruangan belum bisa dimuat.");
    if (!data?.length) return rows;
    rows.push(...data);
  }
}

export async function assetOperationOptions(client: Client, holderId: string | null, roomId: string) {
  const [recipients, rooms, warehouse] = await Promise.all([
    readOptions((start, end) => {
      const query = client.from("inventory_staff_recipients").select("id,name");
      return (holderId ? query.neq("id", holderId) : query).order("name").order("id").range(start, end);
    }),
    readOptions((start, end) => client.from("rooms").select("id,name").eq("is_active", true)
      .order("name").order("id").range(start, end)),
    client.from("app_settings").select("warehouse_room_id").eq("id", 1).maybeSingle<{ warehouse_room_id: string }>(),
  ]);
  if (warehouse.error) throw new Error("Tujuan pengembalian belum bisa dimuat.");
  return { recipients, rooms: rooms.filter((room) => room.id !== roomId), warehouse: rooms.find((room) => room.id === warehouse.data?.warehouse_room_id) };
}
