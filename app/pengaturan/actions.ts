"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/account-access";
import { normalizeUsername, PASSWORD_MIN_LENGTH, usernamePattern, validPassword } from "@/lib/account-fields";
import { isId } from "@/lib/inventory";
import { authOperator, internalEmail } from "@/lib/supabase-operator";

type Feedback = { message?: string };
const passwordMessage = `Gunakan minimal ${PASSWORD_MIN_LENGTH} karakter dan maksimal 72 byte untuk password sementara.`;

function readName(form: FormData) {
  const value = form.get("name");
  return typeof value === "string" ? value.trim() : "";
}

const messages: Record<string, string> = {
  account_missing: "Akun tidak ditemukan. Buka kembali daftar akun.",
  account_holds_assets: "Selesaikan pengembalian aset yang masih dipegang sebelum menonaktifkan akun ini.",
  account_pending_handover: "Selesaikan pengajuan serah terima yang menunggu sebelum menonaktifkan akun ini.",
  master_missing: "Data ini tidak ditemukan. Buka kembali daftar.",
  warehouse_must_stay_active: "Pindahkan penetapan Gudang ke ruangan aktif lain terlebih dahulu.",
  room_has_active_assets: "Pindahkan aset aktif dari ruangan ini sebelum menonaktifkannya.",
  room_has_open_stocktake: "Tutup sesi stok opname sebelum menonaktifkan ruangan ini.",
  warehouse_room_inactive: "Pilih ruangan yang masih aktif.",
};

function failure(error: { code: string; message: string }): Feedback {
  if (error.code === "23505") return { message: "Nama ini sudah dipakai. Masukkan nama lain." };
  return { message: messages[error.message] ?? "Perubahan belum tersimpan. Coba lagi." };
}

export async function createAccount(_previous: Feedback, form: FormData): Promise<Feedback> {
  const { client } = await requireSuperadmin();
  const username = normalizeUsername(form.get("username"));
  const name = readName(form);
  const role = form.get("role");
  const password = form.get("password");
  if (!usernamePattern.test(username)) return { message: "Username harus 3–32 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung." };
  if (!name || name.length > 100) return { message: "Masukkan nama tampilan hingga 100 karakter." };
  if (role !== "admin" && role !== "staff") return { message: "Pilih peran Admin atau Staf." };
  if (!validPassword(password)) return { message: passwordMessage };
  const operator = authOperator();
  const email = internalEmail(username);
  if (!operator || !email) return { message: "Konfigurasi pengelolaan akun belum lengkap. Hubungi pengelola aplikasi." };

  const [duplicate, activeAdmin] = await Promise.all([
    client.from("assets_settings_accounts").select("id").eq("username", username).maybeSingle(),
    role === "admin" ? client.from("assets_settings_accounts").select("id").eq("role", "admin").eq("is_active", true).maybeSingle() : null,
  ]);
  if (duplicate.error || activeAdmin?.error) return { message: "Gagal memeriksa akun. Coba lagi." };
  if (duplicate.data) return { message: "Username sudah digunakan. Pilih username lain." };
  if (activeAdmin?.data) return { message: "Sudah ada satu Admin aktif. Nonaktifkan Admin itu sebelum membuat penggantinya." };

  const { error } = await operator.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { assets_profile: { username, display_name: name, role } },
  });
  if (error) {
    if (error.code === "email_exists" || error.code === "user_already_exists") {
      return { message: "Username sudah digunakan. Pilih username lain." };
    }
    return { message: "Akun belum bisa dibuat. Periksa kembali daftar akun atau coba lagi." };
  }
  redirect("/pengaturan?hasil=akun-dibuat");
}

export async function resetAccount(_previous: Feedback, form: FormData): Promise<Feedback> {
  const { client } = await requireSuperadmin();
  const id = String(form.get("id") ?? "");
  const password = form.get("password");
  if (!isId(id) || !validPassword(password)) {
    return { message: passwordMessage };
  }
  const { data, error } = await client.from("assets_settings_accounts").select("id").eq("id", id)
    .in("role", ["admin", "staff"]).eq("is_active", true).maybeSingle();
  if (error || !data) return { message: "Reset hanya tersedia untuk akun Admin atau Staf yang aktif." };
  const operator = authOperator();
  if (!operator) return { message: "Konfigurasi pengelolaan akun belum lengkap. Hubungi pengelola aplikasi." };
  const result = await operator.auth.admin.updateUserById(id, {
    password, app_metadata: { assets_reset: randomUUID() },
  });
  if (result.error) return { message: "Password belum bisa direset. Periksa status akun lalu coba lagi." };
  redirect("/pengaturan?hasil=password-direset");
}

export async function disableAccount(_previous: Feedback, form: FormData): Promise<Feedback> {
  const { client } = await requireSuperadmin();
  const id = String(form.get("id") ?? "");
  if (!isId(id)) return { message: messages.account_missing };
  const { error } = await client.rpc("assets_disable_account", { account_id: id });
  if (error) return failure(error);
  redirect("/pengaturan?hasil=akun-nonaktif");
}

export async function saveMaster(_previous: Feedback, form: FormData): Promise<Feedback> {
  const { client } = await requireSuperadmin();
  const kind = form.get("kind");
  const id = String(form.get("id") ?? "");
  const name = readName(form);
  const active = form.get("active");
  if ((kind !== "categories" && kind !== "rooms") || (id && !isId(id))) {
    return { message: "Pilih data yang valid." };
  }
  if (!name || name.length > 100 || (active !== "true" && active !== "false")) {
    return { message: "Masukkan nama hingga 100 karakter dan pilih status." };
  }
  const { error } = await client.rpc("assets_save_master", {
    master_kind: kind, record_id: id || null, record_name: name, active: active === "true",
  });
  if (error) return failure(error);
  redirect(`/pengaturan?tab=${kind === "categories" ? "kategori" : "ruangan"}&hasil=master-disimpan`);
}

export async function setWarehouse(_previous: Feedback, form: FormData): Promise<Feedback> {
  const { client } = await requireSuperadmin();
  const id = String(form.get("room") ?? "");
  if (!isId(id)) return { message: "Pilih ruangan aktif untuk Gudang." };
  const { error } = await client.rpc("assets_set_warehouse", { room_id: id });
  if (error) return failure(error);
  redirect("/pengaturan?tab=ruangan&hasil=gudang-disimpan");
}
