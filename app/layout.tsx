import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blob Kawaii",
  description: "Speaking blob + ElevenLabs voice agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="blob-app">{children}</body>
    </html>
  );
}
