import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ConsolePage } from "@/components/console";

export default async function Page({ params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params;
  const [section, entry] = segments;
  const validId = /^[1-9]\d*$/.test(entry ?? "") && Number.isSafeInteger(Number(entry));
  const valid = segments.length === 1 ? ["dashboard", "agents", "policies", "requests"].includes(section) :
    segments.length === 2 && ((entry === "new" && ["workspaces", "policies", "requests"].includes(section)) ||
      (validId && ["workspaces", "requests"].includes(section)));
  if (!valid) notFound();
  return <Suspense fallback={<p>Loading workspace…</p>}><ConsolePage segments={segments} /></Suspense>;
}
