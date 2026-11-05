"use client";

import { Button } from "@/components/ui/button";

export default function InventoryError({ reset }: { reset: () => void }) {
  return (
    <section className="route-message" role="alert">
      <h1>Inventaris gagal dimuat</h1>
      <p>Coba lagi. Jika masalah berlanjut, hubungi pengelola aplikasi.</p>
      <Button variant="outline" onClick={reset}>Coba lagi</Button>
    </section>
  );
}
