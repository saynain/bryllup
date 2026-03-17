"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import {
  Car,
  CircleAlert,
  Church,
  MapPin,
  PartyPopper,
  X,
  ZoomIn,
} from "lucide-react";

interface ParkingImage {
  src: string;
  alt: string;
  title: string;
  caption: string;
  details?: string[];
  previewClassName?: string;
}

const parkingImages: ParkingImage[] = [
  {
    src: "/parking-route-map.png",
    alt: "Kart som viser kjøreruten til Øvre-Eide Gård",
    title: "Kjørerute",
    caption:
      "Følg Jordalsveien inn mot Øvre-Eide Gård når du har tatt av motorveien i Eidsvåg.",
    previewClassName: "object-[center_42%]",
  },
  {
    src: "/parking-turn.png",
    alt: "Innkjøring opp bakken ved Jordalsveien",
    title: "Sving opp bakken",
    caption:
      "Hold til høyre og ikke kjør til venstre, selv om det er skiltet den veien. Veien til venstre er for industri og privatbruk.",
    previewClassName: "object-center",
  },
  {
    src: "/parking-map.png",
    alt: "Parkeringskart for Øvre-Eide Gård",
    title: "Parkeringskart",
    caption: "Røde kryss viser hvor det er satt av parkering på området.",
    details: [
      "Første røde kryss: Her er det plass til omtrent 6 biler.",
      "Andre røde kryss: Plassen er reservert til gjester som skal la bilen stå over natten.",
      "Tredje røde kryss: Det er plass til 8-10 biler langs ridebanen.",
    ],
    previewClassName: "object-[center_18%]",
  },
];

interface LocationCardProps {
  icon: React.ElementType;
  title: string;
  name: string;
  address: string;
  mapLink?: string;
}

