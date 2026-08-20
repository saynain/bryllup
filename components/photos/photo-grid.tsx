"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, RefreshCw } from "lucide-react";
import { PhotoCard } from "./photo-card";
import { PhotoLightbox } from "./photo-lightbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fetchMediaList, getPhotoArchiveUrl } from "@/lib/media/client";
import type { PhotoMetadata } from "@/lib/storage/types";

const GALLERY_PAGE_SIZE = 36;

interface PhotoGridProps {
  refreshTrigger?: number;
}

interface LoadPhotosOptions {
  loadMore?: boolean;
  cursorOverride?: string;
}

export function PhotoGrid({ refreshTrigger = 0 }: PhotoGridProps) {
  const archiveUrl = getPhotoArchiveUrl();
  const [archiveAvailable, setArchiveAvailable] = useState(false);
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async ({
    loadMore = false,
    cursorOverride,
  }: LoadPhotosOptions = {}) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await fetchMediaList({
        limit: GALLERY_PAGE_SIZE,
        cursor: loadMore ? cursorOverride : undefined,
      });

      setPhotos((prev) => (loadMore ? [...prev, ...data.photos] : data.photos));
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const origins = [
      "https://iframe.videodelivery.net",
      "https://videodelivery.net",
    ];
    const createdHints: HTMLLinkElement[] = [];

    for (const origin of origins) {
      const alreadyExists = Array.from(
        document.head.querySelectorAll<HTMLLinkElement>('link[rel="preconnect"]')
      ).some((link) => link.href === `${origin}/`);

      if (!alreadyExists) {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = origin;
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
        createdHints.push(link);
      }
    }

    return () => createdHints.forEach((link) => link.remove());
  }, []);

  useEffect(() => {
    if (!archiveUrl) {
      setArchiveAvailable(false);
      return;
    }

    const controller = new AbortController();
    fetch(archiveUrl, { method: "HEAD", signal: controller.signal })
      .then((response) => setArchiveAvailable(response.ok))
      .catch(() => setArchiveAvailable(false));

    return () => controller.abort();
  }, [archiveUrl]);

  useEffect(() => {
    setCursor(undefined);
    setHasMore(false);
    loadPhotos();
  }, [refreshTrigger, loadPhotos]);

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-0.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
        {Array.from({ length: 40 }).map((_, i) => (
          <Skeleton
            key={i}
            className="aspect-square rounded-none"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[#8B7355] mb-4">{error}</p>
        <Button variant="outline" onClick={() => loadPhotos()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Prøv igjen
        </Button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <div className="p-6 rounded-full bg-[#E8DED0] inline-block mb-4">
          <RefreshCw className="h-8 w-8 text-[#8B7355]" />
        </div>
        <p className="text-xl text-[#5D4E37] font-medium">
          Ingen bilder ennå
        </p>
        <p className="text-[#8B7355] mt-2">
          Bli den første til å dele et bilde!
        </p>
      </motion.div>
    );
  }

  return (
    <>
      {archiveUrl && archiveAvailable && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#E8DED0] bg-white/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="font-medium text-[#5D4E37]">Vil du beholde alle bildene?</p>
            <p className="mt-0.5 text-sm text-[#8B7355]">
              Last ned originalene samlet i én stor ZIP-fil. Bruk gjerne Wi-Fi.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <a href={archiveUrl} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              Last ned alle bilder
            </a>
          </Button>
        </div>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-4 gap-0.5 overflow-hidden rounded-md sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onClick={() => setSelectedPhoto(photo)}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            onClick={() => loadPhotos({ loadMore: true, cursorOverride: cursor })}
            disabled={loadingMore}
            className="h-12 px-8"
          >
            {loadingMore ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Laster...
              </>
            ) : (
              "Last inn flere bilder"
            )}
          </Button>
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={photos}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={setSelectedPhoto}
        />
      )}
    </>
  );
}
