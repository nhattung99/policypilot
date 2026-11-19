import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/shell";

export const metadata: Metadata = {
  title: { default: "PolicyPilot", template: "%s | PolicyPilot" },
  description: "Every autonomous decision needs a rulebook.",
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
