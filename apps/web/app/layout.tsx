import type { Metadata } from "next";
import "./globals.css";
import "./theme-bharat.css";
import "./chat.css";

export const metadata: Metadata = { title: "QuantarisAI", description: "Industrial intelligence — illustrative demo" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
