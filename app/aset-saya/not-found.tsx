import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function StaffAssetNotFound() {
  return (
    <section className="route-message">
      <h1>Aset tidak ditemukan</h1>
      <p>Periksa daftar aset yang masih tercatat atas nama Anda.</p>
      <Link href="/aset-saya" className={buttonStyles("outline")}>Kembali ke Aset Saya</Link>
    </section>
  );
}
