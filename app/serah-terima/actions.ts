"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalAccess } from "@/lib/account-access";
import { isId } from "@/lib/inventory";

const messages: Record<string, string> = {
  asset_missing: "Aset ini tidak ditemukan.",
  asset_inactive: "Tindakan ini hanya tersedia untuk aset aktif.",
  asset_changed: "Data aset sudah berubah. Muat ulang detail dan periksa kondisi terbaru.",
  asset_pending_handover: "Selesaikan atau batalkan pengajuan yang masih menunggu sebelum melanjutkan.",
  handover_recipient_invalid: "Pilih Staf aktif yang berbeda dari pemegang saat ini.",
  handover_missing: "Pengajuan ini tidak ditemukan.",
  handover_resolved: "Pengajuan sudah selesai. Muat ulang halaman untuk melihat hasilnya.",
  handover_reason_invalid: "Masukkan alasan penolakan antara 1 dan 500 karakter.",
  asset_not_held: "Aset ini tidak memiliki pemegang aktif.",
  warehouse_settings_missing: "Minta Superadmin menetapkan ruangan Gudang sebelum mencatat pengembalian.",
  warehouse_changed: "Ruangan Gudang sudah berubah. Muat ulang halaman dan periksa tujuan pengembalian.",
  asset_same_room: "Pilih ruangan yang berbeda dari ruangan saat ini.",
  asset_room_inactive: "Ruangan ini tidak aktif. Pilih ruangan lain.",
  inventory_forbidden: "Akses Anda sudah berubah. Masuk kembali untuk melanjutkan.",
};

function failed(message: string) {
  return { message: messages[message] ?? "Perubahan belum bisa disimpan. Muat ulang halaman dan coba lagi." };
}

function refreshOperations() {
  revalidatePath("/inventaris", "layout");
  revalidatePath("/serah-terima");
  revalidatePath("/aset-saya", "layout");
}

export async function requestHandover(assetId: string, updatedAt: string, requestId: string, _previous: unknown, form: FormData) {
  const { client } = await requireOperationalAccess("admin");
  const recipient = form.get("recipient");
  if (!isId(assetId) || !isId(requestId)) return failed("asset_missing");
  if (typeof recipient !== "string" || !isId(recipient)) return failed("handover_recipient_invalid");
  const { error } = await client.rpc("inventory_request_handover", {
    request_id: requestId, target_asset: assetId, recipient, expected_updated_at: updatedAt,
  });
  if (error) return failed(error.message);
  refreshOperations();
  redirect("/serah-terima?hasil=diajukan");
}

export async function resolveHandover(requestId: string, decision: "accepted" | "rejected" | "cancelled", _previous: unknown, form: FormData) {
  const { client } = await requireOperationalAccess(decision === "cancelled" ? "admin" : "staff");
  if (!isId(requestId)) return failed("handover_missing");
  const value = form.get("reason");
  const reason = typeof value === "string" ? value.trim() : "";
  if (decision === "rejected" && (!reason || [...reason].length > 500 || reason.includes("\0"))) {
    return failed("handover_reason_invalid");
  }
  const { error } = await client.rpc("inventory_resolve_handover", {
    request_id: requestId, decision, reason: decision === "rejected" ? reason : null,
  });
  if (error) return failed(error.message);
  refreshOperations();
  redirect(`/serah-terima?tab=riwayat&hasil=${decision}`);
}

export async function moveAsset(assetId: string, updatedAt: string, operation: "move" | "return", warehouseId: string | null, _previous: unknown, form: FormData) {
  const { client } = await requireOperationalAccess("admin");
  if (!isId(assetId)) return failed("asset_missing");
  const room = form.get("room");
  if (operation === "move" && (typeof room !== "string" || !isId(room))) return failed("asset_room_inactive");
  if (operation === "return" && (!warehouseId || !isId(warehouseId))) return failed("warehouse_settings_missing");
  const { error } = await client.rpc("inventory_move_asset", {
    target_asset: assetId, destination: operation === "return" ? null : room, expected_updated_at: updatedAt,
    expected_warehouse: warehouseId,
  });
  if (error) return failed(error.message);
  refreshOperations();
  redirect(`/inventaris/${assetId}?hasil=${operation === "return" ? "dikembalikan" : "dipindahkan"}`);
}
