import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earn — A good place to start",
  description: "Small beginnings. Big possibilities. Your Next.js foundation, connected to Neon Postgres and ready to grow.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
