import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/app/masuk/actions";
import { Brand, Copyright } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { accountAccess, accountDestination } from "@/lib/account-access";
import { PASSWORD_MIN_LENGTH } from "@/lib/account-fields";
import { param, type Search } from "@/lib/inventory";
import { changeTemporaryPassword } from "./actions";

export const metadata: Metadata = { title: "Ganti password" };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [access, query] = await Promise.all([accountAccess(), searchParams]);
  if (access.kind === "demo") redirect("/inventaris");
  if (access.kind !== "signed-in") redirect("/masuk");
  if (!access.needsPassword) redirect(accountDestination(access));
  const status = param(query.status);
  const message = status === "incorrect" ? "Password sementara tidak sesuai. Coba lagi."
    : status === "invalid" ? `Gunakan password baru minimal ${PASSWORD_MIN_LENGTH} karakter, maksimal 72 byte, lalu ulangi dengan tepat.`
    : status === "unavailable" ? "Password belum bisa diganti. Coba lagi atau hubungi pengelola aplikasi." : "";

  return (
    <main className="sign-in">
      <Brand href="/masuk" />
      <section className="sign-in-panel">
        <h1>Ganti password</h1>
        <p>Buat password baru untuk akun <strong>{access.username}</strong> sebelum melanjutkan.</p>
        {message && <p role="alert" className="form-error">{message}</p>}
        <form action={changeTemporaryPassword} className="sign-in-form">
          <label>Password sementara<input name="current" type="password" autoComplete="current-password" required /></label>
          <label>Password baru<input name="password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={72} required /></label>
          <label>Ulangi password baru<input name="confirmation" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={72} required /></label>
          <Button type="submit">Ganti password</Button>
        </form>
        <form action={signOut} className="sign-in-form">
          <Button type="submit" variant="outline">Keluar</Button>
        </form>
      </section>
      <Copyright />
    </main>
  );
}
