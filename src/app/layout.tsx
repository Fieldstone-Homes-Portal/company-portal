import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cornerstone | Fieldstone Homes",
  description: "Cornerstone — Fieldstone Homes internal tools and resources",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
