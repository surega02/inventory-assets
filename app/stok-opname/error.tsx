"use client";

import { Button } from "@/components/ui/button";

export default function StocktakeError({ reset }: { reset: () => void }) {
  return (
    <section className="route-message" role="alert">
      <h1>Stok opname belum bisa dimuat</h1>
      <p>Coba muat ulang untuk mengambil data sesi terbaru.</p>
      <Button onClick={reset}>Muat ulang</Button>
    </section>
  );
}
