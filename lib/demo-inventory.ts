import type { Asset, AssetEvent, Condition, Filters, Option } from "./inventory";

function demoId(namespace: number, sequence: number) {
  return `a550000${namespace}-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

function options(names: string[], namespace: number): Option[] {
  return names.map((name, index) => ({ id: demoId(namespace, index + 1), name }));
}

export const demoCategories = options(["Perangkat IT", "Furnitur", "Elektronik"], 1);
export const demoRooms = options(["Gudang", "Ruang Finance", "Ruang IT", "Ruang Operasional", "Ruang Rapat"], 2);

type Fixture = [string, string, number, number, string | null, Condition?, boolean?];

const fixtures: Fixture[] = [
  ["000127", "Dell XPS 13", 0, 1, "Nadia Pratama"],
  ["000131", "Monitor Dell P2422H", 0, 1, "Nadia Pratama"],
  ["000142", "Kursi kerja ergonomis", 1, 3, "Bayu Ramadhan", "minor_damage"],
  ["000158", "Printer Brother HL-L2375DW", 0, 0, null, "major_damage"],
  ["000176", "Meja rapat 6 orang", 1, 4, null],
  ["000184", "Proyektor Epson EB-X06", 2, 4, "Maya Putri"],
  ["000208", "ThinkPad T14", 0, 2, "Arif Setiawan"],
  ["000219", "Rak arsip besi", 1, 0, null],
  ["000227", "Monitor LG 24MP400", 0, 3, "Bayu Ramadhan"],
  ["000231", "Scanner Canon LiDE 300", 0, 1, "Nadia Pratama", "minor_damage"],
  ["000240", "Kamera konferensi Logitech", 2, 4, null],
  ["000252", "Laptop Dell Latitude 5420", 0, 2, "Arif Setiawan"],
  ["000266", "UPS APC 650 VA", 2, 0, null, "major_damage", true],
  ["000274", "Lemari dokumen", 1, 3, null],
  ["000285", "Printer Canon PIXMA", 0, 0, null, "major_damage", true],
  ["000293", "Monitor Samsung S24", 0, 1, "Nadia Pratama"],
];

const demoAssets: Asset[] = fixtures.map(
  ([code, name, category, room, holder, condition = "good", archived], index) => ({
    id: demoId(3, index + 1),
    code,
    name,
    category_id: demoCategories[category].id,
    category_name: demoCategories[category].name,
    room_id: demoRooms[room].id,
    room_name: demoRooms[room].name,
    holder_name: holder,
    condition,
    status: archived ? "archived" : "active",
    serial_number: index === 0 ? "00XPS9367" : null,
    brand_model: index === 0 ? "Dell XPS 13 (2018)" : null,
    photo_path: index === 0 ? "dell-xps-13.webp" : null,
    notes: null,
    purchase_date: index === 0 ? "2019-02-18" : null,
    acquisition_cost_idr: index === 0 ? 15250000 : null,
  }),
);

export function matchingDemoAssets(filters: Filters): Asset[] {
  const term = filters.q.toLowerCase();
  return demoAssets.filter((asset) =>
    (!filters.kategori || filters.kategori === asset.category_id) &&
    (!filters.ruangan || filters.ruangan === asset.room_id) &&
    (!filters.kondisi || filters.kondisi === asset.condition) &&
    (!filters.status || filters.status === asset.status) &&
    [asset.code, asset.name, asset.serial_number, asset.holder_name]
      .some((value) => (value ?? "").toLowerCase().includes(term)),
  );
}

export function demoAsset(id: string) {
  return demoAssets.find((asset) => asset.id === id) ?? null;
}

export function demoHistory(asset: Asset): AssetEvent[] {
  const created: AssetEvent = {
    id: `${asset.id}-created`,
    event_type: "created",
    occurred_at: "2026-08-12T02:15:00Z",
    actor_name: "Admin Demo",
    before_state: null,
    after_state: { status: "active" },
    notes: null,
  };
  if (asset.id !== demoAssets[0].id) return [created];
  return [
    {
      ...created, id: `${asset.id}-room`, event_type: "room_moved",
      occurred_at: "2026-10-28T03:24:00Z",
      before_state: { room_name: "Gudang" },
      after_state: { room_name: asset.room_name },
    },
    {
      ...created, id: `${asset.id}-holder`, event_type: "handover_accepted",
      occurred_at: "2026-10-27T08:10:00Z", actor_name: "Nadia Pratama",
      before_state: { holder_name: null },
      after_state: { holder_name: asset.holder_name },
    },
    created,
  ];
}
