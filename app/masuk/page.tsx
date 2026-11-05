import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand, Copyright } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { accountAccess, accountDestination } from "@/lib/account-access";
import { param, type Search } from "@/lib/inventory";
import { signIn, signOut } from "./actions";

export const metadata: Metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [access, query] = await Promise.all([accountAccess(), searchParams]);
  if (access.kind === "demo") redirect("/inventaris");
  if (access.kind === "signed-in") {
    const destination = accountDestination(access);
    if (destination !== "/masuk") redirect(destination);
  }

  const status = param(query.status);
  const unavailable = access.kind === "unavailable" || status === "unavailable";
  const message = unavailable ? "Koneksi inventaris belum tersedia. Hubungi pengelola aplikasi."
    : access.kind === "denied" || status === "denied" ? "Akun ini belum dapat mengakses aplikasi. Hubungi pengelola aplikasi."
    : status === "invalid" ? "Username atau password tidak sesuai." : "";

  return (
    <main className="sign-in">
      <Brand />
      <section className="sign-in-panel">
        <h1>Masuk</h1>
        <p>{access.kind === "signed-in" ? "Anda masuk sebagai Staf. Akses operasional mengikuti peran akun Anda." : "Gunakan username dan password kantor."}</p>
        {status === "password-changed" && <p role="status" className="settings-notice">Password berhasil diganti. Masuk dengan password baru.</p>}
        {message && <p role="alert" className="form-error">{message}</p>}
        {access.kind === "signed-in" ? (
          <form action={signOut} className="sign-in-form"><Button type="submit" variant="outline">Keluar</Button></form>
        ) : !unavailable && (
          <form action={signIn} className="sign-in-form">
            <label>Username<input name="username" autoComplete="username" required maxLength={32} /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
            <Button type="submit">Masuk</Button>
          </form>
        )}
      </section>
      <Copyright />
    </main>
  );
}
