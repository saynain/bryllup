import type { Metadata } from "next";
import { Italianno, Cormorant } from "next/font/google";
import "./globals.css";

const italianno = Italianno({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-italianno",
  display: "swap",
});

const cormorant = Cormorant({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bryllup.rylands.no"),
  title: "Silje & Sindre - Vi gifter oss!",
  description: "Invitasjon til bryllupet vårt 15. august 2026",
  openGraph: {
    title: "Silje & Sindre - Vi gifter oss!",
    description: "Invitasjon til bryllupet vårt 15. august 2026",
    url: "https://bryllup.rylands.no",
    siteName: "Silje & Sindre",
    images: [
      {
        url: "/photos/Bilde_1.jpg",
        width: 2524,
        height: 3785,
        alt: "Silje & Sindre",
      },
    ],
    locale: "nb_NO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Silje & Sindre - Vi gifter oss!",
    description: "Invitasjon til bryllupet vårt 15. august 2026",
    images: ["/photos/Bilde_1.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body
        className={`${italianno.variable} ${cormorant.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
