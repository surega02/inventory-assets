import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export function StocktakePagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages < 2) return null;
  return (
    <nav className="index-footer pagination stocktake-pagination" aria-label="Halaman hasil">
      {page > 1 && <Link href={href(page - 1)} className="icon-button" aria-label="Halaman sebelumnya"><ChevronLeft size={18} aria-hidden="true" /></Link>}
      <span>Halaman {page} dari {pages}</span>
      {page < pages && <Link href={href(page + 1)} className="icon-button" aria-label="Halaman berikutnya"><ChevronRight size={18} aria-hidden="true" /></Link>}
    </nav>
  );
}
