"use client";

import {
  startTransition,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { motion } from "framer-motion";
import {
  CheckSquare2,
  Download,
  Images,
  RefreshCw,
  Video,
  X,
} from "lucide-react";
import { PhotoCard } from "./photo-card";
import { PhotoLightbox } from "./photo-lightbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  fetchMediaList,
  getMediaArchiveUrl,
  getSelectedMediaArchiveUrl,
  type MediaArchiveKind,
} from "@/lib/media/client";
import type { PhotoMetadata } from "@/lib/storage/types";

const INITIAL_GALLERY_PAGE_SIZE = 36;
const BACKGROUND_GALLERY_PAGE_SIZE = 60;
const MAX_SELECTED_MEDIA = 100;
const ARCHIVE_OPTIONS: Array<{
  kind: MediaArchiveKind;
  label: string;
  icon: typeof Images;
  url: string | undefined;
}> = [
  {
    kind: "photos",
    label: "bilder",
    icon: Images,
    url: getMediaArchiveUrl("photos"),
  },
  {
    kind: "videos",
    label: "videoer",
    icon: Video,
    url: getMediaArchiveUrl("videos"),
  },
];

interface ArchiveStatus {
  available: boolean;
}

interface PhotoGridProps {
  refreshTrigger?: number;
}

interface LoadPhotosOptions {
  loadMore?: boolean;
  cursorOverride?: string;
}

