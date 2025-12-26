"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { MapPin, Car, Church, PartyPopper } from "lucide-react";

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
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden"
    >
      {/* Background */}
      <motion.div className="absolute inset-0 z-0" style={{ y }}>
        <Image
          src="/photos/Bilde_4.jpg"
          alt="Bakgrunn"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-white/60" />
      </motion.div>

      <div className="relative z-10 max-w-4xl mx-auto w-full">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-5xl font-semibold text-[#5D4E37] text-center mb-12 drop-shadow-lg"
        >
          Lokasjon
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
            address="Garnesveien 22, 5261 Indre Arna"
            mapLink="https://maps.google.com/?q=Arna+kirke+Bergen"
          />
          <LocationCard
            icon={PartyPopper}
            title="Fest"
            name="Øvre-Eide Gård"
            address="Eidsvågveien 341, 5105 Eidsvåg i Åsane"
            mapLink="https://maps.google.com/?q=Øvre-Eide+Gård+Bergen"
          />
        </motion.div>

        {/* Parking info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-[#E8DED0]">
              <Car className="w-5 h-5 text-[#8B7355]" />
            </div>
            <h3 className="text-xl font-semibold text-[#5D4E37]">Parkering</h3>
          </div>
          <div className="space-y-3 text-[#5D4E37]">
            <p>
              <strong>Ved kirken:</strong> Det er gratis parkering ved Arna kirke.
              Følg skiltene til parkeringsplassen.
            </p>
            <p>
              <strong>Ved festlokalet:</strong> Øvre-Eide Gård har god parkeringskapasitet
              på eiendommen. Følg skiltene når du ankommer.
            </p>
            <p className="text-[#8B7355] text-sm">
              Tips: Vurder å kjøre sammen eller bruke taxi hvis du planlegger å nyte kvelden fullt ut!
            </p>
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
    </section>
  );
}
