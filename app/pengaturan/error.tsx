"use client";

import { Button } from "@/components/ui/button";

export default function SettingsError({ reset }: { reset: () => void }) {
  return (
    <section className="route-message" role="alert">
      <h1>Pengaturan gagal dimuat</h1>
      <p>Coba lagi untuk membuka daftar pengaturan.</p>
      <Button onClick={reset} variant="outline">Coba lagi</Button>
    </section>
  );
}
