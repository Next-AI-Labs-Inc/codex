"use client";

import "@/styles/animation.css";
import { SpecFlowList } from "@/components/spec-flows/SpecFlowList";
import { useSpecFlows } from "@/hooks/useSpecFlows";

export default function SpecFlowDashboard() {
  const { data, loading, error } = useSpecFlows();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="container mx-auto space-y-8 px-4 py-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">
            Swarm Workflow · Admin Console
          </p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            Review spec flows without leaving the repo
          </h1>
          <p className="max-w-3xl text-slate-400">
            This dashboard reads the JSON snapshots, clarification logs, and
            prompt logs under <code>~/.codex/extensions/spec-tool</code> so admins can inspect
            capture → clarify → close compliance in one place. Data refreshes
            every 5 seconds while this tab is focused, providing the live
            telemetry layer behind the About page&apos;s story.
          </p>
        </header>

        <SpecFlowList data={data} loading={loading} error={error} />
      </div>
    </div>
  );
}
