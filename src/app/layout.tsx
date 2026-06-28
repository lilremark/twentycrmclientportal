import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const interHeading = Inter({
  variable: "--font-heading",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Twenty Client Portal",
    template: "%s | Twenty Client Portal",
  },
  description: "A secure, self-hosted client portal for Twenty CRM.",
  icons: {
    icon: "/api/brand-icon",
    shortcut: "/api/brand-icon",
    apple: "/api/brand-icon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interHeading.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{const c=document.cookie.match(/(?:^|; )theme=(light|dark)/)?.[1];const t=localStorage.getItem('theme')||c||((matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light');const r=document.documentElement;r.dataset.theme=t;r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;localStorage.setItem('theme',t)}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
