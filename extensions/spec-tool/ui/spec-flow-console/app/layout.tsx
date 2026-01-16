import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";
import { AppHeader } from "@/components/navigation/AppHeader";

export const metadata: Metadata = {
  title: "Swarm Workflow · Spec Dev Console",
  description:
    "Swarm Workflow is the living admin console for capture → clarify → close compliance, aligning humans and AI agents without leaving the repo.",
  openGraph: {
    title: "Swarm Workflow · Spec Dev Console",
    description:
      "Review JSON snapshots, clarifications, and prompts in one branded console built for human ↔ AI collaboration.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Swarm Workflow · Spec Dev Console",
    description:
      "Inspect capture → clarify → close flows and the intent alignment they drive.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <AppHeader />
        <main className="pb-16">{children}</main>
      </body>
    </html>
  );
}
