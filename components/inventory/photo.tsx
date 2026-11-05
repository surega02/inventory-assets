"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function AssetPhoto({ src, name, demo = false, eager = false }: {
  src: string | null;
  name: string;
  demo?: boolean;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const visible = src && !failed;
  return (
    <figure className="asset-figure">
      <div className="photo-mount">
        <div className="photo-mat">
          {visible ? (
            <Image fill unoptimized src={src} alt={`Foto ${name}`} loading={eager ? "eager" : "lazy"}
              onError={() => setFailed(true)} />
          ) : (
            <div className="photo-empty">
              <ImageOff size={23} strokeWidth={1.4} aria-hidden="true" />
              <span>{failed ? "Foto tidak dapat dimuat" : "Belum ada foto"}</span>
            </div>
          )}
        </div>
      </div>
      <figcaption>{visible && demo ? "Foto contoh" : "Foto aset"}</figcaption>
    </figure>
  );
}
