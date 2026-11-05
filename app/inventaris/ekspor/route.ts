import ExcelJS from "exceljs";
import { conditions, readFilters, statuses, type Search } from "@/lib/inventory";
import { inventoryAccess } from "@/lib/inventory-access";
import { exportAssets } from "@/lib/inventory-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await inventoryAccess();
  if (access.kind !== "admin" && access.kind !== "demo") {
    const status = access.kind === "anonymous" ? 401 : access.kind === "denied" ? 403 : 503;
    return Response.json({ error: "Ekspor inventaris tidak tersedia." }, { status });
  }
  const params = new URL(request.url).searchParams;
  const query: Search = {};
  for (const key of ["q", "kategori", "ruangan", "kondisi", "status"]) {
    const values = params.getAll(key);
    query[key] = values.length === 1 ? values[0] : undefined;
  }

  try {
    const assets = await exportAssets(access, readFilters(query));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inventaris", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
      { header: "Kode", width: 16, style: { numFmt: "@" } },
      { header: "Nama aset", width: 32 },
      { header: "Kategori", width: 22 },
      { header: "Ruangan", width: 24 },
      { header: "Pemegang", width: 24 },
      { header: "Kondisi", width: 18 },
      { header: "Status", width: 16 },
      { header: "Nomor seri", width: 22, style: { numFmt: "@" } },
      { header: "Merek / model", width: 26 },
      { header: "Tanggal pembelian", width: 22, style: { numFmt: "dd/mm/yyyy" } },
      { header: "Harga perolehan (IDR)", width: 25, style: { numFmt: "#,##0" } },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF222127" } };
    sheet.autoFilter = "A1:K1";

    for (const asset of assets) {
      const cost = asset.acquisition_cost_idr;
      sheet.addRow([
        asset.code, asset.name, asset.category_name, asset.room_name, asset.holder_name ?? "",
        conditions[asset.condition], statuses[asset.status], asset.serial_number ?? "", asset.brand_model ?? "",
        asset.purchase_date ? new Date(asset.purchase_date) : null,
        cost !== null && Number.isSafeInteger(Number(cost)) ? Number(cost) : cost,
      ]);
    }

    const file = new Uint8Array(await workbook.xlsx.writeBuffer());
    return new Response(file, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="inventaris-aset.xlsx"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Ekspor inventaris gagal. Coba lagi." }, { status: 503 });
  }
}
