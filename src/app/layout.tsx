import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Earn — Business dashboard",
  description:
    "Daily production, salaries, expenses, cash flow and monthly reports in one workspace.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('earn-theme')||'dark'}catch{}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
