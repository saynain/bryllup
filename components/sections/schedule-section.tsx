"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { Church, Camera, Wine, UtensilsCrossed, Cake, Music } from "lucide-react";

interface ScheduleEvent {
  time: string;
  title: string;
  description?: string;
  icon: React.ElementType;
}

// Placeholder schedule - replace with actual times
const schedule: ScheduleEvent[] = [
  {
    time: "14:00",
    title: "Vielse",
    description: "Arna kirke",
    icon: Church,
  },
  {
    time: "15:00",
    title: "Fotografering",
    description: "Ved kirken",
    icon: Camera,
  },
  {
    time: "16:30",
    title: "Ankomst festlokale",
    description: "Velkommen til Øvre-Eide Gård",
    icon: Wine,
  },
  {
    time: "18:00",
    title: "Middag",
    description: "Treretters meny",
    icon: UtensilsCrossed,
  },
  {
    time: "21:00",
    title: "Kake og taler",
    icon: Cake,
  },
  {
    time: "22:00",
    title: "Fest og dans",
    description: "Til den lyse morgen",
    icon: Music,
  },
];

export function ScheduleSection() {
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
          src="/photos/Bilde_2.jpg"
          alt="Bakgrunn"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-white/70" />
      </motion.div>

      <div className="relative z-10 max-w-2xl mx-auto w-full">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-5xl font-semibold text-[#5D4E37] text-center mb-12 drop-shadow-lg"
        >
          Dagens program
        </motion.h2>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-[#B8A491] -translate-x-1/2" />

          {/* Events */}
          <div className="space-y-8">
            {schedule.map((event, index) => {
              const Icon = event.icon;
              const isLeft = index % 2 === 0;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`relative flex items-center gap-4 ${
                    isLeft ? "md:flex-row" : "md:flex-row-reverse"
                  } flex-row`}
                >
                  {/* Content */}
                  <div
                    className={`flex-1 bg-white/90 backdrop-blur-sm rounded-xl p-4 md:p-6 shadow-lg ml-12 md:ml-0 ${
                      isLeft ? "md:text-right md:mr-8" : "md:text-left md:ml-8"
                    }`}
                  >
                    <p className="text-2xl font-bold text-[#8B7355]">
                      {event.time}
                    </p>
                    <h3 className="text-xl font-semibold text-[#5D4E37] mt-1">
                      {event.title}
                    </h3>
                    {event.description && (
                      <p className="text-[#8B7355] mt-1">{event.description}</p>
                    )}
                  </div>

                  {/* Icon */}
                  <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-[#B8A491]">
                    <Icon className="w-5 h-5 text-[#8B7355]" />
                  </div>

                  {/* Spacer for alternating layout on desktop */}
                  <div className="hidden md:block flex-1" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
