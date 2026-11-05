import { DoorOpen, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SettingsActionForm } from "@/components/settings/action-form";
import { Button, buttonStyles } from "@/components/ui/button";
import { requireSuperadmin, type AccountRole } from "@/lib/account-access";
import { PASSWORD_MIN_LENGTH } from "@/lib/account-fields";
import { param, type Search } from "@/lib/inventory";
import { createAccount, disableAccount, resetAccount, saveMaster, setWarehouse } from "./actions";

export const metadata: Metadata = { title: "Pengaturan dan Akun" };

const tabs = { akun: "Akun", kategori: "Kategori", ruangan: "Ruangan" } as const;
type Tab = keyof typeof tabs;
type Master = { id: string; name: string; is_active: boolean };
type Account = { id: string; username: string; display_name: string; role: AccountRole; is_active: boolean; must_change_password: boolean };
const roles: Record<AccountRole, string> = { superadmin: "Superadmin", admin: "Admin", staff: "Staf" };
const notices = new Map([
  ["akun-dibuat", "Akun berhasil dibuat. Bagikan password sementara melalui kanal internal."],
  ["password-direset", "Password sementara ditetapkan. Sesi lama sudah dicabut."],
  ["akun-nonaktif", "Akun dinonaktifkan dan sesi lama sudah dicabut."],
  ["master-disimpan", "Data berhasil disimpan."],
  ["gudang-disimpan", "Ruangan Gudang berhasil diperbarui."],
]);

function settingsHref(tab: Tab, action?: string, id?: string) {
  const query = new URLSearchParams({ tab });
  if (action) query.set("aksi", action);
  if (id) query.set("id", id);
  return `/pengaturan?${query}${action ? "#tindakan" : ""}`;
}

async function allRows<T>(batch: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  while (true) {
    const { data, error } = await batch(rows.length, rows.length + 199);
    if (error) throw new Error("Pengaturan gagal dimuat.");
    if (!data?.length) return rows;
    rows.push(...data);
  }
}

function Status({ active, pending = false }: { active: boolean; pending?: boolean }) {
  const label = !active ? "Nonaktif" : pending ? "Perlu ganti password" : "Aktif";
  return <span className={`asset-status${active && !pending ? "" : " status-archived"}`}>{label}</span>;
}

function ActionPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section id="tindakan" className="settings-panel" aria-labelledby="action-title" tabIndex={-1}>
      <h2 id="action-title">{title}</h2>
      {children}
    </section>
  );
}

function ActionButtons({ tab, label }: { tab: Tab; label: string }) {
  return (
    <div className="settings-actions">
      <Button type="submit">{label}</Button>
      <Link href={settingsHref(tab)} className={buttonStyles("outline")}>Batal</Link>
    </div>
  );
}

function TemporaryPassword() {
  return (
    <label className="settings-field">
      Password sementara
      <input name="password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={72} required />
      <small>Minimal {PASSWORD_MIN_LENGTH} karakter. Pengguna akan menggantinya saat masuk.</small>
    </label>
  );
}

