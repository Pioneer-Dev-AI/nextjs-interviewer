import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Larry King Interviewer App",
  description: "Engage in virtual interviews with the style of Larry King",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
