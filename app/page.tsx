"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScheduleSection } from "@/components/sections/schedule-section";
import { LocationSection } from "@/components/sections/location-section";
import { PhotoSection } from "@/components/sections/photo-section";

export default function Home() {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  const section2Ref = useRef(null);
  const section3Ref = useRef(null);
  const section4Ref = useRef(null);
  const section5Ref = useRef(null);

  const { scrollYProgress: section2Progress } = useScroll({
    target: section2Ref,
    offset: ["start end", "end start"]
  });
  const y2 = useTransform(section2Progress, [0, 1], ["-20%", "20%"]);

  const { scrollYProgress: section3Progress } = useScroll({
    target: section3Ref,
    offset: ["start end", "end start"]
  });
  const y3 = useTransform(section3Progress, [0, 1], ["-20%", "20%"]);

  const { scrollYProgress: section4Progress } = useScroll({
    target: section4Ref,
    offset: ["start end", "end start"]
  });
  const y4 = useTransform(section4Progress, [0, 1], ["-20%", "20%"]);

  const { scrollYProgress: section5Progress } = useScroll({
    target: section5Ref,
    offset: ["start end", "end start"]
  });
  const y5 = useTransform(section5Progress, [0, 1], ["-20%", "20%"]);

  const [formData, setFormData] = useState({
    name: "",
    attending: "",
    guests: "",
    dietaryRestrictions: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Noe gikk galt");
      }

      setSubmitStatus({
        type: "success",
        message: "Takk for svar!",
      });

      // Reset form after successful submission
      setFormData({
        name: "",
        attending: "",
        guests: "",
        dietaryRestrictions: "",
      });
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Kunne ikke sende svar. Vennligst prøv igjen.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main ref={ref} className="relative min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
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

        {/* Date at top */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute top-6 left-0 right-0 z-20 flex items-center justify-center gap-4 text-white/90"
        >
          <span className="w-12 h-px bg-white/50" />
          <span className="text-lg md:text-xl tracking-widest">15. AUGUST 2026</span>
          <span className="w-12 h-px bg-white/50" />
        </motion.div>

        {/* Content */}
        <div className="relative z-20 text-center px-4">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-lg md:text-xl text-white/90 tracking-[0.3em] uppercase mb-4 drop-shadow-lg"
          >
            Vi gifter oss
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
            className="text-6xl md:text-8xl lg:text-9xl text-white drop-shadow-2xl mb-6 font-light"
          >
            Silje & Sindre
          </motion.h1>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/60 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/60 rounded-full" />
          </div>
        </div>
      </section>

      {/* Date and Location Section */}
      <section ref={section2Ref} className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
        {/* Background Image */}
        <motion.div className="absolute inset-0 z-0" style={{ y: y2 }}>
          <Image
            src="/photos/Bilde_2.jpg"
            alt="Silje & Sindre"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-white/30" />
        </motion.div>

        <div className="relative z-10 max-w-4xl mx-auto w-full">
          {/* Welcome Text */}
          <div className="text-center space-y-8 py-12">
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-2xl md:text-3xl text-[#5D4E37] font-light leading-relaxed drop-shadow-lg"
            >
              Velkommen til vårt bryllup 15.august 2026. Vi gleder oss til å feire kjærligheten med familie og venner.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Ceremony Details Section */}
      <section ref={section3Ref} className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
        {/* Background Layer */}
        <motion.div className="absolute inset-0 z-0" style={{ y: y3 }}>
          <Image
            src="/photos/Bilde_3.jpg"
            alt="Silje & Sindre"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-white/60" />
        </motion.div>

        <div className="relative z-10 max-w-4xl mx-auto w-full">
          {/* Third Photo in Foreground - Clear */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative h-[500px] md:h-[700px] overflow-hidden mb-12 shadow-2xl"
          >
            <Image
              src="/photos/Bilde_3.jpg"
              alt="Silje & Sindre"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </motion.div>

          {/* Ceremony Info Text */}
          <div className="text-center py-12">
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="text-xl md:text-2xl text-[#5D4E37] font-light leading-relaxed drop-shadow-lg"
            >
              Seremonien holdes i Arna kirke klokken 14:00, etterfulgt av middag og fest på kvelden.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
              className="text-xl md:text-2xl text-[#5D4E37] font-light leading-relaxed drop-shadow-lg mt-2"
            >
              Mer informasjon kommer.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Share the Day Section */}
      <section ref={section4Ref} className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {/* Background Image */}
        <motion.div className="absolute inset-0 z-0" style={{ y: y4 }}>
          <Image
            src="/photos/Bilde_4.jpg"
            alt="Silje & Sindre"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-white/40" />
        </motion.div>

        <div className="relative z-10 max-w-4xl mx-auto w-full">
          {/* Message Text */}
          <div className="text-center space-y-8 py-12">
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-2xl md:text-3xl text-[#5D4E37] font-light leading-relaxed drop-shadow-lg"
            >
              Vi håper at du/dere vil dele denne store dagen med oss.
            </motion.p>
          </div>
        </div>
      </section>

      {/* RSVP Section */}
      <section ref={section5Ref} className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {/* Background Image */}
        <motion.div className="absolute inset-0 z-0" style={{ y: y5 }}>
          <Image
            src="/photos/Bilde_5.jpg"
            alt="Silje & Sindre"
            fill
            className="object-cover [object-position:35%_center] md:[object-position:center]"
          />
          <div className="absolute inset-0 bg-white/30" />
        </motion.div>

        <div className="relative z-10 max-w-2xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-semibold text-[#5D4E37] mb-4 drop-shadow-lg">
              Kan du komme?
            </h2>
            <p className="text-2xl text-[#5D4E37] drop-shadow-lg">
              Vi gleder oss til å feire med dere!
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            onSubmit={handleSubmit}
            className="wedding-card rounded-2xl p-8 md:p-12 pb-6 md:pb-8 space-y-8"
          >
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">
                Navn
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ditt fulle navn"
                required
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base">Kommer du?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, attending: "yes" })}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    formData.attending === "yes"
                      ? "border-[#5D4E37] bg-[#5D4E37] text-white"
                      : "border-[#B8A491] bg-white hover:border-[#8B7355] hover:bg-[#F5F0EB]"
                  }`}
                >
                  <span className="text-base font-medium">Ja, jeg kommer!</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, attending: "no" })}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    formData.attending === "no"
                      ? "border-[#5D4E37] bg-[#5D4E37] text-white"
                      : "border-[#B8A491] bg-white hover:border-[#8B7355] hover:bg-[#F5F0EB]"
                  }`}
                >
                  <span className="text-base font-medium">Kan dessverre ikke</span>
                </button>
              </div>
            </div>

            {formData.attending === "yes" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="guests" className="text-base">
                    Antall gjester (inkludert deg selv)
                  </Label>
                  <Input
                    id="guests"
                    type="number"
                    min="1"
                    value={formData.guests}
                    onChange={(e) =>
                      setFormData({ ...formData, guests: e.target.value })
                    }
                    placeholder="1"
                    required
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dietary" className="text-base">
                    Allergier?
                  </Label>
                  <Input
                    id="dietary"
                    value={formData.dietaryRestrictions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dietaryRestrictions: e.target.value,
                      })
                    }
                    placeholder="Vegetar, allergier, etc."
                    className="h-12 text-base"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sender..." : "Send svar"}
              </Button>
              <p className="text-center text-[#5D4E37]">
                <span className="text-sm">Gi en lyd innen </span>
                <span className="text-base">01.02.2026</span>
              </p>
            </div>

            {submitStatus.type && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-xl text-center border ${
                  submitStatus.type === "success"
                    ? "bg-[#E8DED0]/50 text-[#5D4E37] border-[#B8A491]"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {submitStatus.type === "success" && (
                  <span className="font-script text-2xl block mb-1">Tusen takk!</span>
                )}
                {submitStatus.message}
              </motion.div>
            )}
          </motion.form>
        </div>
      </section>

      {/* Schedule Section */}
      <ScheduleSection />

      {/* Location Section with Map */}
      <LocationSection />

      {/* Photo Sharing Section */}
      <PhotoSection />

    </main>
  );
}
