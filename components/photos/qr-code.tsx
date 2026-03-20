"use client";

import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  url: string;
  size?: number;
  label?: string;
}

export function QRCode({ url, size = 200, label }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCodeLib.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: {
          dark: "#5D4E37",
          light: "#FFFFFF",
        },
      });
    }
  }, [url, size]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl bg-white p-4 shadow-lg">
        <canvas ref={canvasRef} />
      </div>
      {label && (
        <p className="text-sm text-[#5D4E37] font-medium text-center">
          {label}
        </p>
      )}
    </div>
  );
}