function AccountAction({ mode, account, adminExists }: { mode: string; account?: Account; adminExists: boolean }) {
  if (mode === "tambah") {
    return (
      <ActionPanel title="Tambah akun">
        <SettingsActionForm action={createAccount}>
          <label className="settings-field">Nama tampilan<input name="name" maxLength={100} required /></label>
          <label className="settings-field">
            Username<input name="username" autoComplete="off" minLength={3} maxLength={32} required />
            <small>Gunakan 3–32 karakter. Username dipakai saat masuk.</small>
          </label>
          <label className="settings-field">Peran
            <select name="role" defaultValue="" required>
              <option value="" disabled>Pilih peran</option>
              <option value="admin" disabled={adminExists}>Admin</option>
              <option value="staff">Staf</option>
            </select>
            {adminExists && <small>Satu Admin sudah aktif.</small>}
          </label>
          <TemporaryPassword />
          <ActionButtons tab="akun" label="Buat akun" />
        </SettingsActionForm>
      </ActionPanel>
    );
  }
  if (!account?.is_active || account.role === "superadmin") return null;
  if (mode === "reset" || mode === "nonaktifkan") {
    const reset = mode === "reset";
    return (
      <ActionPanel title={reset ? "Reset password" : "Nonaktifkan akun"}>
        <p><strong>{account.display_name}</strong> <span className="asset-code">{account.username}</span></p>
        <p className="muted">{reset
          ? "Sesi lama akan dicabut. Pengguna harus masuk dengan password sementara lalu menggantinya."
          : "Sesi lama akan dicabut dan akun ini kehilangan akses aplikasi."}</p>
        <SettingsActionForm action={reset ? resetAccount : disableAccount}>
          <input type="hidden" name="id" value={account.id} />
          {reset && <TemporaryPassword />}
          <ActionButtons tab="akun" label={reset ? "Tetapkan password sementara" : "Nonaktifkan akun"} />
        </SettingsActionForm>
      </ActionPanel>
    );
  }
  return null;
}

