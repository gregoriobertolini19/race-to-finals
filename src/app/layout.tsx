import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Race to Finals | Sporting Borgo Bagnolo",
  description:
    "Gestione torneo Race to Finals - singolare maschile Sporting Borgo Bagnolo",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-surface-alt text-ink">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-dark-elevated bg-dark py-4 text-center text-xs text-on-dark-muted">
          Race to Finals · Sporting Borgo Bagnolo
        </footer>
      </body>
    </html>
  );
}
