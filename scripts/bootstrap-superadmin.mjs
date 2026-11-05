import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = process.env.ASSETS_AUTH_DOMAIN?.trim().toLowerCase();
const username = (process.env.ASSETS_BOOTSTRAP_USERNAME ?? "superadmin").trim().toLowerCase();
const name = (process.env.ASSETS_BOOTSTRAP_NAME ?? "Superadmin").trim();
const password = process.env.ASSETS_BOOTSTRAP_PASSWORD;
const minimumPasswordLength = 8;

async function bootstrap() {
  if (!url || !key || !domain || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)) {
    throw new Error("Isi konfigurasi URL Supabase, service role key, dan domain internal.");
  }
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || !name || name.length > 100) {
    throw new Error("Username atau nama tampilan bootstrap tidak valid.");
  }

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const lookup = () => client.from("profiles").select("username").eq("role", "superadmin").maybeSingle();
  const existing = await lookup();
  if (existing.error) throw new Error("Gagal memeriksa profil. Pastikan migrasi sudah diterapkan.");
  if (existing.data) {
    if (existing.data.username !== username) throw new Error("Superadmin sudah tersedia dengan username lain.");
    console.log("Superadmin sudah tersedia.");
    return;
  }
  const warehouse = await client.from("app_settings").select("warehouse_room_id").eq("id", 1).maybeSingle();
  if (warehouse.error || !warehouse.data) throw new Error("Terapkan migrasi Pengaturan dan Akun terlebih dahulu.");
  if (!password || [...password].length < minimumPasswordLength || Buffer.byteLength(password) > 72) {
    throw new Error(`Isi ASSETS_BOOTSTRAP_PASSWORD dengan minimal ${minimumPasswordLength} karakter dan maksimal 72 byte UTF-8.`);
  }

  const { error } = await client.auth.admin.createUser({
    email: `${username}@${domain}`,
    password,
    email_confirm: true,
    app_metadata: { assets_profile: { username, display_name: name, role: "superadmin" } },
  });
  const provisioned = await lookup();
  if (error || provisioned.error || provisioned.data?.username !== username) {
    throw new Error("Bootstrap belum terverifikasi. Periksa migrasi dan akun Auth sebelum mencoba lagi.");
  }
  console.log("Superadmin dibuat. Ganti password sementara pada login pertama.");
}

bootstrap().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
