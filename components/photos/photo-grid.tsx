"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { PhotoCard } from "./photo-card";
import { PhotoLightbox } from "./photo-lightbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { PhotoMetadata, ListResult } from "@/lib/storage/types";

interface PhotoGridProps {
  refreshTrigger?: number;
}

export function PhotoGrid({ refreshTrigger = 0 }: PhotoGridProps) {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = new URLSearchParams();
      params.set("limit", "24");
      if (loadMore && cursor) {
        params.set("cursor", cursor);
      }

      const response = await fetch(`/api/photos?${params}`);
      if (!response.ok) {
        throw new Error("Kunne ikke hente bilder");
      }

      const data: ListResult = await response.json();

      setPhotos((prev) => (loadMore ? [...prev, ...data.photos] : data.photos));
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor]);

  // Load initial photos
  useEffect(() => {
    loadPhotos(false);
  }, [refreshTrigger]);

  // Reload when refreshTrigger changes (after upload)
  useEffect(() => {
    if (refreshTrigger > 0) {
      setCursor(undefined);
      loadPhotos(false);
    }
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="mb-4 aspect-square rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[#8B7355] mb-4">{error}</p>
        <Button variant="outline" onClick={() => loadPhotos(false)}>
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
      {/* Photo grid */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
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
            onClick={() => loadPhotos(true)}
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
