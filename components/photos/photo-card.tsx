"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import type { PhotoMetadata } from "@/lib/storage/types";

interface PhotoCardProps {
  photo: PhotoMetadata;
  onClick: () => void;
}

export function PhotoCard({ photo, onClick }: PhotoCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative mb-4 break-inside-avoid cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative overflow-hidden rounded-lg bg-[#E8DED0]">
        {!isLoaded && !hasError && (
          <Skeleton className="absolute inset-0 aspect-square" />
        )}
        {hasError ? (
          <div className="flex items-center justify-center aspect-square bg-[#E8DED0] text-[#8B7355]">
            <span className="text-sm">Kunne ikke laste bilde</span>
          </div>
        ) : (
          <Image
            src={photo.thumbnailUrl || photo.url}
            alt={photo.uploadedBy ? `Bilde fra ${photo.uploadedBy}` : "Bryllupsbilde"}
            width={400}
            height={400}
            className={`w-full h-auto object-cover transition-all duration-300 group-hover:scale-105 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      </div>
      {photo.uploadedBy && (
        <p className="mt-2 text-xs text-[#8B7355] truncate">
          Fra {photo.uploadedBy}
        </p>
      )}
    </motion.div>
  );
}
