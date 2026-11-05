import { ChevronDown, Search, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { conditions, statuses, type Filters, type Option } from "@/lib/inventory";

function FilterSelect({ label, name, value, all, options }: {
  label: string;
  name: string;
  value: string;
  all: string;
  options: Option[];
}) {
  return (
    <label className="filter-field">
      {label}
      <span className="select-shell">
        <select name={name} defaultValue={value}>
          <option value="">{all}</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </span>
    </label>
  );
}

export function FilterForm({ filters, categories, rooms }: {
  filters: Filters;
  categories: Option[];
  rooms: Option[];
}) {
  const active = Object.values(filters).some(Boolean);
  return (
    <form action="/inventaris" method="get" role="search" aria-label="Pencarian dan filter aset" className="filter-form">
      <div className="search-row">
        <label className="search-field">
          <span className="sr-only">Cari aset</span>
          <Search size={19} strokeWidth={1.7} aria-hidden="true" />
          <input type="search" name="q" placeholder="Cari kode atau nama"
            aria-describedby="search-help"
            defaultValue={filters.q} maxLength={120} />
        </label>
        <Button type="submit">Terapkan</Button>
      </div>
      <p className="search-help" id="search-help">Nomor seri dan pemegang juga bisa dicari.</p>
      <div className="filters-row">
        <FilterSelect label="Kategori" name="kategori" value={filters.kategori} all="Semua kategori" options={categories} />
        <FilterSelect label="Ruangan" name="ruangan" value={filters.ruangan} all="Semua ruangan" options={rooms} />
        <FilterSelect label="Kondisi" name="kondisi" value={filters.kondisi} all="Semua kondisi"
          options={Object.entries(conditions).map(([id, name]) => ({ id, name }))} />
        <FilterSelect label="Status" name="status" value={filters.status} all="Semua status"
          options={Object.entries(statuses).map(([id, name]) => ({ id, name }))} />
        {active && <Link href="/inventaris" className="reset-link"><X size={15} aria-hidden="true" /> Reset filter</Link>}
      </div>
    </form>
  );
}
