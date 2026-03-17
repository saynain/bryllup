"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoUploader } from "@/components/photos/photo-uploader";
import { PhotoGrid } from "@/components/photos/photo-grid";

export default function PhotosPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  const handleUploadComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
    galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F5F0EB] via-white to-[#F5F0EB]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-[#E8DED0]/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Tilbake</span>
            </Button>
          </Link>
          <div className="text-center">
            <span className="font-script text-2xl text-[#5D4E37]">Silje & Sindre</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="font-script text-5xl md:text-6xl text-[#5D4E37] mb-4">
            Del dine bilder
          </h2>
          <div className="ornament mb-4">
            <span className="text-[#B8A491]">✦</span>
          </div>
          <p className="text-lg text-[#8B7355] max-w-md mx-auto leading-relaxed">
            Last opp bilder fra bryllupet så alle kan se og laste ned minnene
          </p>
        </motion.div>

        {/* Upload section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="wedding-card rounded-2xl p-6 md:p-8 mb-12"
        >
          <PhotoUploader onUploadComplete={handleUploadComplete} />
        </motion.div>

        {/* Gallery section */}
        <motion.div
          ref={galleryRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold text-[#5D4E37] mb-2">
              Bildegalleri
            </h3>
            <div className="ornament">
              <span className="text-[#B8A491] text-sm">❦</span>
            </div>
          </div>
          <PhotoGrid refreshTrigger={refreshTrigger} />
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="py-12 text-center border-t border-[#E8DED0]/50">
        <span className="font-script text-3xl text-[#B8A491] block mb-4">Silje & Sindre</span>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#8B7355] hover:text-[#5D4E37] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbake til hovedsiden
        </Link>
      </footer>
    </main>
  );
}
