import LegacyHome from "@/components/legacy-home";

export const metadata = {
  title: "Silje & Sindre – bryllupssiden",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OldPage() {
  return <LegacyHome />;
}
