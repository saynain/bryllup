"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PhotoMetadata } from "@/lib/storage/types";

interface PhotoLightboxProps {
  photo: PhotoMetadata;
  photos: PhotoMetadata[];
  onClose: () => void;
  onNavigate: (photo: PhotoMetadata) => void;
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
    link.href = photo.url;
    link.download = photo.originalName || photo.filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [photo]);

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        onClick={onClose}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Download button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-16 z-10 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
        >
          <Download className="h-5 w-5" />
        </Button>

        {/* Previous button */}
        {hasPrev && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 z-10 text-white hover:bg-white/20 h-12 w-12"
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
            className="absolute right-4 z-10 text-white hover:bg-white/20 h-12 w-12"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        {/* Image */}
        <motion.div
          key={photo.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative max-h-[90vh] max-w-[90vw]"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={photo.url}
            alt={photo.uploadedBy ? `Bilde fra ${photo.uploadedBy}` : "Bryllupsbilde"}
            width={1200}
            height={800}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            unoptimized
          />
        </motion.div>

        {/* Photo info */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-white">
          {photo.uploadedBy && (
            <p className="text-sm opacity-80">Fra {photo.uploadedBy}</p>
          )}
          <p className="text-xs opacity-60">
            {currentIndex + 1} av {photos.length}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
