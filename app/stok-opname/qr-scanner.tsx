"use client";

import { ScanQrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { isId } from "@/lib/inventory";

const prefix = "assets:v1:";

export function StocktakeScanner({ path }: { path: string }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!active || !video.current) return;

    const preview = video.current;
    let disposed = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    function stop() {
      disposed = true;
      clearInterval(timer);
      clearTimeout(timeout);
      stream?.getTracks().forEach((track) => track.stop());
      preview.srcObject = null;
    }

    function fail(reason: string) {
      stop();
      setMessage(reason);
      setActive(false);
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        fail("Kamera memerlukan HTTPS dan browser yang mendukungnya. Gunakan pencarian manual.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const { default: decode } = await import("jsqr");
        if (disposed) return;
        preview.srcObject = stream;
        await preview.play();
        if (disposed) return;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Kamera tidak dapat diproses.");
        setMessage("Arahkan kamera ke label QR aset.");
        timer = setInterval(() => {
          if (!preview.videoWidth || preview.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
          try {
            const scale = Math.min(1, 720 / Math.max(preview.videoWidth, preview.videoHeight));
            const width = Math.round(preview.videoWidth * scale);
            const height = Math.round(preview.videoHeight * scale);
            if (canvas.width !== width || canvas.height !== height) {
              canvas.width = width;
              canvas.height = height;
            }
            context.drawImage(preview, 0, 0, width, height);
            const code = decode(context.getImageData(0, 0, width, height).data, width, height, { inversionAttempts: "dontInvert" })?.data;
            if (!code) return;
            const id = code.startsWith(prefix) ? code.slice(prefix.length).toLowerCase() : "";
            if (!isId(id)) {
              setMessage("QR ini bukan label aset. Coba label lain atau gunakan pencarian manual.");
              return;
            }
            stop();
            setActive(false);
            setMessage("QR terbaca. Membuka pemeriksaan…");
            router.push(`${path}?aset=${id}#pemeriksaan`);
          } catch {
            fail("Pemindaian gagal. Coba lagi atau gunakan pencarian manual.");
          }
        }, 180);
        timeout = setTimeout(() => fail("QR belum terbaca. Coba pindai lagi atau gunakan pencarian manual."), 45000);
      } catch (error) {
        if (disposed) return;
        fail(error instanceof DOMException && error.name === "NotAllowedError"
          ? "Izin kamera ditolak. Izinkan kamera di browser atau gunakan pencarian manual."
          : "Kamera tidak tersedia. Coba lagi atau gunakan pencarian manual.");
      }
    }

    void start();
    return stop;
  }, [active, path, router]);

  return (
    <div className="stocktake-scanner">
      <Button variant="outline" aria-expanded={active} aria-controls="kamera-opname" onClick={() => {
        setActive(!active);
        setMessage(active ? "" : "Menyiapkan kamera…");
      }}>
        <ScanQrCode size={18} aria-hidden="true" /> {active ? "Matikan kamera" : "Pindai QR"}
      </Button>
      <div id="kamera-opname" hidden={!active}>
        {active && <video ref={video} muted playsInline className="stocktake-video" aria-label="Pratinjau kamera pemindai" />}
      </div>
      <p className="muted stocktake-scan-message" role="status">{message}</p>
    </div>
  );
}