export function PhotoGrid({ refreshTrigger = 0 }: PhotoGridProps) {
  const [archiveStatuses, setArchiveStatuses] = useState<
    Record<MediaArchiveKind, ArchiveStatus>
  >({
    photos: { available: false },
    videos: { available: false },
  });
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMetadata | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const loadPhotos = useCallback(async ({
    loadMore = false,
    cursorOverride,
  }: LoadPhotosOptions = {}) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
        setLoadMoreError(null);
      } else {
        setLoading(true);
        setError(null);
      }

      const data = await fetchMediaList({
        limit: loadMore
          ? BACKGROUND_GALLERY_PAGE_SIZE
          : INITIAL_GALLERY_PAGE_SIZE,
        cursor: loadMore ? cursorOverride : undefined,
      });

      if (loadMore) {
        startTransition(() => {
          setPhotos((prev) => [...prev, ...data.photos]);
        });
      } else {
        setPhotos(data.photos);
      }
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Noe gikk galt";
      if (loadMore) {
        setLoadMoreError(message);
      } else {
        setError(message);
      }
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
    const controller = new AbortController();
    Promise.all(
      ARCHIVE_OPTIONS.map(async ({ kind, url }) => {
        if (!url) {
          return [kind, { available: false }] as const;
        }

        try {
          const response = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
          });
          return [
            kind,
            {
              available: response.ok,
            },
          ] as const;
        } catch {
          return [kind, { available: false }] as const;
        }
      })
    ).then((entries) => {
      if (!controller.signal.aborted) {
        setArchiveStatuses(Object.fromEntries(entries) as Record<
          MediaArchiveKind,
          ArchiveStatus
        >);
      }
    });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    setCursor(undefined);
    setHasMore(false);
    setLoadMoreError(null);
    loadPhotos();
  }, [refreshTrigger, loadPhotos]);

  useEffect(() => {
    const availableIds = new Set(photos.map((photo) => photo.id));
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => availableIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [photos]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore || !cursor || loadMoreError) {
      return;
    }

    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadPhotos({ loadMore: true, cursorOverride: cursor });
        }
      },
      { rootMargin: "600px 0px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [cursor, hasMore, loadMoreError, loading, loadingMore, loadPhotos]);

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

  const selectedArchiveUrl = getSelectedMediaArchiveUrl([...selectedIds]);

  function toggleSelection(id: string) {
    setSelectionError(null);
    if (!selectedIds.has(id) && selectedIds.size >= MAX_SELECTED_MEDIA) {
      setSelectionError(`Du kan laste ned opptil ${MAX_SELECTED_MEDIA} filer om gangen.`);
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function stopSelecting() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setSelectionError(null);
  }

  return (
    <>
      {getMediaArchiveUrl("photos") && (
        <div className="mb-5 flex flex-col gap-4 rounded-xl border border-[#E8DED0] bg-white/70 px-4 py-4 sm:px-5">
          <div>
            <p className="font-medium text-[#5D4E37]">Last ned originalfilene</p>
            <p className="mt-0.5 text-sm text-[#8B7355]">
              {selectionMode
                ? `Trykk på filene du vil ha. Du kan velge opptil ${MAX_SELECTED_MEDIA} originalfiler om gangen.`
                : "Last ned alt samlet, eller velg de bildene og videoene du vil ha."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!selectionMode && ARCHIVE_OPTIONS.map(({ kind, label, icon: ArchiveIcon, url }) => {
              const archive = archiveStatuses[kind];
              if (!url || !archive.available) {
                return null;
              }

              return (
                <Button key={kind} asChild variant="outline" className="shrink-0">
                  <a href={url} target="_blank" rel="noreferrer">
                    <ArchiveIcon className="h-4 w-4" />
                    Last ned alle {label}
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              );
            })}
            <Button
              type="button"
              variant={selectionMode ? "secondary" : "outline"}
              onClick={() => selectionMode ? stopSelecting() : setSelectionMode(true)}
            >
              {selectionMode ? (
                <X className="h-4 w-4" />
              ) : (
                <CheckSquare2 className="h-4 w-4" />
              )}
              {selectionMode ? "Avslutt valg" : "Velg filer"}
            </Button>
          </div>
          {selectionError && (
            <p className="text-sm font-medium text-red-700" role="alert">
              {selectionError}
            </p>
          )}
        </div>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-4 gap-0.5 overflow-hidden rounded-md sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
        {photos.map((photo, index) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            animateEntrance={index < INITIAL_GALLERY_PAGE_SIZE}
            selectionMode={selectionMode}
            selectionDisabled={!photo.downloadUrl}
            selected={selectedIds.has(photo.id)}
            onClick={() =>
              selectionMode
                ? photo.downloadUrl && toggleSelection(photo.id)
                : setSelectedPhoto(photo)
            }
          />
        ))}
      </div>

      {(hasMore || loadingMore || loadMoreError) && (
        <div
          ref={loadMoreSentinelRef}
          className="mt-6 flex min-h-12 items-center justify-center gap-3 text-sm text-[#8B7355]"
          aria-live="polite"
        >
          {loadMoreError ? (
            <>
              <span>Resten av galleriet kunne ikke lastes inn.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  loadPhotos({ loadMore: true, cursorOverride: cursor })
                }
              >
                Prøv igjen
              </Button>
            </>
          ) : loadingMore ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Laster inn flere bilder …</span>
            </>
          ) : (
            <span className="sr-only">
              Flere bilder lastes automatisk når du blar nedover.
            </span>
          )}
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

      {selectionMode && (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-[#D9CCBB] bg-white/95 p-3 shadow-xl backdrop-blur sm:bottom-5 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[#5D4E37]">
              {selectedIds.size === 0
                ? "Ingen filer valgt"
                : `${selectedIds.size} ${selectedIds.size === 1 ? "fil" : "filer"} valgt`}
            </p>
            <p className="truncate text-xs text-[#8B7355]">
              Bilder og videoer lastes ned i én ZIP-fil
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={stopSelecting}>
            Avbryt
          </Button>
          <Button asChild={Boolean(selectedArchiveUrl)} disabled={!selectedArchiveUrl} size="sm">
            {selectedArchiveUrl ? (
              <a href={selectedArchiveUrl} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
                Last ned
              </a>
            ) : (
              <span>
                <Download className="h-4 w-4" />
                Last ned
              </span>
            )}
          </Button>
        </div>
      )}
    </>
  );
}
