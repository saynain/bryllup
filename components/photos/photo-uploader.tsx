"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Image as ImageIcon, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface PhotoUploaderProps {
  onUploadComplete: () => void;
}

interface FilePreview {
  file: File;
  preview: string;
}

export function PhotoUploader({ onUploadComplete }: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    setError(null);
    const imageFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      setError("Velg kun bildefiler");
      return;
    }

    const previews: FilePreview[] = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setFiles((prev) => [...prev, ...previews]);
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
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    let completed = 0;
    let hasError = false;

    for (const { file } of files) {
      const formData = new FormData();
      formData.append("file", file);
      if (name.trim()) {
        formData.append("uploadedBy", name.trim());
      }

      try {
        const response = await fetch("/api/photos", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Opplasting feilet");
        }
      } catch (err) {
        hasError = true;
        setError(err instanceof Error ? err.message : "Opplasting feilet");
      }

      completed++;
      setProgress((completed / files.length) * 100);
    }

    // Clean up previews
    files.forEach(({ preview }) => URL.revokeObjectURL(preview));
    setFiles([]);
    setProgress(0);
    setUploading(false);

    if (!hasError) {
      onUploadComplete();
    }
  };

  return (
    <div className="space-y-6">
      {/* Name input */}
      <div className="space-y-2">
        <Label htmlFor="uploader-name" className="text-base">
          Ditt navn (valgfritt)
        </Label>
        <Input
          id="uploader-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Skriv inn navnet ditt"
          className="h-12 text-base"
          disabled={uploading}
        />
      </div>

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
          accept="image/*"
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
              eller bruk knappene under
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
              {files.length} {files.length === 1 ? "bilde" : "bilder"} valgt
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {files.map(({ preview }, index) => (
                <motion.div
                  key={preview}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-lg overflow-hidden bg-[#E8DED0]"
                >
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
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
            : `Last opp ${files.length} ${files.length === 1 ? "bilde" : "bilder"}`}
        </Button>
      )}
    </div>
  );
}
