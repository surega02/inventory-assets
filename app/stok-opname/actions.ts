"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalAccess } from "@/lib/account-access";
import { conditions, isId } from "@/lib/inventory";

const messages: Record<string, string> = {
  stocktake_forbidden: "Akses Anda sudah berubah. Masuk kembali untuk melanjutkan.",
  stocktake_room_inactive: "Pilih ruangan yang masih aktif.",
  stocktake_session_missing: "Sesi ini tidak ditemukan.",
  stocktake_session_closed: "Sesi sudah ditutup. Muat ulang halaman untuk melihat hasilnya.",
  stocktake_asset_missing: "Aset ini tidak ditemukan atau sudah diarsipkan.",
  stocktake_result_invalid: "Pilih kondisi fisik dan batasi catatan hingga 500 karakter.",
  stocktake_item_changed: "Hasil pemeriksaan sudah berubah. Muat ulang halaman dan periksa hasil terbaru.",
  stocktake_review_changed: "Daftar aset yang belum diperiksa sudah berubah. Muat ulang halaman untuk meninjau daftar terbaru.",
};

function failure(code: string) {
  return { message: messages[code] ?? "Perubahan belum bisa disimpan. Coba lagi." };
}

export async function openStocktake(_previous: unknown, form: FormData) {
  const { client } = await requireOperationalAccess("admin");
  const room = form.get("ruangan");
  if (typeof room !== "string" || !isId(room)) return failure("stocktake_room_inactive");
  const { data, error } = await client.rpc("stocktake_open", { target_room: room });
  if (error || typeof data !== "string" || !isId(data)) return failure(error?.message ?? "");
  revalidatePath("/stok-opname");
  redirect(`/stok-opname/${data}`);
}

export async function confirmStocktake(id: string, assetId: string, checkedAt: string | null, _previous: unknown, form: FormData) {
  const { client } = await requireOperationalAccess("admin");
  const condition = form.get("kondisi");
  const notes = form.get("catatan");
  if (!isId(id) || !isId(assetId)) return failure("stocktake_asset_missing");
  if (typeof condition !== "string" || !Object.hasOwn(conditions, condition) ||
    typeof notes !== "string" || [...notes.trim()].length > 500 || notes.includes("\0")) {
    return failure("stocktake_result_invalid");
  }
  const { error } = await client.rpc("stocktake_confirm", {
    target_session: id, target_asset: assetId, physical_condition: condition,
    observation_notes: notes.trim(), expected_checked_at: checkedAt,
  });
  if (error) return failure(error.message);
  revalidatePath(`/stok-opname/${id}`);
  redirect(`/stok-opname/${id}?hasil=disimpan`);
}

export async function closeStocktake(id: string, _previous: unknown, form: FormData) {
  const { client } = await requireOperationalAccess("admin");
  if (!isId(id)) return failure("stocktake_session_missing");
  if (form.get("konfirmasi") !== "ya") return { message: "Centang konfirmasi untuk menutup sesi." };
  const unchecked = form.getAll("belum-diperiksa");
  if (!unchecked.every((value): value is string => typeof value === "string" && isId(value))) {
    return failure("stocktake_review_changed");
  }
  const { error } = await client.rpc("stocktake_close", { target_session: id, confirmed_unchecked: unchecked });
  if (error) return failure(error.message);
  revalidatePath("/stok-opname");
  revalidatePath(`/stok-opname/${id}`);
  redirect(`/stok-opname/${id}?hasil=ditutup`);
}
