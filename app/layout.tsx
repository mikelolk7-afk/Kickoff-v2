import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/shared/query-provider";

export const metadata: Metadata = {
  title: "Kickoff Manager",
  description: "Browser-based football management game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
