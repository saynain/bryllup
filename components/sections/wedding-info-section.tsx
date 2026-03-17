"use client";

import { motion } from "framer-motion";
import { CalendarDays, Church, Car, Camera } from "lucide-react";

interface InfoCardProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  delay: number;
}

function InfoCard({ icon: Icon, title, children, delay }: InfoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay }}
      className="wedding-card rounded-2xl p-6 md:p-8"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-full bg-[#E8DED0]">
          <Icon className="w-5 h-5 text-[#8B7355]" />
        </div>
        <h3 className="text-xl font-semibold text-[#5D4E37]">{title}</h3>
      </div>
      <div className="space-y-2 text-[#5D4E37] leading-relaxed">{children}</div>
    </motion.div>
  );
}

export function WeddingInfoSection() {
  return (
    <div className="relative z-10 max-w-5xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl md:text-5xl font-semibold text-[#5D4E37] mb-4 drop-shadow-lg">
          Praktisk informasjon
        </h2>
        <p className="text-xl md:text-2xl text-[#5D4E37] drop-shadow-lg max-w-2xl mx-auto">
          Her finner du det viktigste samlet på ett sted før den store dagen.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        <InfoCard icon={CalendarDays} title="Når skjer det?" delay={0.1}>
          <p>Vi gifter oss lørdag 15. august 2026.</p>
          <p>Vielsen starter klokken 15:00.</p>
          <p className="text-[#8B7355]">Mer informasjon finner du ellers på siden.</p>
        </InfoCard>

        <InfoCard icon={Church} title="Hvor skal vi?" delay={0.2}>
          <p>Vielsen holdes i Arna kirke.</p>
          <p>Etterpå fortsetter feiringen på Øvre-Eide Gård.</p>
          <p className="text-[#8B7355]">
            Se lokasjonseksjonen for kart, adresser og detaljer.
          </p>
        </InfoCard>

        <InfoCard icon={Car} title="Transport og parkering" delay={0.3}>
          <p>Det er gratis parkering ved Arna kirke.</p>
          <p>Ved Øvre-Eide Gård er parkering merket med røde kryss på området.</p>
          <p className="text-[#8B7355]">
            Ved det midterste røde krysset kan biler som skal stå igjen til neste dag parkeres.
          </p>
        </InfoCard>

        <InfoCard icon={Camera} title="Bilder og svar" delay={0.4}>
          <p>Bildedelingen finner du i seksjonen under, og på egen side via QR-koden.</p>
          <p>RSVP-skjemaet ligger nå helt nederst på siden.</p>
          <p className="text-[#8B7355]">Frist for å svare er 01.02.2026.</p>
        </InfoCard>
      </div>
    </div>
  );
}
