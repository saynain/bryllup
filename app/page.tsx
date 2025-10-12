"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Home() {
  const [formData, setFormData] = useState({
    name: "",
    attending: "",
    guests: "",
    dietaryRestrictions: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // Handle form submission here
    alert("Takk for svar!");
  };

  return (
    <main className="relative min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/photos/Bilde_1.jpg"
            alt="Silje & Sindre"
            fill
            className="object-contain"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white/40" />
        </div>

        {/* Content */}
        <div className="relative z-20 text-center px-4">
          <h1 className="font-serif text-6xl md:text-8xl font-bold text-white drop-shadow-2xl mb-4 tracking-wide">
            Vi gifter oss!
          </h1>
          <p className="font-serif text-3xl md:text-5xl text-white/95 drop-shadow-lg tracking-wider">
            Silje & Sindre
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/60 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/60 rounded-full" />
          </div>
        </div>
      </section>

      {/* Date and Location Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/photos/Bilde_3.jpg"
            alt="Silje & Sindre"
            fill
            className="object-contain"
          />
          <div className="absolute inset-0 bg-white/60" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto w-full">
          {/* Second Photo in Foreground */}
          <div className="relative h-96 md:h-[500px] rounded-2xl overflow-hidden mb-12 shadow-2xl">
            <Image
              src="/photos/Bilde_2.jpg"
              alt="Silje & Sindre"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          {/* Date and Location Info */}
          <div className="text-center space-y-8 py-12">
            <div className="space-y-4">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground">
                15. oktober 2025
              </h2>
              <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
            </div>

            <div className="space-y-2">
              <p className="text-xl md:text-2xl text-muted-foreground">
                Vielsen
              </p>
              <p className="text-lg md:text-xl text-foreground font-light">
                Klokken 14:00
              </p>
            </div>

            <div className="space-y-2 pt-4">
              <p className="text-xl md:text-2xl text-muted-foreground">
                Sted
              </p>
              <p className="text-lg md:text-xl text-foreground font-light">
                [Lokasjon kommer]
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RSVP Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/photos/Bilde_5.jpg"
            alt="Silje & Sindre"
            fill
            className="object-contain"
          />
          <div className="absolute inset-0 bg-white/60" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
              Kan du komme?
            </h2>
            <p className="text-lg text-muted-foreground">
              Vi håper du kan feire med oss!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Vennligst svar innen 1. september 2025
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-8"
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
                    Dessverre kan jeg ikke
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
                    Matallergier eller ønsker
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

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base font-semibold"
            >
              Send svar
            </Button>
          </form>
        </div>
      </section>

      {/* Footer with Final Photo */}
      <section className="relative bg-gradient-to-b from-white to-background py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative h-96 md:h-[500px] rounded-2xl overflow-hidden shadow-2xl mb-12">
            <Image
              src="/photos/Bilde_4.jpg"
              alt="Silje & Sindre"
              fill
              className="object-cover"
            />
          </div>

          <div className="text-center space-y-4">
            <p className="font-serif text-2xl text-foreground">
              Vi gleder oss til å feire med dere!
            </p>
            <p className="text-muted-foreground">Silje & Sindre</p>
          </div>
        </div>
      </section>

    </main>
  );
}
