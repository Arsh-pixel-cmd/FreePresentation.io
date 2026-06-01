import type { Metadata } from "next";
import { DM_Sans, DM_Mono, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/components/ui/LenisProvider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
});

export const metadata: Metadata = {
  title: "FreePresentation — Presentation Builder. Free, Forever.",
  description:
    "Create beautiful, polished presentations in seconds. No watermarks. No paywalls. Export to PPTX or PDF completely free.",
  keywords: ["free presentation maker", "automatic slides", "free PowerPoint", "presentation generator"],
  openGraph: {
    title: "FreePresentation",
    description: "Build beautiful presentations. 100% free. No watermarks.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmMono.variable} ${dmSerifDisplay.variable}`}>
        <LenisProvider>
          {children}
        </LenisProvider>
      </body>
    </html>
  );
}
