"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { motion } from "framer-motion";
import { Film } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PhotoMetadata } from "@/lib/storage/types";

interface PhotoCardProps {
  photo: PhotoMetadata;
  onClick: () => void;
}

export function PhotoCard({ photo, onClick }: PhotoCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isVideo = photo.mediaType === "video";

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
        {hasError || (!photo.thumbnailUrl && isVideo) ? (
          <div className="flex items-center justify-center aspect-square bg-[#E8DED0] text-[#8B7355]">
            {isVideo ? (
              <div className="flex flex-col items-center gap-2 text-sm">
                <Film className="h-7 w-7" />
                <span>Video</span>
              </div>
            ) : (
              <span className="text-sm">Kunne ikke laste bilde</span>
            )}
          </div>
        ) : (
          <img
            src={photo.thumbnailUrl || photo.url}
            alt="Bryllupsbilde"
            loading="lazy"
            decoding="async"
            className={`w-full h-auto object-cover transition-all duration-300 group-hover:scale-105 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        )}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white">
            <div className="rounded-full bg-black/50 p-3">
              <Film className="h-6 w-6" />
            </div>
          </div>
        )}
        {photo.status === "processing" && (
          <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
            Behandles
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      </div>
    </motion.div>
  );
}