function LocationCard({ icon: Icon, title, name, address, mapLink }: LocationCardProps) {
  const content = (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-full bg-[#E8DED0]">
          <Icon className="w-5 h-5 text-[#8B7355]" />
        </div>
        <span className="text-sm font-medium text-[#8B7355] uppercase tracking-wide">
          {title}
        </span>
      </div>
      <h3 className="text-xl font-semibold text-[#5D4E37]">{name}</h3>
      <p className="text-[#8B7355] mt-1 flex items-start gap-2">
        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
        {address}
      </p>
    </div>
  );

  if (mapLink) {
    return (
      <a href={mapLink} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
}

export function LocationSection() {
  const sectionRef = useRef(null);
  const [selectedParkingImageSrc, setSelectedParkingImageSrc] = useState<string | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);
  const selectedParkingImage =
    parkingImages.find((image) => image.src === selectedParkingImageSrc) ?? null;

  useEffect(() => {
    if (!selectedParkingImage) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedParkingImageSrc(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedParkingImage]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden"
    >
      {/* Background */}
      <motion.div className="absolute inset-0 z-0" style={{ y }}>
        <Image
          src="/photos/Bilde_5.jpg"
          alt="Bakgrunn"
          fill
          className="object-cover [object-position:35%_center] md:[object-position:center]"
        />
        <div className="absolute inset-0 bg-white/45" />
      </motion.div>

      <div className="relative z-10 max-w-4xl mx-auto w-full">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-5xl font-semibold text-[#5D4E37] text-center mb-12 drop-shadow-lg"
        >
          Informasjon
        </motion.h2>

        {/* Location cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          <LocationCard
            icon={Church}
            title="Vielse"
            name="Arna kirke"
            address="Lakslia 19, 5261 Indre Arna"
            mapLink="https://maps.google.com/?q=Arna+kirke+Bergen"
          />
          <LocationCard
            icon={PartyPopper}
            title="Fest"
            name="Øvre-Eide Gård"
            address="Øvre-Eide 36, 5105 Eidsvåg i Åsane"
            mapLink="https://maps.google.com/?q=Øvre-Eide+Gård+Bergen"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white/90 backdrop-blur-sm rounded-[28px] p-6 shadow-lg mb-8 md:p-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-[#E8DED0]">
                <CircleAlert className="w-5 h-5 text-[#8B7355]" />
              </div>
              <h3 className="text-xl font-semibold text-[#5D4E37]">
                Viktig informasjon
              </h3>
            </div>

            <div className="space-y-3 text-[#5D4E37]">
              <p>
                Det er ikke tillatt å gå inn til dyrene i stallen, låven eller i
                inngjerdingene utendørs.
              </p>
              <p>
                Medbrakt alkohol er ikke tillatt på lokalet.
              </p>
            </div>

            <div className="my-6 h-px bg-[#E7DCCB]" />

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-[#E8DED0]">
                <Car className="w-5 h-5 text-[#8B7355]" />
              </div>
              <h3 className="text-xl font-semibold text-[#5D4E37]">
                Veibeskrivelse og parkering
              </h3>
            </div>

            <p className="text-[#5D4E37] leading-relaxed">
              Se kartene under for parkeringsinformasjon ved Øvre-Eide Gård.
            </p>

            <div className="mt-4 space-y-3 text-[#5D4E37]">
              <p>
                <strong>Ved kirken:</strong> Det er gratis parkering ved Arna
                kirke. Følg skiltene til parkeringsplassen.
              </p>
              <p>
                <strong>Øvre-Eide Gård:</strong> Se oppmerkede parkeringsplasser
                på parkeringskartet under. Det er plass til 14-16 biler totalt.
                Dersom begge plassene er fulle, åpnes ridebanen for parkering.
                Ring 90843412 for spørsmål rundt parkering.
              </p>
            </div>

            <div className="mt-6 rounded-[24px] border border-[#E7DCCB] bg-[#FCF8F2] p-4 md:p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-[#EFE3D4]">
                  <Car className="w-4 h-4 text-[#8B7355]" />
                </div>
                <h4 className="text-lg font-semibold text-[#5D4E37]">
                  Parkeringskart
                </h4>
              </div>
              <p className="text-[#8B7355] text-sm">
                Klikk på kartene under for å åpne dem i større format.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                {parkingImages.map((image) => (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => setSelectedParkingImageSrc(image.src)}
                    className="group relative overflow-hidden rounded-2xl border border-[#D8CBB8] bg-[#F6F0E8] text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7355] focus-visible:ring-offset-2"
                  >
                    <div className="relative aspect-[4/3] bg-[#EADFCF]">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        sizes="(min-width: 768px) 220px, 45vw"
                        className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${
                          image.previewClassName ?? "object-center"
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#2F261B]/80 via-[#2F261B]/15 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">
                          Parkering
                        </p>
                        <div className="mt-1 flex items-end justify-between gap-2">
                          <p className="text-sm font-semibold leading-tight">
                            {image.title}
                          </p>
                          <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 backdrop-blur-sm">
                            <ZoomIn className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="relative h-80 md:h-[400px] rounded-2xl overflow-hidden shadow-2xl"
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

      {selectedParkingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#241C13]/80 p-5 backdrop-blur-md md:p-8"
          onClick={() => setSelectedParkingImageSrc(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-y-auto rounded-[28px] border border-white/20 bg-white/95 p-3 shadow-2xl max-h-[calc(100vh-2.5rem)] md:max-h-[calc(100vh-4rem)] md:p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Lukk parkeringskart"
              onClick={() => setSelectedParkingImageSrc(null)}
              className="absolute right-5 top-5 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2F261B]/75 text-white transition-colors hover:bg-[#2F261B]"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-3 rounded-[22px] bg-[#F6F0E8] px-4 py-3 pr-16 text-[#5D4E37]">
              <p className="text-xs uppercase tracking-[0.28em] text-[#8B7355]">
                Parkering
              </p>
              <h4 className="mt-1 text-lg font-semibold">{selectedParkingImage.title}</h4>
              <p className="mt-1 text-sm text-[#6D5B45]">{selectedParkingImage.caption}</p>
              {selectedParkingImage.details && (
                <div className="mt-3 space-y-2 border-t border-[#E3D7C5] pt-3 text-sm text-[#5D4E37]">
                  {selectedParkingImage.details.map((detail) => (
                    <p key={detail}>{detail}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="relative h-[55vh] w-full overflow-hidden rounded-[22px] bg-[#F6F0E8] md:h-[62vh]">
              <Image
                src={selectedParkingImage.src}
                alt={selectedParkingImage.alt}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
