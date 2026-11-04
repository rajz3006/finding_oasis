import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

// DB-backed pages: never prerender at build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "EB-1A Tracker" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
