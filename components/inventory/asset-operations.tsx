import { randomUUID } from "node:crypto";
import Link from "next/link";
import { moveAsset, requestHandover } from "@/app/serah-terima/actions";
import { SettingsActionForm } from "@/components/settings/action-form";
import { Button } from "@/components/ui/button";
import type { InventoryAccess } from "@/lib/inventory-access";
import type { Asset } from "@/lib/inventory";
import { assetOperationOptions } from "@/lib/operations";

export async function AssetOperations({ client, asset, pending }: {
  client: Extract<InventoryAccess, { kind: "admin" }>["client"];
  asset: Asset;
  pending: { recipient_name: string } | null;
}) {
  if (asset.status !== "active" || !asset.updated_at) return null;
  if (pending) return (
    <section className="settings-panel asset-operations" id="kelola-aset" aria-labelledby="asset-operations-title">
      <h2 id="asset-operations-title">Kelola aset</h2>
      <p>Menunggu respons dari <strong>{pending.recipient_name}</strong>. Selesaikan pengajuan untuk memindahkan, mengembalikan, atau mengarsipkan aset.</p>
      <Link className="operation-link" href="/serah-terima">Lihat pengajuan</Link>
    </section>
  );

  const { recipients, rooms, warehouse } = await assetOperationOptions(client, asset.holder_id ?? null, asset.room_id);
  const request = requestHandover.bind(null, asset.id, asset.updated_at, randomUUID());
  const move = moveAsset.bind(null, asset.id, asset.updated_at, "move", null);
  const returnAsset = moveAsset.bind(null, asset.id, asset.updated_at, "return", warehouse?.id ?? null);
  return (
    <section className="settings-panel asset-operations" id="kelola-aset" aria-labelledby="asset-operations-title">
      <h2 id="asset-operations-title">Kelola aset</h2>
      <details className="operation-disclosure">
        <summary>Ajukan serah terima</summary>
        {recipients.length ? (
          <SettingsActionForm action={request}>
            <label className="settings-field">Penerima
              <select name="recipient" defaultValue="" required>
                <option value="" disabled>Pilih Staf</option>
                {recipients.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
              <small>Pemegang berubah setelah penerima menyetujui pengajuan.</small>
            </label>
            <Button type="submit">Kirim pengajuan</Button>
          </SettingsActionForm>
        ) : <p className="muted">Belum ada Staf aktif lain yang bisa menerima aset ini.</p>}
      </details>
      <details className="operation-disclosure">
        <summary>Mutasi ruangan</summary>
        {rooms.length ? (
          <SettingsActionForm action={move}>
            <label className="settings-field">Ruangan tujuan
              <select name="room" defaultValue="" required>
                <option value="" disabled>Pilih ruangan</option>
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
              </select>
              <small>Ruangan saat ini {asset.room_name}. Pemegang aset tetap sama.</small>
            </label>
            <Button type="submit">Simpan mutasi</Button>
          </SettingsActionForm>
        ) : <p className="muted">Belum ada ruangan aktif lain.</p>}
      </details>
      {asset.holder_id && (
        <details className="operation-disclosure">
          <summary>Kembalikan ke Gudang</summary>
          {warehouse ? (
            <>
              <p>Konfirmasi setelah aset diterima secara fisik. Pemegang akan dikosongkan dan aset dicatat di <strong>{warehouse.name}</strong>.</p>
              <SettingsActionForm action={returnAsset}><Button type="submit">Konfirmasi pengembalian</Button></SettingsActionForm>
            </>
          ) : <p className="muted">Minta Superadmin menetapkan ruangan Gudang.</p>}
        </details>
      )}
    </section>
  );
}
