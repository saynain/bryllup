"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { Camera, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PhotoSection() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[70vh] flex items-center justify-center px-4 py-20 overflow-hidden"
    >
      {/* Background */}
      <motion.div className="absolute inset-0 z-0" style={{ y }}>
        <Image
          src="/photos/Bilde_4.jpg"
          alt="Bakgrunn"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-white/70 to-white/50" />
      </motion.div>

      <div className="relative z-10 max-w-2xl mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-xl"
        >
          <div className="inline-flex p-4 rounded-full bg-[#E8DED0] mb-6">
            <Camera className="w-8 h-8 text-[#8B7355]" />
          </div>

          <h2 className="text-3xl md:text-4xl font-semibold text-[#5D4E37] mb-4">
            Del dine bilder
          </h2>

          <p className="text-lg text-[#8B7355] mb-8 max-w-md mx-auto">
            Har du tatt bilder fra bryllupet? Del dem med oss og de andre gjestene
            i vårt felles bildealbum!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/photos">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base">
                <Camera className="w-5 h-5 mr-2" />
                Gå til bildedeling
              </Button>
            </Link>
          </div>

          <p className="text-sm text-[#8B7355] mt-6 flex items-center justify-center gap-2">
            <QrCode className="w-4 h-4" />
            Skann QR-koden på menyen for rask tilgang
          </p>
        </motion.div>
      </div>
    </section>
  );
}
