"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from "react";
import { createAsset } from "@/app/inventaris/actions";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  assetPhotoMaxBytes, assetPhotoMaxMegapixels, assetPhotoMaxMiB, assetPhotoTypes,
  assetTextLimits, type AssetFormFeedback,
} from "@/lib/asset-fields";
import { conditions, type Option } from "@/lib/inventory";

type FieldName = keyof NonNullable<AssetFormFeedback["errors"]>;

function AssetField({ name, label, error, hint, wide, children }: {
  name: FieldName;
  label: string;
  error?: string;
  hint?: string;
  wide?: boolean;
  children: (props: { id: string; name: FieldName; "aria-invalid": true | undefined; "aria-describedby": string | undefined }) => ReactNode;
}) {
  const id = `asset-${name}`;
  const descriptions = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className={`settings-field${wide ? " asset-field-wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, name, "aria-invalid": error ? true : undefined, "aria-describedby": descriptions || undefined })}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && <small className="asset-field-error" id={`${id}-error`} role="alert">{error}</small>}
    </div>
  );
}

export function AssetForm({ categories, rooms }: { categories: Option[]; rooms: Option[] }) {
  const [feedback, submit, pending] = useActionState(createAsset, {});
  const [photoError, setPhotoError] = useState<string>();
  const errors = feedback.errors;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const fields = new FormData(event.currentTarget, submitter);
    const file = fields.get("photo");
    if (file instanceof File && file.name === "" && file.size === 0) {
      // Pengurai multipart server dapat mengubah nama file kosong menjadi "undefined".
      fields.delete("photo");
    } else if (file instanceof File && file.size > assetPhotoMaxBytes) {
      setPhotoError(`Pilih foto berukuran maksimal ${assetPhotoMaxMiB} MiB.`);
      event.currentTarget.querySelector<HTMLInputElement>('input[name="photo"]')?.focus();
      return;
    }
    setPhotoError(undefined);
    startTransition(() => submit(fields));
  }

  return (
    <form action={submit} onSubmit={handleSubmit} className="settings-form settings-panel asset-entry-form" aria-busy={pending}>
      {feedback.message && <p className="settings-error" role="alert">{feedback.message}</p>}
      <fieldset disabled={pending}>
        <legend>Identitas aset</legend>
        <p className="muted">Semua isian di bagian ini wajib diisi.</p>
        <div className="asset-fields">
          <AssetField name="code" label="Kode aset" error={errors?.code} hint="Nol di depan kode tetap disimpan.">
            {(props) => <input {...props} className="asset-code" maxLength={assetTextLimits.code} spellCheck={false} required />}
          </AssetField>
          <AssetField name="name" label="Nama aset" error={errors?.name}>
            {(props) => <input {...props} maxLength={assetTextLimits.name} required />}
          </AssetField>
          <AssetField name="category_id" label="Kategori" error={errors?.category_id}>
            {(props) => <select {...props} defaultValue="" required>
              <option value="" disabled>Pilih kategori</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>}
          </AssetField>
          <AssetField name="room_id" label="Ruangan" error={errors?.room_id}>
            {(props) => <select {...props} defaultValue="" required>
              <option value="" disabled>Pilih ruangan</option>
              {rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>}
          </AssetField>
          <AssetField name="condition" label="Kondisi" error={errors?.condition}>
            {(props) => <select {...props} defaultValue="" required>
              <option value="" disabled>Pilih kondisi</option>
              {Object.entries(conditions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>}
          </AssetField>
        </div>
      </fieldset>

      <fieldset disabled={pending}>
        <legend>Detail tambahan</legend>
        <p className="muted">Isi jika datanya tersedia.</p>
        <div className="asset-fields">
          <AssetField name="brand_model" label="Merek / model" error={errors?.brand_model}>
            {(props) => <input {...props} maxLength={assetTextLimits.brand_model} />}
          </AssetField>
          <AssetField name="serial_number" label="Nomor seri" error={errors?.serial_number}>
            {(props) => <input {...props} maxLength={assetTextLimits.serial_number} spellCheck={false} />}
          </AssetField>
          <AssetField name="purchase_date" label="Tanggal pembelian" error={errors?.purchase_date}>
            {(props) => <input {...props} type="date" min="0001-01-01" max="9999-12-31" />}
          </AssetField>
          <AssetField name="acquisition_cost_idr" label="Harga perolehan (Rp)" error={errors?.acquisition_cost_idr} hint="Masukkan rupiah utuh. Isi 0 jika gratis.">
            {(props) => <input {...props} inputMode="numeric" pattern="[0-9]+" maxLength={19} />}
          </AssetField>
          <AssetField name="notes" label="Catatan" error={errors?.notes} wide>
            {(props) => <textarea {...props} rows={3} maxLength={assetTextLimits.notes} />}
          </AssetField>
          <AssetField name="photo" label="Foto aset (opsional)" error={photoError ?? errors?.photo} wide
            hint={`Satu JPEG, PNG, WebP, atau AVIF. Maksimal ${assetPhotoMaxMiB} MiB dan ${assetPhotoMaxMegapixels} megapiksel. Foto dapat dibuka oleh Admin dan Staf pemegang aset.`}>
            {(props) => <input {...props} type="file" accept={Object.values(assetPhotoTypes).join(",")}
              onChange={() => setPhotoError(undefined)} />}
          </AssetField>
        </div>
      </fieldset>

      <div className="settings-actions asset-entry-actions">
        <Button type="submit" disabled={pending}>Simpan</Button>
        <Button type="submit" name="intent" value="again" variant="outline" disabled={pending}>Simpan dan tambah lagi</Button>
        <Link href="/inventaris" className={buttonStyles("outline")}>Batal</Link>
        {pending && <p className="muted" role="status">Sedang menyimpan…</p>}
      </div>
    </form>
  );
}
