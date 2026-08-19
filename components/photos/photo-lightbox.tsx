"use client";

import { useEffect, useCallback, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PhotoMetadata } from "@/lib/storage/types";

interface PhotoLightboxProps {
  photo: PhotoMetadata;
  photos: PhotoMetadata[];
  onClose: () => void;
  onNavigate: (photo: PhotoMetadata) => void;
}

const preloadedMediaUrls = new Set<string>();
const mediaPreloadsInFlight = new Map<string, HTMLImageElement>();

function preloadMediaImage(url: string) {
  if (preloadedMediaUrls.has(url) || mediaPreloadsInFlight.has(url)) {
    return;
  }

  const image = new window.Image();
  image.decoding = "async";
  image.fetchPriority = "low";
  mediaPreloadsInFlight.set(url, image);

  image.onload = () => {
    preloadedMediaUrls.add(url);
    mediaPreloadsInFlight.delete(url);
  };
  image.onerror = () => mediaPreloadsInFlight.delete(url);
  image.src = url;
}

export function PhotoLightbox({
  photo,
  photos,
  onClose,
  onNavigate,
}: PhotoLightboxProps) {
  const currentIndex = photos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;
  const isVideo = photo.mediaType === "video";
  const useStreamEmbed =
    isVideo &&
    (photo.url.includes("iframe.videodelivery.net") ||
      photo.url.includes("cloudflarestream.com"));
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const didSwipeRef = useRef(false);

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(photos[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, photos, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(photos[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, photos, onNavigate]);

  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = photo.downloadUrl || photo.url;
    link.download = photo.originalName || photo.filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [photo]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (isInteractiveSwipeTarget(event.target)) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    didSwipeRef.current = false;
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;

      if (!start || event.changedTouches.length === 0) {
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      const isHorizontalSwipe = Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35;

      if (!isHorizontalSwipe) {
        return;
      }

      didSwipeRef.current = true;
      if (deltaX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    },
    [handlePrev, handleNext]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, handlePrev, handleNext]);

  useEffect(() => {
    const saveData = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection?.saveData;
    const neighborOffsets = saveData ? [1] : [1, 2, -1];

    for (const offset of neighborOffsets) {
      const neighbor = photos[currentIndex + offset];
      if (!neighbor) {
        continue;
      }

      const preloadUrl =
        neighbor.mediaType === "video"
          ? neighbor.thumbnailUrl
          : neighbor.previewUrl || neighbor.url;

      if (preloadUrl) {
        preloadMediaImage(preloadUrl);
      }
    }
  }, [currentIndex, photos]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pb-6 sm:pt-5"
        onClick={() => {
          if (didSwipeRef.current) {
            didSwipeRef.current = false;
            return;
          }
          onClose();
        }}
      >
        <div
          className="relative z-20 mb-2 flex h-11 shrink-0 items-center justify-between gap-3 text-white sm:mb-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="min-w-0 text-xs text-white/70">
            {currentIndex + 1} av {photos.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Last ned"
              className="h-11 w-11 rounded-full bg-black/45 text-white shadow-sm ring-1 ring-white/15 hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Lukk"
              className="h-11 w-11 rounded-full bg-black/45 text-white shadow-sm ring-1 ring-white/15 hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Previous button */}
        {hasPrev && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Forrige"
            className="absolute left-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-black/35 text-white shadow-sm ring-1 ring-white/10 hover:bg-white/20 sm:inline-flex"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {/* Next button */}
        {hasNext && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Neste"
            className="absolute right-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-black/35 text-white shadow-sm ring-1 ring-white/10 hover:bg-white/20 sm:inline-flex"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {/* Media */}
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.98, x: 12 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.98, x: -12 }}
            transition={{ duration: 0.18 }}
            className="relative flex max-h-full max-w-full items-center justify-center"
            style={{ touchAction: "pan-y" }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()}
          >
            {isVideo ? (
              useStreamEmbed ? (
                <StreamPlayer photo={photo} />
              ) : (
                <video
                  src={photo.url}
                  poster={photo.thumbnailUrl}
                  controls
                  preload="metadata"
                  playsInline
                  className="max-h-[calc(100dvh-8rem)] max-w-[94vw] rounded-md bg-black sm:max-h-[calc(100dvh-9rem)]"
                />
              )
            ) : (
              <Image
                src={photo.previewUrl || photo.url}
                alt={photo.uploadedBy ? `Bilde fra ${photo.uploadedBy}` : "Bryllupsbilde"}
                width={1200}
                height={800}
                className="max-h-[calc(100dvh-8rem)] max-w-[94vw] object-contain sm:max-h-[calc(100dvh-9rem)]"
                unoptimized
                priority
              />
            )}
          </motion.div>
        </div>

        {/* Navigation controls */}
        <div
          className="mt-2 shrink-0 text-white sm:mt-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Forrige"
              disabled={!hasPrev}
              className="h-11 min-w-28 rounded-full bg-black/45 px-4 text-white shadow-sm ring-1 ring-white/15 hover:bg-white/20 disabled:opacity-30"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-5 w-5" />
              Forrige
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Neste"
              disabled={!hasNext}
              className="h-11 min-w-28 rounded-full bg-black/45 px-4 text-white shadow-sm ring-1 ring-white/15 hover:bg-white/20 disabled:opacity-30"
              onClick={handleNext}
            >
              Neste
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function StreamPlayer({ photo }: { photo: PhotoMetadata }) {
  const [isReady, setIsReady] = useState(false);

  return (
    <div className="relative aspect-video max-h-[calc(100dvh-8rem)] w-[94vw] max-w-5xl overflow-hidden rounded-md bg-black sm:max-h-[calc(100dvh-9rem)]">
      {photo.thumbnailUrl && (
        <Image
          src={photo.thumbnailUrl}
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 640px) 94vw, 1024px"
          className={`object-cover transition-opacity duration-200 ${
            isReady ? "opacity-0" : "opacity-70"
          }`}
          unoptimized
        />
      )}
      {!isReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-white">
          <LoaderCircle className="h-8 w-8 animate-spin drop-shadow" aria-hidden="true" />
          <span className="sr-only">Laster video</span>
        </div>
      )}
      <iframe
        src={photo.url}
        title={photo.uploadedBy ? `Video fra ${photo.uploadedBy}` : "Bryllupsvideo"}
        className={`absolute inset-0 h-full w-full bg-black transition-opacity duration-200 ${
          isReady ? "opacity-100" : "opacity-0"
        }`}
        loading="eager"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        onLoad={() => setIsReady(true)}
      />
    </div>
  );
}

function isInteractiveSwipeTarget(target: EventTarget): boolean {
  return target instanceof Element && Boolean(target.closest("button, a, iframe"));
}
