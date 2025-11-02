"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
          initial={{ scale: 1.1 }}
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

        {/* Content */}
        <div className="relative z-20 text-center px-4">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-bold text-white drop-shadow-2xl mb-4 tracking-wide"
          >
            Vi gifter oss!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            className="text-3xl md:text-4xl text-white drop-shadow-lg tracking-wider"
          >
            Silje & Sindre
          </motion.p>
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
              viewport={{ once: false, amount: 0.3 }}
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
        {/* Background Image - Blurred */}
        <motion.div className="absolute inset-0 z-0" style={{ y: y3 }}>
          <Image
            src="/photos/Bilde_3.jpg"
            alt="Silje & Sindre"
            fill
            className="object-cover blur-md"
          />
          <div className="absolute inset-0 bg-white/60" />
        </motion.div>

        <div className="relative z-10 max-w-4xl mx-auto w-full">
          {/* Third Photo in Foreground - Clear */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
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
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="text-xl md:text-2xl text-[#5D4E37] font-light leading-relaxed drop-shadow-lg"
            >
              Seremonien holdes i Arna kirke klokken 14:00, etterfulgt av middag og fest på kvelden.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
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
          <div className="absolute inset-0 bg-white/60" />
        </motion.div>

        <div className="relative z-10 max-w-4xl mx-auto w-full">
          {/* Message Text */}
          <div className="text-center space-y-8 py-12">
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
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
            className="object-cover"
          />
          <div className="absolute inset-0 bg-white/30" />
        </motion.div>

        <div className="relative z-10 max-w-2xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
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
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl p-8 md:p-12 pb-4 md:pb-6 space-y-8"
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

            <div className="space-y-4">
              <Label className="text-base">Kommer du?</Label>
              <RadioGroup
                value={formData.attending}
                onValueChange={(value) =>
                  setFormData({ ...formData, attending: value })
                }
                required
              >
                <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label
                    htmlFor="yes"
                    className="text-base font-normal cursor-pointer flex-1"
                  >
                    Ja, jeg kommer!
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="no" id="no" />
                  <Label
                    htmlFor="no"
                    className="text-base font-normal cursor-pointer flex-1"
                  >
                    Dessverre kan jeg ikke komme
                  </Label>
                </div>
              </RadioGroup>
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
                className={`p-4 rounded-lg text-center ${
                  submitStatus.type === "success"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {submitStatus.message}
              </motion.div>
            )}
          </motion.form>
        </div>
      </section>

      {/* Footer with Map - DISABLED */}
      {/* Uncomment this section to enable the map */}
      {/* <section className="relative bg-gradient-to-b from-white to-background py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative h-96 md:h-[500px] rounded-2xl overflow-hidden shadow-2xl mb-12"
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1966.0!2d5.3267772!3d60.4349495!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x463cfdd429037e91%3A0xe2a4e88929171a79!2s%C3%98vre-Eide%20G%C3%A5rd!5e0!3m2!1sen!2sno!4v1234567890!5m2!1sen!2sno"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Øvre-Eide Gård, Eidsvåg, Bergen"
            />
          </motion.div>
        </div>
      </section> */}

    </main>
  );
}
