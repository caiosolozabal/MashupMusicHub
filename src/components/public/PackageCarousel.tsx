
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

export function PackageCarousel({
  images,
  intervalMs = 15000,
  alt,
}: {
  images: string[];
  intervalMs?: number;
  alt: string;
}) {
  const safeImages = useMemo(() => images?.filter(Boolean) ?? [], [images]);
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (safeImages.length <= 1) return;

    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % safeImages.length);
        setFade(true);
      }, 300);
    }, intervalMs);

    return () => clearInterval(t);
  }, [safeImages.length, intervalMs]);

  const src = safeImages[index] ?? safeImages[0] ?? "https://picsum.photos/seed/mashup/800/600";

  return (
    <div className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl bg-black/20">
      <div className={`transition-opacity duration-500 h-full w-full ${fade ? "opacity-100" : "opacity-0"}`}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
          priority={false}
          unoptimized
        />
      </div>
      <div className="absolute inset-0 bg-black/35" />
    </div>
  );
}
