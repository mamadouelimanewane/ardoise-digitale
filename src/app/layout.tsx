
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#C2410C",
};

export const metadata: Metadata = {
  title: "L'Ardoise Digitale | Stock & Crédit Boutique",
  description: "Gestion de stock et de crédit client pour les boutiquiers de quartier au Sénégal.",
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={jakarta.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
