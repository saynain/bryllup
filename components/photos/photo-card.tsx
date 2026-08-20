"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Check, Film } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PhotoMetadata } from "@/lib/storage/types";

interface PhotoCardProps {
  photo: PhotoMetadata;
  onClick: () => void;
  selected?: boolean;
  selectionDisabled?: boolean;
  selectionMode?: boolean;
}

export function PhotoCard({
  photo,
  onClick,
  selected = false,
  selectionDisabled = false,
  selectionMode = false,
}: PhotoCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isVideo = photo.mediaType === "video";
  const mediaLabel = isVideo ? "video" : "bilde";
  const label = selectionMode && selectionDisabled
    ? `${mediaLabel} er ikke klart for nedlasting`
    : selectionMode
    ? `${selected ? "Fjern" : "Velg"} ${mediaLabel}`
    : `Åpne ${mediaLabel}`;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`group relative aspect-square cursor-pointer overflow-hidden bg-[#E8DED0] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B7355] ${
        selected ? "ring-4 ring-inset ring-[#5D4E37]" : ""
      } ${selectionMode && selectionDisabled ? "cursor-not-allowed opacity-60" : ""
      }`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={selectionMode ? selected : undefined}
      aria-disabled={selectionMode && selectionDisabled ? true : undefined}
    >
      {!isLoaded && !hasError && (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
      {hasError || (!photo.thumbnailUrl && isVideo) ? (
        <div className="flex h-full w-full items-center justify-center bg-[#E8DED0] text-[#8B7355]">
          {isVideo ? (
            <Film className="h-6 w-6" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
        </div>
      ) : (
        <img
          src={photo.thumbnailUrl || photo.url}
          alt={isVideo ? "Bryllupsvideo" : "Bryllupsbilde"}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition duration-200 group-hover:scale-[1.03] ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white">
          <div className="rounded-full bg-black/55 p-1.5 shadow-sm">
            <Film className="h-4 w-4" />
          </div>
        </div>
      )}
      {photo.status === "processing" && (
        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5 text-[10px] leading-tight text-white">
          Behandles
        </div>
      )}
      {selectionMode && !selectionDisabled && (
        <div
          className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-sm transition-colors ${
            selected
              ? "border-white bg-[#5D4E37] text-white"
              : "border-white bg-black/35 text-transparent"
          }`}
          aria-hidden="true"
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
    </motion.button>
  );
}
