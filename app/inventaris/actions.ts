"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import {
  assetPhotoBucket, assetPhotoMaxBytes, assetPhotoMaxMegapixels, assetPhotoMaxMiB, assetPhotoTypes,
  assetTextLimits, type AssetFormFeedback,
} from "@/lib/asset-fields";
import { conditions, inventoryHref, isId, readFilters, readPage } from "@/lib/inventory";
import { requireInventoryAccess } from "@/lib/inventory-access";
import { authOperator } from "@/lib/supabase-operator";

function textValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

async function readPhoto(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const image = sharp(bytes, { limitInputPixels: assetPhotoMaxMegapixels * 1_000_000 });
  const { format, compression } = await image.metadata();
  const extension = format === "heif" && compression === "av1" ? "avif" : format;
  if (!Object.hasOwn(assetPhotoTypes, extension)) return null;
  await image.stats();
  return { bytes, extension: extension as keyof typeof assetPhotoTypes };
}

export async function createAsset(_previous: AssetFormFeedback, form: FormData): Promise<AssetFormFeedback> {
  const access = await requireInventoryAccess();
  if (access.kind !== "admin") return { message: "Masuk sebagai Admin untuk menambahkan aset." };

  const values = {
    code: textValue(form, "code"),
    name: textValue(form, "name"),
    serial_number: textValue(form, "serial_number"),
    brand_model: textValue(form, "brand_model"),
    notes: textValue(form, "notes"),
  };
  const category = textValue(form, "category_id");
  const room = textValue(form, "room_id");
  const condition = textValue(form, "condition");
  const date = textValue(form, "purchase_date");
  const cost = textValue(form, "acquisition_cost_idr");
  const files = form.getAll("photo");
  const file = files[0];
  const errors: NonNullable<AssetFormFeedback["errors"]> = {};

  for (const key of Object.keys(values) as (keyof typeof values)[]) {
    if (values[key].includes("\0")) errors[key] = "Hapus karakter yang tidak valid.";
    else if (values[key].length > assetTextLimits[key]) errors[key] = `Gunakan maksimal ${assetTextLimits[key]} karakter.`;
  }
  if (!values.code) errors.code = "Masukkan kode aset dari daftar inventaris.";
  if (!values.name) errors.name = "Masukkan nama aset.";
  if (!isId(category)) errors.category_id = "Pilih kategori aktif.";
  if (!isId(room)) errors.room_id = "Pilih ruangan aktif.";
  if (!Object.hasOwn(conditions, condition)) errors.condition = "Pilih kondisi fisik aset.";
  if (date && !validDate(date)) errors.purchase_date = "Masukkan tanggal pembelian yang valid.";
  if (cost && (!/^\d{1,19}$/.test(cost) || BigInt(cost) > 9_223_372_036_854_775_807n)) {
    errors.acquisition_cost_idr = "Masukkan harga dalam rupiah utuh, dari 0 hingga 9.223.372.036.854.775.807.";
  }
  if (files.length > 1 || (file !== undefined && !(file instanceof File))) {
    errors.photo = "Pilih satu file foto.";
  } else if (file instanceof File && file.size > assetPhotoMaxBytes) {
    errors.photo = `Pilih foto berukuran maksimal ${assetPhotoMaxMiB} MiB.`;
  } else if (file instanceof File && file.name && !file.size) {
    errors.photo = "File foto kosong. Pilih foto lain.";
  }
  if (Object.keys(errors).length) return { errors };

  const id = randomUUID();
  const hasPhoto = file instanceof File && file.size > 0;
  const storage = hasPhoto ? authOperator()?.storage.from(assetPhotoBucket) : undefined;
  let photoKey: string | null = null;

  async function removeUnlinkedPhoto() {
    if (!storage || !photoKey) return;
    const result = await storage.remove([photoKey]);
    if (result.error) console.error("Gagal membersihkan foto inventaris yang belum terhubung.");
  }

  if (hasPhoto) {
    if (!storage) return { errors: { photo: "Unggah foto belum tersedia. Hubungi pengelola aplikasi." } };
    const photo = await readPhoto(file).catch(() => null);
    if (!photo) return { errors: { photo: `Pilih JPEG, PNG, WebP, atau AVIF yang dapat dibuka, maksimal ${assetPhotoMaxMegapixels} megapiksel.` } };

    photoKey = `${id}.${photo.extension}`;
    const upload = await storage.upload(photoKey, photo.bytes, { contentType: assetPhotoTypes[photo.extension], upsert: false });
    if (upload.error) {
      await removeUnlinkedPhoto();
      return { errors: { photo: "Foto belum terunggah. Coba lagi atau pilih foto lain." } };
    }
  }

  const { error } = await access.client.rpc("inventory_create_asset", {
    asset_id: id, asset_code: values.code, asset_name: values.name, category, room,
    physical_condition: condition, serial: values.serial_number || null, model: values.brand_model || null,
    asset_notes: values.notes || null, purchased_on: date || null, cost_idr: cost ? BigInt(cost).toString() : null,
    photo_key: photoKey,
  });
  if (error) {
    if (error.code === "P0001" || error.code === "42501" || error.code === "23505" || error.code === "PGRST202") {
      await removeUnlinkedPhoto();
      switch (error.message) {
        case "asset_code_taken": return { errors: { code: "Kode ini sudah dipakai. Periksa kode aset di daftar inventaris." } };
        case "asset_category_inactive": return { errors: { category_id: "Kategori ini tidak aktif. Muat ulang halaman untuk memilih kategori lain." } };
        case "asset_room_inactive": return { errors: { room_id: "Ruangan ini tidak aktif. Muat ulang halaman untuk memilih ruangan lain." } };
        case "asset_photo_missing": return { errors: { photo: "Foto belum tersimpan. Coba unggah lagi." } };
        default: return { message: "Aset belum tersimpan. Periksa isian lalu coba lagi." };
      }
    }

    // A lost response can follow a commit. Keep the photo unless rollback is known.
    const { data } = await access.client.from("assets").select("id").eq("id", id).maybeSingle();
    if (!data) return { message: "Penyimpanan belum bisa dipastikan. Periksa kode aset di daftar sebelum mencoba lagi." };
  }

  revalidatePath("/inventaris");
  redirect(form.get("intent") === "again" ? `/inventaris/tambah?ditambahkan=${id}` : `/inventaris/${id}?hasil=ditambahkan`);
}

