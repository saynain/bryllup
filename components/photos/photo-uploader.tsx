"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  Image as ImageIcon,
  Camera,
  Film,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isCloudflareMediaEnabled, uploadMediaFile } from "@/lib/media/client";

interface PhotoUploaderProps {
  onUploadComplete: () => void;
}

type UploadStatus = "queued" | "uploading" | "done" | "error";
type MediaType = "image" | "video";

interface UploadItem {
  id: string;
  file: File;
  preview?: string;
  type: MediaType;
  status: UploadStatus;
  progress: number;
  error?: string;
}

const MAX_PREVIEW_ITEMS = 18;
const MAX_UPLOAD_RETRIES = 2;

export function PhotoUploader({ onUploadComplete }: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    setError(null);
    const supportedFiles = Array.from(newFiles).filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    if (supportedFiles.length === 0) {
      setError("Velg kun bilder eller videoer");
      return;
    }

    if (!isCloudflareMediaEnabled() && supportedFiles.some((file) => file.type.startsWith("video/"))) {
      setError("Videoopplasting krever at Cloudflare media-API er aktivert");
      return;
    }

    setFiles((prev) => {
      const previewSlots = Math.max(MAX_PREVIEW_ITEMS - prev.length, 0);
      const nextItems = supportedFiles.map((file, index): UploadItem => {
        const type = file.type.startsWith("video/") ? "video" : "image";
        const shouldPreview = index < previewSlots && type === "image";

        return {
          id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
          type,
          preview: shouldPreview ? URL.createObjectURL(file) : undefined,
          status: "queued",
          progress: 0,
        };
      });

      return [...prev, ...nextItems];
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  const updateFile = useCallback((id: string, patch: Partial<UploadItem>) => {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  const uploadSingleFile = useCallback(
    async (item: UploadItem) => {
      updateFile(item.id, { status: "uploading", progress: 0, error: undefined });

      await retry(async () => {
        await uploadMediaFile(item.file, {
          onProgress: ({ loaded, total }) => {
            updateFile(item.id, {
              progress: total > 0 ? Math.round((loaded / total) * 100) : 0,
            });
          },
        });
      });

      updateFile(item.id, { status: "done", progress: 100 });
    },
    [updateFile]
  );

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setFiles((prev) =>
      prev.map((item) =>
        item.status === "error"
          ? { ...item, status: "queued", error: undefined, progress: 0 }
          : item
      )
    );

    const fileQueue = [...files];
    let nextIndex = 0;
    let completed = 0;
    let failed = 0;
    let uploaded = 0;

    const worker = async () => {
      while (nextIndex < fileQueue.length) {
        const currentIndex = nextIndex++;
        const item = fileQueue[currentIndex];

        try {
          await uploadSingleFile(item);
          uploaded++;
        } catch (err) {
          failed++;
          updateFile(item.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Opplasting feilet",
          });
        } finally {
          completed++;
          setProgress((completed / fileQueue.length) * 100);
        }
      }
    };

    const concurrency = getUploadConcurrency(fileQueue.length);
    await Promise.all(
      Array.from(
        { length: Math.min(concurrency, fileQueue.length) },
        () => worker()
      )
    );

    setFiles((prev) => {
      const remaining = prev.filter((item) => item.status === "error");
      prev.forEach((item) => {
        if (item.status !== "error" && item.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });
      return remaining.map((item) => ({ ...item, status: "queued", progress: 0 }));
    });

    setUploading(false);

    if (uploaded > 0) {
      onUploadComplete();
    }

    if (failed > 0) {
      setError(
        `${failed} av ${fileQueue.length} filer feilet. Prøv igjen for filene som står igjen.`
      );
    } else {
      setProgress(0);
    }
  };

  const selectedSummary = useMemo(() => {
    const imageCount = files.filter((item) => item.type === "image").length;
    const videoCount = files.filter((item) => item.type === "video").length;

    if (imageCount > 0 && videoCount > 0) {
      return `${imageCount} ${imageCount === 1 ? "bilde" : "bilder"} og ${videoCount} ${
        videoCount === 1 ? "video" : "videoer"
      } valgt`;
    }

    if (videoCount > 0) {
      return `${videoCount} ${videoCount === 1 ? "video" : "videoer"} valgt`;
    }

    return `${imageCount} ${imageCount === 1 ? "bilde" : "bilder"} valgt`;
  }, [files]);

  const previewItems = files.slice(0, MAX_PREVIEW_ITEMS);
  const hiddenPreviewCount = Math.max(files.length - previewItems.length, 0);

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 transition-colors ${
          isDragging
            ? "border-[#8B7355] bg-[#E8DED0]/50"
            : "border-[#B8A491] hover:border-[#8B7355]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={uploading}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInput}
          className="hidden"
          disabled={uploading}
        />

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-4 rounded-full bg-[#E8DED0]">
            <Upload className="h-8 w-8 text-[#8B7355]" />
          </div>
          <div>
            <p className="text-lg font-medium text-[#5D4E37]">
              Dra og slipp bilder her
            </p>
            <p className="text-sm text-[#8B7355] mt-1">
              eller velg bilder fra enheten din
            </p>
            <p className="text-xs text-[#9B8466] mt-2">
              Bilder og videoer fra mobilen lastes opp i en mobilvennlig kø.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-12 px-6"
            >
              <ImageIcon className="h-5 w-5 mr-2" />
              Velg bilder
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="h-12 px-6 sm:hidden"
            >
              <Camera className="h-5 w-5 mr-2" />
              Ta bilde
            </Button>
          </div>
        </div>
      </div>

      {/* File previews */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <p className="text-sm font-medium text-[#5D4E37]">
              {selectedSummary}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {previewItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-lg overflow-hidden bg-[#E8DED0]"
                >
                  {item.preview ? (
                    <img
                      src={item.preview}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#8B7355]">
                      {item.type === "video" ? (
                        <Film className="h-6 w-6" />
                      ) : (
                        <ImageIcon className="h-6 w-6" />
                      )}
                      <span className="max-w-full truncate px-2 text-xs">
                        {item.file.name}
                      </span>
                    </div>
                  )}
                  {item.status === "uploading" && (
                    <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-center text-xs text-white">
                      {item.progress}%
                    </div>
                  )}
                  {item.status === "done" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                  )}
                  {item.status === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-950/50 text-white">
                      <AlertCircle className="h-7 w-7" />
                    </div>
                  )}
                  {!uploading && (
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              ))}
              {hiddenPreviewCount > 0 && (
                <div className="flex aspect-square items-center justify-center rounded-lg bg-[#E8DED0] text-sm font-medium text-[#8B7355]">
                  +{hiddenPreviewCount}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-center text-[#8B7355]">
            Laster opp... {Math.round(progress)}%
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-red-600 text-center"
        >
          {error}
        </motion.p>
      )}

      {/* Upload button */}
      {files.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full h-12 text-base font-semibold"
        >
          {uploading
            ? "Laster opp..."
            : `Last opp ${files.length} ${files.length === 1 ? "fil" : "filer"}`}
        </Button>
      )}
    </div>
  );
}

async function retry(operation: () => Promise<void>): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
      await wait(700 * (attempt + 1));
    }
  }

  throw lastError;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getUploadConcurrency(fileCount: number): number {
  const isMobile =
    window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

  if (isMobile) {
    return 1;
  }

  return fileCount > 20 ? 2 : 3;
}
