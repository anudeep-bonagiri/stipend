"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QR({ text, size = 112 }: { text: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { QRCode.toDataURL(text, { width: size, margin: 1, color: { dark: "#f2f4f2", light: "#0d120f" } }).then(setSrc).catch(() => setSrc(null)); }, [text, size]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} width={size} height={size} alt="QR code to the receipt on Solana Explorer" style={{ borderRadius: 10, border: "1px solid var(--line)" }} /> : <div style={{ width: size, height: size }} />;
}
