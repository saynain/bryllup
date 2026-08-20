import type { Metadata } from "next";
import { PhotoAdmin } from "@/components/photos/photo-admin";

export const metadata: Metadata = {
  title: "Administrer albumet – Silje & Sindre",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PhotoAdminPage() {
  return <PhotoAdmin />;
}
