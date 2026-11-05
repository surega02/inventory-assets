import { ArrowRight, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OperationPagination } from "@/components/operation-pagination";
import { SettingsActionForm } from "@/components/settings/action-form";
import { Button, buttonStyles } from "@/components/ui/button";
import { requireOperationalAccess } from "@/lib/account-access";
import { dateTimeFormat, param, readPage, type Search } from "@/lib/inventory";
import { handoverPage, handoverStatuses, type Handover } from "@/lib/operations";
import { resolveHandover } from "./actions";

export const metadata: Metadata = { title: "Serah Terima" };

const notices = new Map([
  ["diajukan", "Pengajuan dikirim dan menunggu respons penerima."],
  ["accepted", "Pengajuan diterima. Aset sekarang ada di Aset Saya."],
  ["rejected", "Pengajuan ditolak. Pemegang aset tetap sama."],
  ["cancelled", "Pengajuan dibatalkan. Pemegang aset tetap sama."],
]);

function HandoverActions({ id, admin }: { id: string; admin: boolean }) {
  if (admin) return (
    <details className="operation-disclosure">
      <summary>Batalkan pengajuan</summary>
      <p>Pengajuan akan ditutup. Penerima tidak dapat merespons setelah pembatalan.</p>
      <SettingsActionForm action={resolveHandover.bind(null, id, "cancelled")}>
        <Button type="submit" variant="outline">Konfirmasi batal</Button>
      </SettingsActionForm>
    </details>
  );
  return (
    <div className="handover-actions">
      <details className="operation-disclosure">
        <summary>Terima aset</summary>
        <p>Konfirmasi setelah aset diterima. Aset akan tercatat atas nama Anda.</p>
        <SettingsActionForm action={resolveHandover.bind(null, id, "accepted")}>
          <Button type="submit">Konfirmasi terima</Button>
        </SettingsActionForm>
      </details>
      <details className="operation-disclosure">
        <summary>Tolak pengajuan</summary>
        <SettingsActionForm action={resolveHandover.bind(null, id, "rejected")}>
          <label className="settings-field">Alasan penolakan
            <textarea name="reason" rows={3} required maxLength={500} />
          </label>
          <Button type="submit" variant="outline">Kirim penolakan</Button>
        </SettingsActionForm>
      </details>
    </div>
  );
}

function HandoverRow({ item, admin }: { item: Handover; admin: boolean }) {
  const time = item.resolved_at ?? item.requested_at;
  return (
    <li className="operation-row">
      <div className="operation-row-heading">
        <div>
          <p className="asset-code">{item.asset_code}</p>
          <h3>{admin ? <Link href={`/inventaris/${item.asset_id}`}>{item.asset_name} <ArrowRight size={16} aria-hidden="true" /></Link> : item.asset_name}</h3>
        </div>
        <span className={`handover-status handover-${item.status}`}>{handoverStatuses[item.status]}</span>
      </div>
      <p className="muted">
        {admin && <><strong>{item.recipient_name}</strong><span aria-hidden="true"> · </span></>}
        <time dateTime={time}>{dateTimeFormat.format(new Date(time))} WIB</time>
      </p>
      {item.rejection_reason && <p className="handover-reason"><strong>Alasan penolakan</strong>{item.rejection_reason}</p>}
      {item.status === "pending" && <HandoverActions id={item.id} admin={admin} />}
    </li>
  );
}

export default async function HandoverIndex({ searchParams }: { searchParams: Promise<Search> }) {
  const [access, query] = await Promise.all([requireOperationalAccess(), searchParams]);
  const admin = access.role === "admin";
  const history = param(query.tab) === "riwayat";
  const { rows, page, total } = await handoverPage(access.client, !history, readPage(query));
  const notice = notices.get(param(query.hasil));
  return (
    <div className="operation-page">
      <div className="page-intro">
        <div><h1>Serah Terima</h1><p>{admin ? "Pantau pengajuan dan respons penerima." : "Tinjau pengajuan aset yang ditujukan kepada Anda."}</p></div>
        {admin && <Link href="/inventaris?status=active" className={buttonStyles("outline")}>Pilih aset di Inventaris <ArrowRight size={16} aria-hidden="true" /></Link>}
      </div>
      {notice && <p className="settings-notice" role="status">{notice}{!admin && param(query.hasil) === "accepted" && <> <Link href="/aset-saya">Buka Aset Saya</Link></>}</p>}
      <nav className="settings-tabs operation-tabs" aria-label="Status pengajuan">
        <Link href="/serah-terima" aria-current={!history ? "page" : undefined}>Menunggu</Link>
        <Link href="/serah-terima?tab=riwayat" aria-current={history ? "page" : undefined}>Riwayat</Link>
      </nav>
      {rows.length ? (
        <section className="index-section" aria-labelledby="handover-list-title">
          <div className="index-heading"><h2 id="handover-list-title">{history ? "Pengajuan selesai" : "Pengajuan menunggu"}</h2><p>{total.toLocaleString("id-ID")} pengajuan</p></div>
          <ul className="operation-list">{rows.map((item) => <HandoverRow key={item.id} item={item} admin={admin} />)}</ul>
          <OperationPagination path="/serah-terima" history={history} page={page} total={total} />
        </section>
      ) : (
        <section className="empty-state">
          <Inbox size={28} aria-hidden="true" />
          <h2>{history ? "Belum ada riwayat pengajuan" : "Belum ada pengajuan menunggu"}</h2>
          <p>{history ? "Pengajuan yang sudah selesai akan tampil di sini." : admin ? "Buka detail aset aktif untuk mengirim pengajuan." : "Pengajuan baru akan muncul di halaman ini."}</p>
        </section>
      )}
    </div>
  );
}