export async function archiveAsset(id: string, _previous: { message?: string }, form: FormData) {
  const access = await requireInventoryAccess();
  if (access.kind !== "admin") return { message: "Masuk sebagai Admin untuk mengarsipkan aset." };
  if (!isId(id)) return { message: "Aset tidak ditemukan. Buka kembali daftar aset." };

  const { error } = await access.client.rpc("inventory_archive_asset", { asset_id: id });
  if (error) {
    switch (error.message) {
      case "asset_missing": return { message: "Aset tidak ditemukan. Buka kembali daftar aset." };
      case "asset_has_holder": return { message: "Catat pengembalian aset sebelum mengarsipkannya." };
      case "asset_pending_handover": return { message: "Selesaikan atau batalkan pengajuan serah terima yang masih menunggu." };
      default: return { message: "Aset belum bisa diarsipkan. Muat ulang detail lalu coba lagi." };
    }
  }

  const query = {
    q: textValue(form, "q"), kategori: textValue(form, "kategori"), ruangan: textValue(form, "ruangan"),
    kondisi: textValue(form, "kondisi"), status: textValue(form, "status"), halaman: textValue(form, "halaman"),
  };
  const href = inventoryHref(`/inventaris/${id}`, readFilters(query), readPage(query));
  revalidatePath("/inventaris");
  revalidatePath(`/inventaris/${id}`);
  redirect(`${href}${href.includes("?") ? "&" : "?"}hasil=diarsipkan`);
}
