"use client";

import { AlertCircle, Loader2, Search } from "lucide-react";
import type { SpecFlow } from "@/lib/specFlows";
import { SpecFlowCard } from "./SpecFlowCard";

type SpecFlowListProps = {
  data: SpecFlow[];
  loading: boolean;
  error?: string;
};

export function SpecFlowList({ data, loading, error }: SpecFlowListProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 py-16 text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
        <p className="mt-3 text-sm text-slate-400">
          Loading spec flows from snapshots…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-red-400/60 bg-red-900/10 py-16 text-center text-red-200">
        <AlertCircle className="h-6 w-6" />
        <p className="mt-3 font-semibold">Unable to load spec flows</p>
        <p className="text-sm text-red-200/80">{error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 py-16 text-center text-slate-300">
        <Search className="h-6 w-6 text-slate-500" />
        <p className="mt-3 font-semibold">No spec snapshots found</p>
        <p className="text-sm text-slate-400">
          Run `bin/spec capture` to generate JSON snapshots under
          ~/.codex/extensions/spec-tool/snapshots.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {data.map((spec) => (
        <SpecFlowCard key={spec.slug} spec={spec} />
      ))}
    </div>
  );
}
