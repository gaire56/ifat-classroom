import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IF-AT Classroom",
  description: "Real-time IF-AT scratch-card classroom activity"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