function Accounts({ accounts, mode, selected }: { accounts: Account[]; mode: string; selected: string }) {
  const panel = AccountAction({ mode, account: accounts.find((account) => account.id === selected), adminExists: accounts.some((account) => account.role === "admin" && account.is_active) });
  return (
    <div className={panel ? "settings-grid" : undefined}>
      {panel}
      <section className="index-section" aria-labelledby="settings-list">
        <div className="settings-list-heading">
          <div><h2 id="settings-list">Daftar akun</h2><p>{accounts.length} akun</p></div>
          <Link href={settingsHref("akun", "tambah")} className={buttonStyles("primary")}><Plus size={16} aria-hidden="true" /> Tambah akun</Link>
        </div>
        <ul className="settings-rows">
          {accounts.map((account) => (
            <li key={account.id} data-selected={account.id === selected || undefined}>
              <div className="settings-identity">
                <strong>{account.display_name}</strong>
                <span className="asset-code">{account.username}</span>
              </div>
              <div className="settings-labels"><span>{roles[account.role]}</span><Status active={account.is_active} pending={account.must_change_password} /></div>
              {account.role !== "superadmin" && account.is_active && (
                <div className="settings-row-actions">
                  <Link href={settingsHref("akun", "reset", account.id)} aria-label={`Reset password ${account.username}`}>Reset password</Link>
                  <Link href={settingsHref("akun", "nonaktifkan", account.id)} aria-label={`Nonaktifkan ${account.username}`}>Nonaktifkan</Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Warehouse({ records, warehouseId }: { records: Master[]; warehouseId: string }) {
  const current = records.find((record) => record.id === warehouseId);
  const activeRooms = records.filter((room) => room.is_active);
  return (
    <section className="warehouse-panel" aria-labelledby="warehouse-title">
      <div>
        <h2 id="warehouse-title"><DoorOpen size={20} strokeWidth={1.6} aria-hidden="true" /> Gudang</h2>
        <p>Tujuan pengembalian aset saat ini <strong>{current?.name ?? "Belum ditetapkan"}</strong></p>
      </div>
      <SettingsActionForm key={warehouseId} action={setWarehouse}>
        <div className="warehouse-fields">
          <label className="settings-field">Ruangan Gudang
            <select name="room" defaultValue={warehouseId} required>
              <option value="" disabled>Pilih ruangan aktif</option>
              {activeRooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </label>
          <Button type="submit" variant="outline" disabled={!activeRooms.length}>Tetapkan Gudang</Button>
        </div>
      </SettingsActionForm>
    </section>
  );
}

function MasterList({ tab, records, mode, selected, warehouseId }: {
  tab: "kategori" | "ruangan"; records: Master[]; mode: string; selected: string; warehouseId: string;
}) {
  const current = mode === "ubah" ? records.find((record) => record.id === selected) : undefined;
  const editing = mode === "tambah" || Boolean(current);
  const singular = tab === "kategori" ? "kategori" : "ruangan";
  return (
    <>
      {tab === "ruangan" && <Warehouse records={records} warehouseId={warehouseId} />}
      <div className={editing ? "settings-grid" : undefined}>
        {editing && (
          <ActionPanel title={current ? `Ubah ${singular}` : `Tambah ${singular}`}>
            <SettingsActionForm key={current?.id ?? "baru"} action={saveMaster}>
              <input type="hidden" name="kind" value={tab === "kategori" ? "categories" : "rooms"} />
              <input type="hidden" name="id" value={current?.id ?? ""} />
              <label className="settings-field">Nama {singular}<input name="name" defaultValue={current?.name} maxLength={100} required /></label>
              {current ? (
                <label className="settings-field">Status
                  <select name="active" defaultValue={String(current.is_active)}>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </label>
              ) : <input type="hidden" name="active" value="true" />}
              <ActionButtons tab={tab} label="Simpan" />
            </SettingsActionForm>
          </ActionPanel>
        )}
        <section className="index-section" aria-labelledby="settings-list">
          <div className="settings-list-heading">
            <div><h2 id="settings-list">Daftar {singular}</h2><p>{records.length} {singular}</p></div>
            <Link href={settingsHref(tab, "tambah")} className={buttonStyles("primary")}><Plus size={16} aria-hidden="true" /> Tambah {singular}</Link>
          </div>
          {records.length ? (
            <ul className="settings-rows">
              {records.map((record) => (
                <li key={record.id} data-selected={record.id === selected || undefined}>
                  <div className="settings-identity"><strong>{record.name}</strong></div>
                  <div className="settings-labels">
                    <Status active={record.is_active} />
                    {record.id === warehouseId && <span className="demo-tag">Gudang</span>}
                  </div>
                  <div className="settings-row-actions"><Link href={settingsHref(tab, "ubah", record.id)} aria-label={`Ubah ${record.name}`}>Ubah</Link></div>
                </li>
              ))}
            </ul>
          ) : <p className="settings-empty">Belum ada {singular}. Tambahkan data agar tersedia di inventaris.</p>}
        </section>
      </div>
    </>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ client }, query] = await Promise.all([requireSuperadmin(), searchParams]);
  const section = param(query.tab);
  const tab: Tab = section === "kategori" || section === "ruangan" ? section : "akun";
  const mode = param(query.aksi);
  const selected = param(query.id);
  const notice = notices.get(param(query.hasil));
  let content: ReactNode;
  if (tab === "akun") {
    const accounts = await allRows<Account>((start, end) =>
      client.from("assets_settings_accounts").select("id,username,display_name,role,is_active,must_change_password")
        .order("display_name").order("id").range(start, end),
    );
    content = <Accounts key={`${mode}:${selected}`} accounts={accounts} mode={mode} selected={selected} />;
  } else {
    const [records, settings] = await Promise.all([
      allRows<Master>((start, end) => client.from(tab === "kategori" ? "categories" : "rooms")
        .select("id,name,is_active").order("name").order("id").range(start, end)),
      tab === "ruangan" ? client.from("app_settings").select("warehouse_room_id").eq("id", 1).single() : null,
    ]);
    if (settings?.error) throw new Error("Penetapan Gudang gagal dimuat.");
    content = <MasterList tab={tab} records={records} mode={mode} selected={selected} warehouseId={settings?.data?.warehouse_room_id ?? ""} />;
  }
  return (
    <>
      <div className="page-intro">
        <div><h1>Pengaturan dan Akun</h1><p>Kelola akses pengguna dan data master aset.</p></div>
      </div>
      <nav className="settings-tabs" aria-label="Bagian pengaturan">
        {Object.entries(tabs).map(([key, label]) => (
          <Link key={key} href={settingsHref(key as Tab)} aria-current={tab === key ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {notice && <p className="settings-notice" role="status">{notice}</p>}
      {content}
    </>
  );
}
