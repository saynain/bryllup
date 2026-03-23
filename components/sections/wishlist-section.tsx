"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Copy, Gift, HeartHandshake, Plane, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const wishlistUrl = process.env.NEXT_PUBLIC_WISHLIST_URL || "https://onsk.no";
const honeymoonAccount =
  process.env.NEXT_PUBLIC_HONEYMOON_ACCOUNT || "Kontonummer kommer";
const vippsNumber = process.env.NEXT_PUBLIC_VIPPS_NUMBER || "";

export function WishlistSection() {
  const [copiedField, setCopiedField] = useState<"account" | "vipps" | null>(
    null
  );

  const handleCopy = async (value: string, field: "account" | "vipps") => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2500);
    } catch (error) {
      console.error("Could not copy value", error);
    }
  };

  return (
    <section className="relative px-4 py-20 bg-gradient-to-b from-white via-[#FCF8F2] to-[#F5F0EB]">
      <div className="max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <div className="inline-flex p-3 rounded-full bg-[#E8DED0] mb-4">
            <Gift className="w-7 h-7 text-[#8B7355]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold text-[#5D4E37]">
            Ønskeliste
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
          className="space-y-5"
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-[28px] p-6 shadow-lg md:p-7">
            <p className="text-lg md:text-xl font-light leading-relaxed text-center text-[#5D4E37]">
              Vi er utrolig takknemlige for at dere vil dele denne dagen med
              oss, det betyr mer enn noe annet.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-[28px] p-6 shadow-lg md:p-7 text-[#5D4E37]">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[#E8DED0] p-3">
                  <Plane className="w-4 h-4 text-[#8B7355]" />
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold">
                  Bryllupsreise
                </h3>
              </div>

              <p className="mt-4 text-lg md:text-xl font-light leading-relaxed">
                For de som ønsker å gi en bryllupsgave, vil et bidrag til vår
                bryllupsreise bli tatt imot med stor takknemlighet.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-[#E7DCCB] bg-[#FCF8F2] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8B7355]">
                    Konto
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="text-base md:text-lg font-medium tracking-[0.08em]">
                      {honeymoonAccount}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(honeymoonAccount, "account")}
                      className="h-8 w-8 p-0"
                      aria-label={
                        copiedField === "account"
                          ? "Kontonummer kopiert"
                          : "Kopier kontonummer"
                      }
                      title={
                        copiedField === "account"
                          ? "Kontonummer kopiert"
                          : "Kopier kontonummer"
                      }
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {vippsNumber ? (
                  <div className="rounded-2xl border border-[#E7DCCB] bg-[#FCF8F2] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#8B7355]" />
                      <p className="text-xs uppercase tracking-[0.18em] text-[#8B7355]">
                        Vipps
                      </p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <p className="text-base md:text-lg font-medium tracking-[0.08em]">
                        {vippsNumber}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(vippsNumber, "vipps")}
                        className="h-8 w-8 p-0"
                        aria-label={
                          copiedField === "vipps"
                            ? "Vipps-nummer kopiert"
                            : "Kopier Vipps-nummer"
                        }
                        title={
                          copiedField === "vipps"
                            ? "Vipps-nummer kopiert"
                            : "Kopier Vipps-nummer"
                        }
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-[28px] p-6 shadow-lg md:p-7 text-[#5D4E37]">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[#E8DED0] p-3">
                  <HeartHandshake className="w-4 h-4 text-[#8B7355]" />
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold">
                  Fysisk gave
                </h3>
              </div>

              <p className="mt-4 text-lg md:text-xl font-light leading-relaxed">
                Dersom noen heller ønsker å gi en fysisk gave, har vi også laget
                en liten ønskeliste som dere finner her.
              </p>

              <p className="mt-4 text-base md:text-lg text-[#8B7355]">
                Husk å hake av dersom dere kjøper noe, slik at andre ikke kjøper
                det samme.
              </p>

              <div className="mt-5">
                <Button asChild variant="outline" size="lg">
                  <Link
                    href={wishlistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Åpne ønskelisten på ønsk.no
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
