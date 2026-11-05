import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { operationPageSize } from "@/lib/operations";

export function OperationPagination({ page, total, path, history = false }: {
  page: number;
  total: number;
  path: "/aset-saya" | "/serah-terima";
  history?: boolean;
}) {
  const last = Math.ceil(total / operationPageSize);
  if (last < 2) return null;
  function href(target: number) {
    const query = new URLSearchParams({ halaman: String(target) });
    if (history) query.set("tab", "riwayat");
    return `${path}?${query}`;
  }
  return (
    <div className="index-footer">
      <nav aria-label="Halaman daftar" className="pagination">
        {page > 1 ? <Link className="icon-button" href={href(page - 1)} aria-label="Halaman sebelumnya"><ChevronLeft size={17} aria-hidden="true" /></Link>
          : <span className="icon-button" aria-hidden="true"><ChevronLeft size={17} /></span>}
        <span>{page} / {last}</span>
        {page < last ? <Link className="icon-button" href={href(page + 1)} aria-label="Halaman berikutnya"><ChevronRight size={17} aria-hidden="true" /></Link>
          : <span className="icon-button" aria-hidden="true"><ChevronRight size={17} /></span>}
      </nav>
    </div>
  );
}
