"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { PhotoSection } from "@/components/sections/photo-section";

export default function LegacyHome() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  const section2Ref = useRef(null);
  const section3Ref = useRef(null);

  const { scrollYProgress: section2Progress } = useScroll({
    target: section2Ref,
    offset: ["start end", "end start"],
  });
  const y2 = useTransform(section2Progress, [0, 1], ["-20%", "20%"]);

  const { scrollYProgress: section3Progress } = useScroll({
    target: section3Ref,
    offset: ["start end", "end start"],
  });
  const y3 = useTransform(section3Progress, [0, 1], ["-20%", "20%"]);

  return (
    <main ref={ref} className="relative min-h-screen">
      <section className="relative flex h-screen items-center justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0 z-0"
          style={{ y: y1 }}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <Image
            src="/photos/Bilde_1.jpg"
            alt="Silje & Sindre"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white/40" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute top-6 right-0 left-0 z-20 flex items-center justify-center gap-4 text-white/90"
        >
          <span className="h-px w-12 bg-white/50" />
          <span className="text-lg tracking-widest md:text-xl">15. AUGUST 2026</span>
          <span className="h-px w-12 bg-white/50" />
        </motion.div>

        <div className="relative z-20 px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mb-4 text-5xl font-bold tracking-wide text-white drop-shadow-2xl md:text-7xl"
          >
            Vi gifter oss!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            className="text-3xl tracking-wider text-white drop-shadow-lg md:text-4xl"
          >
            Silje & Sindre
          </motion.p>
        </div>

        <div className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2 animate-bounce">
          <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/60 p-2">
            <div className="h-3 w-1 rounded-full bg-white/60" />
          </div>
        </div>
      </section>

      <section
        ref={section2Ref}
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-20"
      >
        <motion.div className="absolute inset-0 z-0" style={{ y: y2 }}>
          <Image src="/photos/Bilde_2.jpg" alt="Silje & Sindre" fill className="object-cover" />
          <div className="absolute inset-0 bg-white/30" />
        </motion.div>
        <div className="relative z-10 mx-auto w-full max-w-4xl">
          <div className="space-y-8 py-12 text-center">
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-2xl leading-relaxed font-light text-[#5D4E37] drop-shadow-lg md:text-3xl"
            >
              Tusen takk for at dere var med å dele dagen med oss. Dere gjorde den perfekt!
            </motion.p>
          </div>
        </div>
      </section>

      <section
        ref={section3Ref}
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-20"
      >
        <motion.div className="absolute inset-0 z-0" style={{ y: y3 }}>
          <Image src="/photos/Bilde_3.jpg" alt="Silje & Sindre" fill className="object-cover" />
          <div className="absolute inset-0 bg-white/60" />
        </motion.div>
        <div className="relative z-10 mx-auto w-full max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative mb-12 h-[500px] overflow-hidden shadow-2xl md:h-[700px]"
          >
            <Image src="/photos/Bilde_3.jpg" alt="Silje & Sindre" fill className="object-cover" />
            <div className="from-background absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      <PhotoSection />
    </main>
  );
}
