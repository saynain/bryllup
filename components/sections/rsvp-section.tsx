"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RSVPSection() {
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
    <section className="relative px-4 py-24 bg-gradient-to-b from-white via-[#F5F0EB] to-white">
      <div className="max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-semibold text-[#5D4E37] mb-4">
            Kan du komme?
          </h2>
          <p className="text-2xl text-[#5D4E37]">
            Har du ikke svart ennå, kan du gjøre det her.
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
  );
}
