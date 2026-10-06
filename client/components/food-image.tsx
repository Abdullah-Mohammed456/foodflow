"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

export function FoodImage({ src, alt, fallback = "/media/menu/combo.jpg", ...props }: ImageProps & { fallback?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const requested = typeof src === "string" ? src : "";
  const image = failed === requested ? fallback : src;
  return <Image {...props} alt={alt} src={image} unoptimized={typeof image === "string" && /^https?:/.test(image)} onError={() => { if (failed !== requested) setFailed(requested); }}/>;
}
