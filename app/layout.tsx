import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Algo Arena — Train smarter. Rank faster.",
  description: "A strategic layer on top of LeetCode. Analyze weaknesses, build custom contests, and close blind spots with AI insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
