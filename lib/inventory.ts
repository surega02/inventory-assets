export const conditions = {
  good: "Baik",
  minor_damage: "Rusak Ringan",
  major_damage: "Rusak Berat",
} as const;

export const statuses = { active: "Aktif", archived: "Diarsipkan" } as const;

export const eventLabels = {
  created: "Aset dicatat",
  handover_accepted: "Serah terima diterima",
  returned: "Aset dikembalikan",
  room_moved: "Ruangan dipindahkan",
  condition_changed: "Kondisi diperbarui",
  archived: "Aset diarsipkan",
} as const;

export type Condition = keyof typeof conditions;
export type AssetStatus = keyof typeof statuses;
export type Asset = {
  id: string;
  code: string;
  name: string;
  category_id: string;
  category_name: string;
  room_id: string;
  room_name: string;
  holder_name: string | null;
  condition: Condition;
  status: AssetStatus;
  serial_number: string | null;
  brand_model: string | null;
  photo_path: string | null;
  notes: string | null;
  purchase_date: string | null;
  acquisition_cost_idr: number | string | null;
  holder_id?: string | null;
  updated_at?: string;
};

type Snapshot = {
  room_name?: string | null;
  holder_name?: string | null;
  condition?: Condition;
  status?: AssetStatus;
};

export type AssetEvent = {
  id: string;
  event_type: keyof typeof eventLabels;
  occurred_at: string;
  actor_name: string;
  before_state: Snapshot | null;
  after_state: Snapshot;
  notes: string | null;
};

export type Option = { id: string; name: string };
export type Search = Record<string, string | string[] | undefined>;
export type Filters = {
  q: string;
  kategori: string;
  ruangan: string;
  kondisi: Condition | "";
  status: AssetStatus | "";
};

export const pageSize = 8;

export function isId(value: string): boolean {
  return /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value);
}

export function param(value: Search[string]): string {
  return typeof value === "string" ? value : "";
}

export function readFilters(query: Search): Filters {
  const kategori = param(query.kategori);
  const ruangan = param(query.ruangan);
  const kondisi = param(query.kondisi);
  const status = param(query.status);
  return {
    q: param(query.q).trim().slice(0, 120).replace(/\u0000/g, ""),
    kategori: isId(kategori) ? kategori : "",
    ruangan: isId(ruangan) ? ruangan : "",
    kondisi: Object.hasOwn(conditions, kondisi) ? kondisi as Condition : "",
    status: Object.hasOwn(statuses, status) ? status as AssetStatus : "",
  };
}

export function readPage(query: Search): number {
  const page = Number(param(query.halaman));
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function inventoryHref(
  path: string,
  filters: Filters,
  page = 1,
  selected?: string,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value);
  }
  if (page > 1) query.set("halaman", String(page));
  if (selected) query.set("aset", selected);
  return query.size ? `${path}?${query}` : path;
}

export const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
});

export const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium", timeZone: "Asia/Jakarta",
});

export const dateTimeFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
});
