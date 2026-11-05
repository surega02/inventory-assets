import ExcelJS from "exceljs";
import { inventoryAccess } from "@/lib/inventory-access";
import { conditions, dateTimeFormat, isId } from "@/lib/inventory";
import { stocktakeDetail, stocktakeDifferences, stocktakeOrigins, stocktakeResults, stocktakeStatuses } from "@/lib/stocktake";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [access, { id }] = await Promise.all([inventoryAccess(), params]);
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (access.kind !== "admin") {
    const status = access.kind === "anonymous" ? 401 : access.kind === "unavailable" ? 503 : 403;
    return Response.json({ error: "Ekspor stok opname tidak tersedia." }, { status, headers });
  }
  if (!isId(id)) return Response.json({ error: "Sesi tidak ditemukan." }, { status: 404, headers });

  try {
    const session = await stocktakeDetail(access.client, id);
    if (!session) return Response.json({ error: "Sesi tidak ditemukan." }, { status: 404, headers });

    const workbook = new ExcelJS.Workbook();
    const summary = workbook.addWorksheet("Sesi");
    summary.getColumn(1).width = 25;
    summary.getColumn(2).width = 44;
    summary.addRows([
      ["ID sesi", session.id],
      ["Ruangan", session.room_name_snapshot],
      ["Status", stocktakeStatuses[session.status]],
      ["Dibuka (WIB)", dateTimeFormat.format(new Date(session.opened_at))],
      ["Ditutup (WIB)", session.closed_at ? dateTimeFormat.format(new Date(session.closed_at)) : null],
    ]);
    summary.getColumn(1).font = { bold: true };

    const sheet = workbook.addWorksheet("Hasil pemeriksaan", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
      { header: "Kode", width: 18, style: { numFmt: "@" } },
      { header: "Nama aset", width: 32 },
      { header: "Asal", width: 20 },
      { header: "Ruangan tercatat", width: 24 },
      { header: "Kondisi tercatat", width: 22 },
      { header: "Hasil", width: 22 },
      { header: "Ruangan fisik", width: 24 },
      { header: "Kondisi fisik", width: 20 },
      { header: "Selisih", width: 34 },
      { header: "Diperiksa (WIB)", width: 25 },
      { header: "Catatan", width: 45 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF222127" } };
    sheet.autoFilter = "A1:K1";

    for (const item of session.items) {
      sheet.addRow([
        item.asset_code_snapshot, item.asset_name_snapshot, stocktakeOrigins[item.origin], item.recorded_room_name,
        conditions[item.recorded_condition], stocktakeResults[item.result],
        item.result === "found" ? session.room_name_snapshot : null,
        item.observed_condition ? conditions[item.observed_condition] : null,
        stocktakeDifferences(session.room_id, item).join(", "),
        item.checked_at ? dateTimeFormat.format(new Date(item.checked_at)) : null, item.notes,
      ]);
    }

    return new Response(new Uint8Array(await workbook.xlsx.writeBuffer()), {
      headers: {
        ...headers,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="stok-opname-${session.id}.xlsx"`,
      },
    });
  } catch {
    return Response.json({ error: "Ekspor stok opname gagal. Coba lagi." }, { status: 503, headers });
  }
}
