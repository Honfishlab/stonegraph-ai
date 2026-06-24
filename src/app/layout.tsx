import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stonegraph AI — Your memories, permanent. Forever.",
  description:
    "Store your photos, videos, and family memories permanently on the Arweave permaweb. Guaranteed to survive forever on the blockchain.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 antialiased">
        {children}
      </body>
    </html>
  );
}
