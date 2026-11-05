import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function AssetNotFound() {
  return (
    <section className="route-message">
      <h1>Aset tidak ditemukan</h1>
      <p>Cari kembali aset dari daftar inventaris.</p>
      <Link href="/inventaris" className={buttonStyles("outline")}>Buka Inventaris</Link>
    </section>
  );
}
