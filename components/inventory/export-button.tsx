"use client";

import { Download } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { inventoryHref, type Filters } from "@/lib/inventory";

export function ExportButton({ filters, disabled }: { filters: Filters; disabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const action = "/inventaris/ekspor";

  async function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(inventoryHref(action, filters));
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError("Akses berakhir. Masuk kembali untuk mengekspor inventaris.");
          return;
        }
        throw new Error("Ekspor gagal");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "inventaris-aset.xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setError("Ekspor gagal. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="export-control" action={action} method="get" onSubmit={download}>
      {Object.entries(filters).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <Button type="submit" variant="outline" disabled={disabled || pending}>
        <Download size={17} aria-hidden="true" />
        {pending ? "Menyiapkan Excel…" : "Ekspor Excel"}
      </Button>
      {error && <p className="export-error" role="alert">{error}</p>}
    </form>
  );
}
