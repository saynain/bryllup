"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Images } from "lucide-react";

export default function Home() {
  return (
    <main className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#6f655c] px-5 py-10 text-white">
      <motion.div
        className="absolute inset-0 -z-20"
        initial={{ scale: 1.04 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.8, ease: "easeOut" }}
      >
        <Image
          src="/photos/Bilde_1.jpg"
          alt="Silje og Sindre ved sjøen"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[56%_center] sm:object-center"
        />
      </motion.div>

      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(27,22,18,0.34)_0%,rgba(27,22,18,0.1)_42%,rgba(27,22,18,0.58)_100%)]" />

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
        className="mt-auto flex w-full max-w-3xl flex-col items-center text-center sm:mt-0"
      >
        <p className="mb-5 text-sm tracking-[0.32em] text-white/85 uppercase sm:text-base">
          Silje &amp; Sindre
        </p>
        <h1 className="max-w-2xl text-5xl leading-[0.95] font-medium tracking-tight text-balance drop-shadow-lg sm:text-7xl md:text-8xl">
          Takk for en uforglemmelig dag
        </h1>
        <div className="my-7 h-px w-16 bg-white/65 sm:my-9" />
        <p className="max-w-xl text-xl leading-relaxed text-white/95 text-balance drop-shadow-md sm:text-2xl">
          Se bildene fra bryllupet, og del gjerne dine egne minner med oss.
        </p>

        <Link
          href="/photos"
          className="group mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-white/45 bg-white px-7 py-4 text-lg font-semibold text-[#5D4E37] shadow-[0_14px_40px_rgba(22,17,13,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#F8F5F1] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:mt-10 sm:px-9"
        >
          <Images aria-hidden="true" className="size-5" />
          Se og del bilder
          <ArrowRight
            aria-hidden="true"
            className="size-5 transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </motion.section>

      <p className="absolute bottom-4 text-sm tracking-[0.18em] text-white/70 sm:bottom-6">
        15. august 2026
      </p>
    </main>
  );
}
